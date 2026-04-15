"""
extractor.py — Extractor histórico de partidos de CLT en la Liga Universitaria

Uso:
    python extractor.py --full          # extrae todas las temporadas (90-112)
    python extractor.py --incremental   # solo la última temporada con datos

Genera: clt.db (SQLite) en el directorio donde se corre el script.
"""

import argparse
import logging
import sqlite3
import time
import random
from pathlib import Path

import requests

# ──────────────────────────────────────────────────────────────────────────────
# Configuración
# ──────────────────────────────────────────────────────────────────────────────

BASE_URL        = "https://ligauniversitaria.org.uy/detallefechas/api.php"
BASE_URL_POS    = "https://ligauniversitaria.org.uy/posiciones/api.php"
BASE_URL_GOL    = "https://ligauniversitaria.org.uy/goleadores/api.php"
BASE_URL_VALLA  = "https://ligauniversitaria.org.uy/valla_menos_vencida/api.php"
SPORT     = "FÚTBOL"
SPORT_API = "F"   # las APIs nuevas usan "F" en vez de "FÚTBOL"
TEAM      = "CARRASCO LAWN TENNIS"
DB_PATH   = Path(__file__).parent / "clt.db"

# Rango de temporadas conocido (90 = más antigua, busca la más reciente al arrancar)
SEASON_MIN = 90
SEASON_MAX_PROBE = 120  # límite de búsqueda automática de la última temporada

RPS         = 4          # requests por segundo máximo
TIMEOUT     = 20         # segundos por request
RETRIES     = 4          # intentos antes de marcar como error
SAMPLE_SIZE = 3          # fechas a muestrear por serie para detectar si CLT jugó ahí

# ──────────────────────────────────────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
    level=logging.INFO,
)
log = logging.getLogger("clt")

# ──────────────────────────────────────────────────────────────────────────────
# HTTP — rate limiting + retries
# ──────────────────────────────────────────────────────────────────────────────

_session = requests.Session()
_last_ts  = 0.0

def _throttle():
    global _last_ts
    gap = (1.0 / RPS) - (time.monotonic() - _last_ts)
    if gap > 0:
        time.sleep(gap)
    _last_ts = time.monotonic()

def api_get(params: dict):
    """
    Hace GET a la API con throttling y retries.
    Devuelve la respuesta JSON (lista o dict) o None si falló todo.
    """
    for attempt in range(RETRIES):
        try:
            _throttle()
            r = _session.get(BASE_URL, params=params, timeout=TIMEOUT)
            r.raise_for_status()
            return r.json()
        except requests.RequestException as exc:
            if attempt == RETRIES - 1:
                log.warning("GET falló definitivamente: %s | %s", params, exc)
                return None
            backoff = 2 ** attempt
            log.debug("Retry %d en %ds | %s", attempt + 1, backoff, exc)
            time.sleep(backoff)
        except Exception as exc:
            # JSON decode error u otro
            log.warning("Respuesta inválida: %s | %s", params, exc)
            return None

def safe_list(data) -> list | None:
    """
    Normaliza la respuesta de la API a lista o None.
    - Lista vacía []  → None (sin datos, no es error)
    - Dict {"error"} → None
    - Lista con items → la lista
    - None            → None
    """
    if data is None:
        return None
    if isinstance(data, dict):
        # {"error": "..."} — la API devuelve esto cuando no hay registros
        return None
    if isinstance(data, list):
        return data if data else None
    return None

# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────

def get_torneos(season: int) -> list:
    data = api_get({"action": "cargarTorneos", "temporada": str(season), "deporte": SPORT})
    return safe_list(data) or []

def get_series(season: int, torneo: str) -> list:
    data = api_get({"action": "cargarSeries", "temporada": str(season), "deporte": SPORT, "torneo": torneo})
    return safe_list(data) or []

def get_fechas(season: int, torneo: str, serie: str) -> list:
    data = api_get({"action": "cargarFechas", "temporada": str(season), "deporte": SPORT,
                    "torneo": torneo, "serie": serie})
    return safe_list(data) or []

def get_partidos(season: int, torneo: str, serie: str, fecha) -> list:
    data = api_get({"action": "cargarPartidos", "temporada": str(season), "deporte": SPORT,
                    "torneo": torneo, "serie": serie, "fecha": str(fecha)})
    return safe_list(data) or []

def get_titulares(side: str, match_id: str) -> list:
    data = api_get({"action": f"Titulares {side}", "id": match_id})
    return safe_list(data) or []

def get_cambios(side: str, match_id: str) -> list:
    data = api_get({"action": f"Cambios{side}", "id": match_id})
    return safe_list(data) or []

def get_goles(side: str, match_id: str) -> list:
    data = api_get({"action": f"Goles{side}", "id": match_id})
    return safe_list(data) or []

def get_amonestados(side: str, match_id: str) -> list:
    data = api_get({"action": f"Amonestados {side}", "id": match_id})
    return safe_list(data) or []

def get_expulsados(side: str, match_id: str) -> list:
    data = api_get({"action": f"Expulsados {side}", "id": match_id})
    return safe_list(data) or []

def api_get_url(url: str, params: dict):
    """GET a una URL arbitraria con throttling y retries."""
    for attempt in range(RETRIES):
        try:
            _throttle()
            r = _session.get(url, params=params, timeout=TIMEOUT)
            r.raise_for_status()
            return r.json()
        except requests.RequestException as exc:
            if attempt == RETRIES - 1:
                log.warning("GET falló definitivamente: %s | %s", params, exc)
                return None
            backoff = 2 ** attempt
            time.sleep(backoff)
        except Exception as exc:
            log.warning("Respuesta inválida: %s | %s", params, exc)
            return None

# ──────────────────────────────────────────────────────────────────────────────
# SQLite — setup
# ──────────────────────────────────────────────────────────────────────────────

def db_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def db_init(conn: sqlite3.Connection):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS matches (
            id              TEXT PRIMARY KEY,
            season          INTEGER NOT NULL,
            tournament      TEXT NOT NULL,
            series          TEXT NOT NULL,
            round           TEXT NOT NULL,
            datetime        TEXT,
            venue           TEXT,
            home_team       TEXT,
            away_team       TEXT,
            score_home      INTEGER,
            score_away      INTEGER,
            clt_side        TEXT CHECK(clt_side IN ('home','away')),
            clt_goals_for   INTEGER,
            clt_goals_against INTEGER,
            result          TEXT CHECK(result IN ('W','D','L'))
        );

        CREATE TABLE IF NOT EXISTS players (
            carne   TEXT PRIMARY KEY,
            name    TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS match_starters (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id      TEXT NOT NULL REFERENCES matches(id),
            player_carne  TEXT,
            player_name   TEXT,
            shirt_number  TEXT,
            is_captain    INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS match_subs (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id          TEXT NOT NULL REFERENCES matches(id),
            player_out_carne  TEXT,
            player_out_name   TEXT,
            player_in_carne   TEXT,
            player_in_name    TEXT,
            shirt_number      TEXT,
            minute            TEXT
        );

        CREATE TABLE IF NOT EXISTS match_goals (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id      TEXT NOT NULL REFERENCES matches(id),
            player_carne  TEXT,
            player_name   TEXT,
            minute        TEXT,
            is_own_goal   INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS match_yellows (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id      TEXT NOT NULL REFERENCES matches(id),
            player_name   TEXT
        );

        CREATE TABLE IF NOT EXISTS match_reds (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id      TEXT NOT NULL REFERENCES matches(id),
            player_name   TEXT,
            observations  TEXT
        );

        -- Tabla de control: qué matches ya fueron procesados con detalle
        CREATE TABLE IF NOT EXISTS processed_matches (
            match_id TEXT PRIMARY KEY,
            processed_at TEXT DEFAULT (datetime('now'))
        );

        -- Tabla de posiciones de la liga por temporada/torneo/serie
        CREATE TABLE IF NOT EXISTS league_standings (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            season      INTEGER NOT NULL,
            tournament  TEXT NOT NULL,
            series      TEXT NOT NULL,
            rank        INTEGER NOT NULL,
            institution TEXT NOT NULL,
            pj          INTEGER,
            pg          INTEGER,
            pe          INTEGER,
            pp          INTEGER,
            gf          INTEGER,
            gc          INTEGER,
            points      INTEGER,
            UNIQUE(season, tournament, series, institution)
        );

        -- Goleadores de la liga por temporada/torneo/serie
        CREATE TABLE IF NOT EXISTS league_scorers (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            season      INTEGER NOT NULL,
            tournament  TEXT NOT NULL,
            series      TEXT NOT NULL,
            player_name TEXT NOT NULL,
            institution TEXT NOT NULL,
            goals       INTEGER,
            UNIQUE(season, tournament, series, player_name, institution)
        );

        -- Valla menos vencida por temporada/torneo/serie
        CREATE TABLE IF NOT EXISTS league_goalkeepers (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            season        INTEGER NOT NULL,
            tournament    TEXT NOT NULL,
            series        TEXT NOT NULL,
            player_name   TEXT NOT NULL,
            institution   TEXT NOT NULL,
            goals_received INTEGER,
            matches       INTEGER,
            avg_per_match REAL,
            UNIQUE(season, tournament, series, player_name, institution)
        );
    """)
    conn.commit()

# ──────────────────────────────────────────────────────────────────────────────
# SQLite — escritura
# ──────────────────────────────────────────────────────────────────────────────

def upsert_match(conn, match_id, season, tournament, series, round_no,
                  dt, venue, home, away, score_home, score_away, clt_side):
    if clt_side == "home":
        gf = score_home
        ga = score_away
    else:
        gf = score_away
        ga = score_home

    if gf is not None and ga is not None:
        result = "W" if gf > ga else ("D" if gf == ga else "L")
    else:
        result = None

    conn.execute("""
        INSERT INTO matches
            (id, season, tournament, series, round, datetime, venue,
             home_team, away_team, score_home, score_away,
             clt_side, clt_goals_for, clt_goals_against, result)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(id) DO UPDATE SET
            score_home=excluded.score_home,
            score_away=excluded.score_away,
            clt_goals_for=excluded.clt_goals_for,
            clt_goals_against=excluded.clt_goals_against,
            result=excluded.result
    """, (match_id, season, tournament, series, str(round_no), dt, venue,
          home, away, score_home, score_away, clt_side, gf, ga, result))

def upsert_player(conn, carne: str, name: str):
    if not carne:
        return
    conn.execute("""
        INSERT INTO players (carne, name) VALUES (?,?)
        ON CONFLICT(carne) DO UPDATE SET name=excluded.name
    """, (carne.strip(), name.strip() if name else ""))

def insert_starters(conn, match_id: str, starters: list):
    conn.execute("DELETE FROM match_starters WHERE match_id=?", (match_id,))
    for p in starters:
        carne = str(p.get("carne") or "").strip()
        name  = str(p.get("Nombre") or "").strip()
        shirt = str(p.get("camiseta") or "").strip()
        cap   = 1 if str(p.get("Capitan") or "").strip() else 0
        conn.execute(
            "INSERT INTO match_starters (match_id,player_carne,player_name,shirt_number,is_captain) VALUES (?,?,?,?,?)",
            (match_id, carne, name, shirt, cap)
        )
        upsert_player(conn, carne, name)

def insert_subs(conn, match_id: str, subs: list):
    conn.execute("DELETE FROM match_subs WHERE match_id=?", (match_id,))
    for s in subs:
        out_carne = str(s.get("CarneSale") or "").strip()
        out_name  = str(s.get("Jug_Sale")  or "").strip()
        in_carne  = str(s.get("CarneEntra") or "").strip()
        in_name   = str(s.get("Jug_Entra")  or "").strip()
        shirt     = str(s.get("camiseta")   or "").strip()
        minute    = str(s.get("minutos")    or "").strip()
        conn.execute(
            "INSERT INTO match_subs (match_id,player_out_carne,player_out_name,player_in_carne,player_in_name,shirt_number,minute) VALUES (?,?,?,?,?,?,?)",
            (match_id, out_carne, out_name, in_carne, in_name, shirt, minute)
        )
        upsert_player(conn, out_carne, out_name)
        upsert_player(conn, in_carne, in_name)

def insert_goals(conn, match_id: str, goals: list, clt_side_api: str):
    """
    EnContra en la API significa "gol en contra del locatario".
    - Si CLT es Locatario: EnContra=1 → autogol de CLT (own_goal=True)
    - Si CLT es Visitante: EnContra=1 → gol de CLT a favor (own_goal=False)
                           EnContra=0 → autogol de CLT (own_goal=True)
    """
    conn.execute("DELETE FROM match_goals WHERE match_id=?", (match_id,))
    clt_is_visitor = (clt_side_api == "Visitante")
    for g in goals:
        carne      = str(g.get("carne")   or "").strip()
        name       = str(g.get("Nombre")  or "").strip()
        minute     = str(g.get("minutos") or "").strip()
        en_contra  = str(g.get("EnContra") or "0") == "1"
        # XOR: visitante invierte el sentido de EnContra
        own        = 1 if (en_contra != clt_is_visitor) else 0
        conn.execute(
            "INSERT INTO match_goals (match_id,player_carne,player_name,minute,is_own_goal) VALUES (?,?,?,?,?)",
            (match_id, carne, name, minute, own)
        )
        upsert_player(conn, carne, name)

def insert_yellows(conn, match_id: str, yellows: list):
    conn.execute("DELETE FROM match_yellows WHERE match_id=?", (match_id,))
    for y in yellows:
        name = str(y.get("Nombre") or "").strip()
        conn.execute(
            "INSERT INTO match_yellows (match_id,player_name) VALUES (?,?)",
            (match_id, name)
        )

def insert_reds(conn, match_id: str, reds: list):
    conn.execute("DELETE FROM match_reds WHERE match_id=?", (match_id,))
    for r in reds:
        name = str(r.get("Nombre") or "").strip()
        obs  = str(r.get("observaciones") or "").strip()
        conn.execute(
            "INSERT INTO match_reds (match_id,player_name,observations) VALUES (?,?,?)",
            (match_id, name, obs)
        )

def mark_processed(conn, match_id: str):
    conn.execute(
        "INSERT OR REPLACE INTO processed_matches (match_id) VALUES (?)", (match_id,)
    )

def is_processed(conn, match_id: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM processed_matches WHERE match_id=?", (match_id,)
    ).fetchone()
    return row is not None

# ──────────────────────────────────────────────────────────────────────────────
# Lógica de extracción
# ──────────────────────────────────────────────────────────────────────────────

def normalize_score(val):
    try:
        return int(val)
    except (TypeError, ValueError):
        return None

def detect_latest_season() -> int:
    """Busca la última temporada que tiene torneos, empezando desde SEASON_MAX_PROBE."""
    log.info("Detectando temporada más reciente...")
    for s in range(SEASON_MAX_PROBE, SEASON_MIN - 1, -1):
        torneos = get_torneos(s)
        if torneos:
            log.info("Temporada más reciente con datos: %d", s)
            return s
    return SEASON_MIN

def process_match_detail(conn, match_id: str, clt_side_api: str):
    """
    Descarga y guarda titulares, cambios, goles, amarillas y rojas del lado CLT.
    clt_side_api es "Locatario" o "Visitante".
    """
    log.debug("  Detalle match %s (%s)", match_id, clt_side_api)

    titulares  = get_titulares(clt_side_api, match_id)
    cambios    = get_cambios(clt_side_api, match_id)
    goles      = get_goles(clt_side_api, match_id)
    amarillas  = get_amonestados(clt_side_api, match_id)
    rojas      = get_expulsados(clt_side_api, match_id)

    insert_starters(conn, match_id, titulares)
    insert_subs(conn, match_id, cambios)
    insert_goals(conn, match_id, goles, clt_side_api)
    insert_yellows(conn, match_id, amarillas)
    insert_reds(conn, match_id, rojas)
    mark_processed(conn, match_id)
    conn.commit()

def process_round(conn, season: int, torneo: str, serie: str, round_no) -> list:
    """
    Descarga los partidos de una fecha y procesa los de CLT.
    Devuelve lista de match_ids de CLT encontrados.
    """
    data = api_get({"action": "cargarPartidos", "temporada": str(season), "deporte": SPORT,
                    "torneo": torneo, "serie": serie, "fecha": str(round_no)})
    partidos = safe_list(data) or []
    if data is None:
        log.warning("  ⚠ API falló para fecha %s de %s / %s (S%d) — posibles datos perdidos",
                    round_no, torneo, serie, season)
    clt_matches = []

    for p in partidos:
        home = (p.get("Locatario") or "").strip().upper()
        away = (p.get("Visitante") or "").strip().upper()
        if TEAM not in home and TEAM not in away:
            continue

        match_id    = str(p.get("ID") or "").strip()
        if not match_id:
            continue

        clt_side_api = "Locatario" if TEAM in home else "Visitante"
        clt_side_db  = "home"      if TEAM in home else "away"

        score_home = normalize_score(p.get("GL"))
        score_away = normalize_score(p.get("GV"))

        upsert_match(conn, match_id, season, torneo, serie, round_no,
                      p.get("Fecha_Hora"), p.get("Cancha"),
                      p.get("Locatario"), p.get("Visitante"),
                      score_home, score_away, clt_side_db)
        conn.commit()

        clt_matches.append((match_id, clt_side_api))

    return clt_matches

def clt_in_sample(conn, season, torneo, serie, sample_rounds) -> bool:
    """Muestrea algunas fechas para ver si CLT aparece en esa serie."""
    for rn in sample_rounds:
        clt = process_round(conn, season, torneo, serie, rn)
        if clt:
            return True
    return False

def fetch_league_season_data(conn, season: int):
    """
    Descubre y guarda posiciones, goleadores y valla de la liga para todas las series
    donde CLT aparece en esa temporada.

    Las APIs de posiciones/goleadores/valla usan un esquema de parámetros diferente
    al de detallefechas: torneo=<id_numerico> y serie=<codigo_corto> (ej: AT, APD, BT...).
    Se prueban combinaciones para encontrar las que contienen a CLT.
    """
    # Combinaciones conocidas y validadas (torneo_str, categoria_str, serie_code)
    # Validadas en vivo el 14/04/2026 para temporada 113
    KNOWN_CATEGORY_COMBOS = [
        ("2",  "1",  "A"),      # Mayores Divisional A
        ("2",  "1",  "AT"),     # Mayores Apertura (temporadas anteriores)
        ("2",  "1",  "APD"),    # Mayores Clausura (temporadas anteriores)
        ("2B", "2",  "RS1"),    # Reserva
        ("20", "20", "20A"),    # Sub-20
        ("32", "32", "PSB"),    # Presenior / Más 32
        ("40", "40", "M40S2"),  # Más 40
    ]

    # Brute-force para descubrir otras series de mayores (torneo_id numérico 1-11, categoria=1)
    SERIE_CODES = [
        "AT", "APD", "BT", "BPD", "CT", "CPD", "DT", "DPD",
        "ET", "EPD", "FT", "FPD", "GT", "GPD", "HT", "HPD",
        "A", "B", "C", "D", "E", "F", "G",
    ]
    TORNEO_IDS = range(1, 12)

    def _try_combo(torneo_str: str, categoria_str: str, serie_code: str) -> bool:
        """Prueba una combinación y guarda los datos si CLT aparece. Retorna True si encontró."""
        common = {
            "temporada": str(season),
            "deporte":   SPORT_API,
            "torneo":    torneo_str,
            "categoria": categoria_str,
            "serie":     serie_code,
        }

        pos_data = safe_list(api_get_url(BASE_URL_POS, {**common, "action": "cargarPosiciones"}))
        if not pos_data:
            return False

        clt_in = any(TEAM in (row.get("Institucion") or "").upper() for row in pos_data)
        if not clt_in:
            return False

        label = f"T{torneo_str}/{serie_code}"
        log.info("  [S%d] Liga %s — CLT encontrado (%d equipos)", season, label, len(pos_data))

        # Guardar posiciones
        conn.execute(
            "DELETE FROM league_standings WHERE season=? AND tournament=? AND series=?",
            (season, label, label)
        )
        for rank, row in enumerate(pos_data, start=1):
            conn.execute("""
                INSERT OR REPLACE INTO league_standings
                    (season, tournament, series, rank, institution, pj, pg, pe, pp, gf, gc, points)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                season, label, label, rank,
                (row.get("Institucion") or "").strip(),
                _int(row.get("PJ")), _int(row.get("PG")), _int(row.get("PE")),
                _int(row.get("PP")), _int(row.get("GF")), _int(row.get("GC")),
                _int(row.get("Puntos")),
            ))

        # Goleadores
        gol_data = safe_list(api_get_url(BASE_URL_GOL, {**common, "action": "cargarPartidos"}))
        if gol_data:
            conn.execute(
                "DELETE FROM league_scorers WHERE season=? AND tournament=? AND series=?",
                (season, label, label)
            )
            for row in gol_data:
                conn.execute("""
                    INSERT OR REPLACE INTO league_scorers
                        (season, tournament, series, player_name, institution, goals)
                    VALUES (?,?,?,?,?,?)
                """, (
                    season, label, label,
                    (row.get("Jugador") or "").strip(),
                    (row.get("Institucion") or "").strip(),
                    _int(row.get("goles")),
                ))
            log.info("    ↳ goleadores: %d", len(gol_data))

        # Valla
        valla_data = safe_list(api_get_url(BASE_URL_VALLA, {**common, "action": "cargarPartidos"}))
        if valla_data:
            conn.execute(
                "DELETE FROM league_goalkeepers WHERE season=? AND tournament=? AND series=?",
                (season, label, label)
            )
            for row in valla_data:
                gr  = _int(row.get("GR"))
                pts = _int(row.get("partidos"))
                try:
                    avg = float(row.get("ppp") or 0)
                except (TypeError, ValueError):
                    avg = (gr / pts) if pts else 0.0
                conn.execute("""
                    INSERT OR REPLACE INTO league_goalkeepers
                        (season, tournament, series, player_name, institution, goals_received, matches, avg_per_match)
                    VALUES (?,?,?,?,?,?,?,?)
                """, (
                    season, label, label,
                    (row.get("Jugador") or "").strip(),
                    (row.get("Institución") or row.get("Institucion") or "").strip(),
                    gr, pts, round(avg, 4),
                ))
            log.info("    ↳ valla: %d", len(valla_data))

        conn.commit()
        return True

    found_any = False

    # 1) Probar primero los combos conocidos (categorías no-mayores que el brute-force no cubre)
    for torneo_str, categoria_str, serie_code in KNOWN_CATEGORY_COMBOS:
        if _try_combo(torneo_str, categoria_str, serie_code):
            found_any = True

    # 2) Brute-force para mayores (torneo_id 1-11, categoria=1) — descubre series desconocidas
    for torneo_id in TORNEO_IDS:
        for serie_code in SERIE_CODES:
            if _try_combo(str(torneo_id), "1", serie_code):
                found_any = True

    if not found_any:
        log.debug("  [S%d] No se encontraron tablas de liga con CLT", season)

def _int(val):
    try:
        return int(val)
    except (TypeError, ValueError):
        return None

def process_series(conn, season: int, torneo: str, serie: str,
                   skip_sampling: bool = False):
    """
    Procesa una serie completa:
    - En modo full: muestrea primero para descartar series sin CLT
    - Si CLT aparece (o skip_sampling=True): descarga todas las fechas + detalles
    """
    fechas = get_fechas(season, torneo, serie)
    if not fechas:
        return

    all_rounds = []
    for f in fechas:
        rn = f.get("fecha") if isinstance(f, dict) else f
        if rn is not None:
            all_rounds.append(rn)

    if not all_rounds:
        return

    if not skip_sampling and len(all_rounds) > SAMPLE_SIZE:
        sample = random.sample(all_rounds, SAMPLE_SIZE)
        found = clt_in_sample(conn, season, torneo, serie, sample)
        if not found:
            log.debug("    CLT no encontrado en muestra → salto serie %s / %s", torneo, serie)
            return
        # Ya procesamos las fechas del sample; procesar el resto
        remaining = [r for r in all_rounds if r not in sample]
        log.info("  [S%d] %s / %s — CLT confirmado, %d fechas restantes",
                 season, torneo, serie, len(remaining))
        for rn in remaining:
            process_round(conn, season, torneo, serie, rn)
    else:
        # Modo incremental o serie muy corta: procesar todas
        log.info("  [S%d] %s / %s — %d fechas", season, torneo, serie, len(all_rounds))
        for rn in all_rounds:
            process_round(conn, season, torneo, serie, rn)

    # Descargar detalles de todos los partidos de CLT de esta serie que no estén procesados
    matches_in_series = conn.execute(
        "SELECT id, clt_side FROM matches WHERE season=? AND tournament=? AND series=?",
        (season, torneo, serie)
    ).fetchall()

    for row in matches_in_series:
        mid = row["id"]
        if is_processed(conn, mid):
            continue
        clt_side_api = "Locatario" if row["clt_side"] == "home" else "Visitante"
        process_match_detail(conn, mid, clt_side_api)
        log.info("    ✓ match %s procesado", mid)

    # (los datos de liga se descargan una vez al finalizar la temporada)

def process_season(conn, season: int, skip_sampling: bool = False):
    torneos = get_torneos(season)
    if not torneos:
        log.info("[S%d] Sin torneos", season)
        return

    log.info("[S%d] %d torneos", season, len(torneos))
    for t in torneos:
        torneo = (t.get("nombre") or "").strip()
        if not torneo:
            continue
        series = get_series(season, torneo)
        for s in series:
            serie = (s.get("nombre") or "").strip()
            if not serie:
                continue
            process_series(conn, season, torneo, serie, skip_sampling=skip_sampling)

    # Descargar datos de liga (posiciones, goleadores, valla) para esta temporada
    # Solo si CLT tiene partidos en la temporada
    has_matches = conn.execute(
        "SELECT 1 FROM matches WHERE season=? LIMIT 1", (season,)
    ).fetchone()
    if has_matches:
        fetch_league_season_data(conn, season)

# ──────────────────────────────────────────────────────────────────────────────
# Entrypoint
# ──────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Extractor CLT — Liga Universitaria")
    group  = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--full",        action="store_true",
                       help="Extrae todas las temporadas (extracción histórica inicial)")
    group.add_argument("--incremental", action="store_true",
                       help="Solo extrae la última temporada con datos (para cron semanal)")
    group.add_argument("--season",      type=int, metavar="N",
                       help="Extrae una temporada específica (ej: --season 111)")
    group.add_argument("--patch",       type=int, metavar="N",
                       help="Re-procesa una temporada sin sampling para recuperar partidos faltantes")
    args = parser.parse_args()

    conn = db_connect()
    db_init(conn)

    latest = detect_latest_season()

    if args.incremental:
        log.info("=== Modo incremental — temporada %d ===", latest)
        process_season(conn, latest, skip_sampling=True)
    elif args.patch:
        log.info("=== Modo patch (sin sampling) — temporada %d ===", args.patch)
        process_season(conn, args.patch, skip_sampling=True)
    elif args.season:
        log.info("=== Temporada específica: %d ===", args.season)
        process_season(conn, args.season, skip_sampling=False)
    else:
        log.info("=== Modo full — temporadas %d–%d ===", SEASON_MIN, latest)
        for season in range(SEASON_MIN, latest + 1):
            log.info("=== Temporada %d ===", season)
            process_season(conn, season, skip_sampling=False)

    conn.close()
    log.info("Listo. Base de datos: %s", DB_PATH)

if __name__ == "__main__":
    main()
