"""
json_generator.py — Genera los JSONs estáticos para el frontend a partir de clt.db

Uso:
    python json_generator.py

Genera los archivos en ../frontend/public/data/
"""

import json
import re
import sqlite3
import time
import unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

DB_PATH  = Path(__file__).parent / "clt.db"
OUT_DIR  = Path(__file__).parent.parent / "frontend" / "public" / "data"

# ──────────────────────────────────────────────────────────────────────────────

def db_connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def write_json(path: Path, data, label: str = ""):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    size_kb = path.stat().st_size / 1024
    print(f"  ✓ {label or path.name} ({size_kb:.1f} KB)")

# ──────────────────────────────────────────────────────────────────────────────
# Deduplicación de partidos
# ──────────────────────────────────────────────────────────────────────────────

def find_duplicate_match_ids(conn) -> set[str]:
    """
    Detecta partidos duplicados (mismo encuentro con ID distinto) y devuelve
    los IDs "fantasma" que hay que excluir de los JSONs públicos.

    La API a veces re-emite un ID nuevo para el mismo partido (mismo equipo
    local, visitante, fecha-hora, marcador, jornada). Cuando eso pasa quedan
    dos filas en `matches` pero solo una tiene alineaciones cargadas. El
    objetivo es quedarse con la fila que tiene datos.

    Criterio: mismo (season, tournament, series, round, datetime, home_team,
    away_team, score_home, score_away). Si hay varias filas, se conserva la
    que tenga la mayor cantidad de registros de detalle (titulares+goles+
    cambios+amarillas+rojas). Empates → la de ID más alto (la más reciente).
    """
    rows = conn.execute("""
        SELECT
            m.id, m.season, m.tournament, m.series, m.round, m.datetime,
            m.home_team, m.away_team, m.score_home, m.score_away,
            COALESCE((SELECT COUNT(*) FROM match_starters s WHERE s.match_id=m.id), 0) +
            COALESCE((SELECT COUNT(*) FROM match_goals    g WHERE g.match_id=m.id), 0) +
            COALESCE((SELECT COUNT(*) FROM match_subs     u WHERE u.match_id=m.id), 0) +
            COALESCE((SELECT COUNT(*) FROM match_yellows  y WHERE y.match_id=m.id), 0) +
            COALESCE((SELECT COUNT(*) FROM match_reds     r WHERE r.match_id=m.id), 0)
            AS detail_count
        FROM matches m
    """).fetchall()

    groups: dict[tuple, list] = {}
    for r in rows:
        key = (
            r["season"], r["tournament"], r["series"], r["round"],
            r["datetime"], r["home_team"], r["away_team"],
            r["score_home"], r["score_away"],
        )
        groups.setdefault(key, []).append((r["id"], r["detail_count"]))

    to_exclude: set[str] = set()
    for key, ids in groups.items():
        if len(ids) < 2:
            continue
        # Mejor candidato: más detail; desempate por ID numérico descendente.
        def _id_num(mid: str) -> int:
            try:
                return int(mid)
            except (TypeError, ValueError):
                return 0
        ids_sorted = sorted(ids, key=lambda x: (-x[1], -_id_num(x[0])))
        winner = ids_sorted[0][0]
        for mid, _cnt in ids_sorted[1:]:
            to_exclude.add(mid)
            print(f"  ⚠ Duplicado descartado: id={mid} (se queda {winner}) "
                  f"— {key[1]} / {key[2]} F{key[3]} {key[5]} vs {key[6]}")
    return to_exclude

# ──────────────────────────────────────────────────────────────────────────────
# matches.json — tabla principal (compacto, sin detalles de alineación)
# ──────────────────────────────────────────────────────────────────────────────

def gen_matches(conn, exclude_ids: set[str] | None = None):
    exclude_ids = exclude_ids or set()
    rows = conn.execute("""
        SELECT
            id, season, tournament, series, round,
            datetime, venue,
            home_team, away_team,
            score_home, score_away,
            clt_side, clt_goals_for, clt_goals_against, result
        FROM matches
        ORDER BY datetime DESC, id DESC
    """).fetchall()

    matches = []
    for r in rows:
        if r["id"] in exclude_ids:
            continue
        matches.append({
            "id":       r["id"],
            "season":   r["season"],
            "year":     r["season"] + 1913,
            "tournament": r["tournament"],
            "series":   r["series"],
            "round":    r["round"],
            "datetime": r["datetime"],
            "venue":    r["venue"],
            "home":     r["home_team"],
            "away":     r["away_team"],
            "score_home": r["score_home"],
            "score_away": r["score_away"],
            "clt_side": r["clt_side"],
            "gf":       r["clt_goals_for"],
            "ga":       r["clt_goals_against"],
            "result":   r["result"],
        })

    write_json(OUT_DIR / "matches.json", matches, f"matches.json ({len(matches)} partidos)")

# ──────────────────────────────────────────────────────────────────────────────
# seasons.json — metadatos para los filtros del frontend
# ──────────────────────────────────────────────────────────────────────────────

def gen_seasons(conn):
    # Temporadas disponibles
    seasons_raw = conn.execute("""
        SELECT DISTINCT season FROM matches ORDER BY season DESC
    """).fetchall()

    seasons = []
    for s_row in seasons_raw:
        season = s_row["season"]

        # Torneos de esta temporada
        torneos_raw = conn.execute("""
            SELECT DISTINCT tournament FROM matches WHERE season=? ORDER BY tournament
        """, (season,)).fetchall()

        torneos = []
        for t_row in torneos_raw:
            torneo = t_row["tournament"]
            series_raw = conn.execute("""
                SELECT DISTINCT series FROM matches
                WHERE season=? AND tournament=? ORDER BY series
            """, (season, torneo)).fetchall()
            torneos.append({
                "name":   torneo,
                "series": [r["series"] for r in series_raw],
            })

        seasons.append({
            "season":    season,
            "year":      season + 1913,  # 112 → 2025, 111 → 2024, etc.
            "tournaments": torneos,
        })

    # Lista de rivales únicos
    rivals_raw = conn.execute("""
        SELECT DISTINCT
            CASE WHEN clt_side='home' THEN away_team ELSE home_team END as rival
        FROM matches
        ORDER BY rival
    """).fetchall()
    rivals = [r["rival"] for r in rivals_raw if r["rival"]]

    data = {"seasons": seasons, "rivals": rivals}
    write_json(OUT_DIR / "seasons.json", data, f"seasons.json ({len(seasons)} temporadas, {len(rivals)} rivales)")

# ──────────────────────────────────────────────────────────────────────────────
# match_detail_{id}.json — detalle por partido (cargado on-demand)
# ──────────────────────────────────────────────────────────────────────────────

def gen_match_details(conn, exclude_ids: set[str] | None = None):
    exclude_ids = exclude_ids or set()
    matches = conn.execute("SELECT id FROM matches").fetchall()
    detail_dir = OUT_DIR / "match"
    detail_dir.mkdir(parents=True, exist_ok=True)

    # Limpiar JSONs viejos de IDs duplicados que ya no van al sitio
    for mid in exclude_ids:
        stale = detail_dir / f"{mid}.json"
        if stale.exists():
            stale.unlink()

    count = 0
    for row in matches:
        mid = row["id"]
        if mid in exclude_ids:
            continue

        starters = conn.execute("""
            SELECT player_carne, player_name, shirt_number, is_captain
            FROM match_starters WHERE match_id=? ORDER BY CAST(shirt_number AS INTEGER)
        """, (mid,)).fetchall()

        subs = conn.execute("""
            SELECT player_out_carne, player_out_name, player_in_carne, player_in_name, shirt_number, minute
            FROM match_subs WHERE match_id=? ORDER BY CAST(minute AS INTEGER)
        """, (mid,)).fetchall()

        goals = conn.execute("""
            SELECT player_carne, player_name, minute, is_own_goal
            FROM match_goals WHERE match_id=? ORDER BY CAST(minute AS INTEGER)
        """, (mid,)).fetchall()

        yellows = conn.execute("""
            SELECT player_name FROM match_yellows WHERE match_id=?
        """, (mid,)).fetchall()

        reds = conn.execute("""
            SELECT player_name, observations FROM match_reds WHERE match_id=?
        """, (mid,)).fetchall()

        detail = {
            "match_id": mid,
            "starters": [
                {"carne": r["player_carne"], "name": r["player_name"],
                 "shirt": r["shirt_number"], "captain": bool(r["is_captain"])}
                for r in starters
            ],
            "subs": [
                {"out_carne": r["player_out_carne"], "out_name": r["player_out_name"],
                 "in_carne": r["player_in_carne"],  "in_name": r["player_in_name"],
                 "shirt": r["shirt_number"], "minute": r["minute"]}
                for r in subs
            ],
            "goals": [
                {"carne": r["player_carne"], "name": r["player_name"],
                 "minute": r["minute"], "own_goal": bool(r["is_own_goal"])}
                for r in goals
            ],
            "yellows": [{"name": r["player_name"]} for r in yellows],
            "reds":    [{"name": r["player_name"], "obs": r["observations"]} for r in reds],
        }

        write_json(detail_dir / f"{mid}.json", detail)
        count += 1

    print(f"  ✓ match/*.json ({count} archivos de detalle)")

# ──────────────────────────────────────────────────────────────────────────────
# players_stats.json — rankings
# ──────────────────────────────────────────────────────────────────────────────

def gen_player_index(conn, exclude_ids: set[str] | None = None):
    """Genera player_index.json — mapeo carne → [match_ids] para evitar cargar 2000+ archivos en el frontend."""
    exclude_ids = exclude_ids or set()
    # Titulares
    starters = conn.execute("""
        SELECT player_carne, match_id FROM match_starters WHERE player_carne != ''
    """).fetchall()

    # Suplentes que entran
    subs_in = conn.execute("""
        SELECT player_in_carne, match_id FROM match_subs WHERE player_in_carne != ''
    """).fetchall()

    # Suplentes que salen (también participaron)
    subs_out = conn.execute("""
        SELECT player_out_carne, match_id FROM match_subs WHERE player_out_carne != ''
    """).fetchall()

    idx = {}
    for r in starters:
        if r["match_id"] in exclude_ids:
            continue
        idx.setdefault(r["player_carne"], set()).add(r["match_id"])
    for r in subs_in:
        if r["match_id"] in exclude_ids:
            continue
        idx.setdefault(r["player_in_carne"], set()).add(r["match_id"])
    for r in subs_out:
        if r["match_id"] in exclude_ids:
            continue
        idx.setdefault(r["player_out_carne"], set()).add(r["match_id"])

    # Convertir sets a listas ordenadas para JSON
    data = {carne: sorted(match_ids) for carne, match_ids in idx.items()}

    write_json(OUT_DIR / "player_index.json", data,
               f"player_index.json ({len(data)} jugadores)")

def gen_players_stats(conn, exclude_ids: set[str] | None = None):
    exclude_ids = exclude_ids or set()
    # Filtro SQL para excluir partidos duplicados
    if exclude_ids:
        placeholders = ",".join("?" for _ in exclude_ids)
        exclude_filter = f"AND m.id NOT IN ({placeholders})"
        exclude_params = tuple(exclude_ids)
    else:
        exclude_filter = ""
        exclude_params = ()

    # Goleadores con desglose por temporada (excluye goles en contra)
    scorers_raw = conn.execute(f"""
        SELECT
            g.player_carne as carne,
            g.player_name  as name,
            m.season as season,
            COUNT(*) as goals
        FROM match_goals g
        JOIN matches m ON m.id = g.match_id
        WHERE g.is_own_goal = 0
          {exclude_filter}
        GROUP BY g.player_carne, g.player_name, m.season
        ORDER BY g.player_carne, m.season
    """, exclude_params).fetchall()

    # Agrupar por jugador
    scorers_map = {}
    for r in scorers_raw:
        key = r["carne"]
        if key not in scorers_map:
            scorers_map[key] = {"carne": r["carne"], "name": r["name"], "goals": 0, "bySeason": []}
        scorers_map[key]["goals"] += r["goals"]
        scorers_map[key]["bySeason"].append({"year": r["season"] + 1913, "goals": r["goals"]})

    scorers = sorted(scorers_map.values(), key=lambda x: (-x["goals"], x["name"]))

    # Apariciones (titulares + entradas como cambio) — excluye partidos duplicados
    if exclude_ids:
        ph = ",".join("?" for _ in exclude_ids)
        starters_filter = f"WHERE match_id NOT IN ({ph})"
        subs_filter     = f"WHERE match_id NOT IN ({ph})"
        params2 = tuple(exclude_ids) + tuple(exclude_ids)
    else:
        starters_filter = subs_filter = ""
        params2 = ()

    appearances_raw = conn.execute(f"""
        SELECT carne, name, starters, subs_in, (starters + subs_in) as total
        FROM (
            SELECT
                p.carne,
                p.name,
                COALESCE(st.n, 0) as starters,
                COALESCE(su.n, 0) as subs_in
            FROM players p
            LEFT JOIN (
                SELECT player_carne, COUNT(*) as n
                FROM match_starters {starters_filter} GROUP BY player_carne
            ) st ON st.player_carne = p.carne
            LEFT JOIN (
                SELECT player_in_carne, COUNT(*) as n
                FROM match_subs {subs_filter} GROUP BY player_in_carne
            ) su ON su.player_in_carne = p.carne
        )
        WHERE total > 0
        ORDER BY total DESC, name
    """, params2).fetchall()

    appearances = [
        {"carne": r["carne"], "name": r["name"],
         "starters": r["starters"], "subs_in": r["subs_in"], "total": r["total"]}
        for r in appearances_raw
    ]

    data = {"scorers": scorers, "appearances": appearances}
    write_json(OUT_DIR / "players_stats.json", data,
               f"players_stats.json ({len(scorers)} goleadores, {len(appearances)} jugadores)")

# ──────────────────────────────────────────────────────────────────────────────
# league_context.json — posiciones, goleadores y valla por temporada/torneo/serie
# ──────────────────────────────────────────────────────────────────────────────

# Prefijo del label del Sistema B ("T18/18-3-" → "T18") → id de categoría
LABEL_PREFIX_TO_CATEGORY = {
    "T2": "mayores", "T2B": "reserva", "T20": "sub20", "T18": "sub18",
    "T16": "sub16", "T14": "sub14", "T32": "presenior", "T40": "mas40", "T48": "mas48",
}

def category_from_label(label: str) -> str | None:
    return LABEL_PREFIX_TO_CATEGORY.get((label or "").split("/")[0])

def _series_a_stats(conn, season: int, exclude_ids: set[str]) -> dict[str, list[dict]]:
    """
    Por categoría, resumen de cada serie del Sistema A en la base:
    partidos jugados por CLT, rivales enfrentados, último partido y nombre de fase.
    Sirve para adivinar a qué fase corresponde cada tabla del Sistema B.
    """
    rows = conn.execute("""
        SELECT id, tournament, series, datetime, home_team, away_team, clt_side, result
        FROM matches WHERE season=?
    """, (season,)).fetchall()
    by_cat: dict[str, dict[str, dict]] = {}
    for r in rows:
        if r["id"] in exclude_ids:
            continue
        cid = classify_category(r["tournament"], r["series"])
        if not cid:
            continue
        s = by_cat.setdefault(cid, {}).setdefault(r["series"], {
            "series": r["series"], "played": 0, "opponents": set(),
            "last": "", "stage": stage_from_series(r["series"]),
        })
        opp = r["away_team"] if r["clt_side"] == "home" else r["home_team"]
        if opp:
            s["opponents"].add(_opponent_key(opp))
        if r["result"] is not None:
            s["played"] += 1
        s["last"] = max(s["last"], r["datetime"] or "")
    return {cid: list(series.values()) for cid, series in by_cat.items()}

def _stage_for_label(stats: dict[str, list[dict]], cid: str | None, standings: list[dict]) -> str | None:
    """
    Fase de una tabla del Sistema B: se compara con las series del Sistema A de
    la misma categoría (PJ de CLT en la tabla vs partidos jugados en la base, y
    rivales de la serie presentes en la tabla). Con una sola serie no hay duda.
    """
    candidates = stats.get(cid or "", [])
    if not candidates:
        return None
    if len(candidates) == 1:
        return candidates[0]["stage"]
    clt_pj = next((s["pj"] for s in standings if CLT_NAME in (s["institution"] or "").upper()), None)
    institutions = {_opponent_key(s["institution"]) for s in standings}

    def score(c):
        overlap = len(c["opponents"] & institutions) / len(c["opponents"]) if c["opponents"] else 0
        pj_match = 2 if clt_pj is not None and clt_pj == c["played"] else 0
        return (pj_match + overlap, c["last"])

    return max(candidates, key=score)["stage"]

def gen_league_context(conn, exclude_ids: set[str] | None = None):
    exclude_ids = exclude_ids or set()
    # Verificar que las tablas existen (pueden no existir en DBs antiguas)
    tables = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}
    if "league_standings" not in tables:
        print("  ⚠ league_standings no existe — saltando league_context.json")
        return

    # result[season] = lista de contextos de series donde CLT aparece
    result = {}
    stats_cache: dict[int, dict] = {}

    combos = conn.execute("""
        SELECT DISTINCT season, tournament, series FROM league_standings
        ORDER BY season, tournament, series
    """).fetchall()

    for combo in combos:
        season_num = combo["season"]
        season_key = str(season_num)
        torneo     = combo["tournament"]
        serie      = combo["series"]

        # Posiciones
        standings_rows = conn.execute("""
            SELECT rank, institution, pj, pg, pe, pp, gf, gc, points
            FROM league_standings
            WHERE season=? AND tournament=? AND series=?
            ORDER BY rank
        """, (season_num, torneo, serie)).fetchall()

        standings = []
        clt_rank   = None
        clt_points = None
        for r in standings_rows:
            inst = r["institution"]
            standings.append({
                "rank": r["rank"], "institution": inst,
                "pj": r["pj"], "pg": r["pg"], "pe": r["pe"], "pp": r["pp"],
                "gf": r["gf"], "gc": r["gc"], "points": r["points"],
            })
            if "CARRASCO LAWN TENNIS" in inst.upper():
                clt_rank   = r["rank"]
                clt_points = r["points"]

        # Goleadores
        scorers_rows = conn.execute("""
            SELECT player_name, institution, goals
            FROM league_scorers
            WHERE season=? AND tournament=? AND series=?
            ORDER BY goals DESC, player_name
        """, (season_num, torneo, serie)).fetchall()

        scorers = [
            {"player": r["player_name"], "institution": r["institution"], "goals": r["goals"]}
            for r in scorers_rows
        ]

        # Valla
        gk_rows = conn.execute("""
            SELECT player_name, institution, goals_received, matches, avg_per_match
            FROM league_goalkeepers
            WHERE season=? AND tournament=? AND series=?
            ORDER BY avg_per_match ASC, goals_received ASC, player_name
        """, (season_num, torneo, serie)).fetchall()

        goalkeepers = [
            {"player": r["player_name"], "institution": r["institution"],
             "gr": r["goals_received"], "matches": r["matches"],
             "ppp": r["avg_per_match"]}
            for r in gk_rows
        ]

        if season_num not in stats_cache:
            stats_cache[season_num] = _series_a_stats(conn, season_num, exclude_ids)
        category = category_from_label(serie)

        ctx = {
            "label":       serie,  # ej: "T2/AT"
            "category":    category,  # ej: "sub18" — None si el torneo no es conocido
            "stage":       _stage_for_label(stats_cache[season_num], category, standings),
            "standings":   standings,
            "clt_rank":    clt_rank,
            "clt_points":  clt_points,
            "scorers":     scorers,
            "goalkeepers": goalkeepers,
        }

        result.setdefault(season_key, []).append(ctx)

    total_series = sum(len(v) for v in result.values())
    write_json(OUT_DIR / "league_context.json", result,
               f"league_context.json ({len(result)} temporadas, {total_series} tablas)")

# ──────────────────────────────────────────────────────────────────────────────
# fixtures_live.json — calendario de CLT desde las APIs del Sistema B
# ──────────────────────────────────────────────────────────────────────────────

LIGA_BASE  = "https://ligauniversitaria.org.uy"
SPORT_API  = "F"
CLT_NAME   = "CARRASCO LAWN TENNIS"

# ── Clasificación de categorías ───────────────────────────────────────────────
# La liga renombra los torneos del Sistema A a mitad de temporada ("Mayores
# Masculino" → "MAYORES", "Sub - 20" → "SUB 20", "MÁS 40" → "MAS 40"...) y en la
# segunda fase crea series nuevas ("SUB18 SERIE 3 RUEDA 2", "SUB14 COPA DE ORO").
# Por eso se clasifica por patrón y no por nombre exacto.

def _norm_text(s: str | None) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    return s.upper()

CATEGORY_PATTERNS = [
    ("sub20",     re.compile(r"SUB\s*-?\s*20")),
    ("sub18",     re.compile(r"SUB\s*-?\s*18")),
    ("sub16",     re.compile(r"SUB\s*-?\s*16")),
    ("sub14",     re.compile(r"SUB\s*-?\s*14")),
    ("mas48",     re.compile(r"MAS\s*-?\s*48")),
    ("mas40",     re.compile(r"MAS\s*-?\s*40")),
    ("presenior", re.compile(r"PRE\s*-?\s*SENIOR|PRESR|\bPRES\b")),
    ("reserva",   re.compile(r"RESERVA")),
    ("mayores",   re.compile(r"MAYORES")),
]

def classify_category(tournament: str | None, series: str | None) -> str | None:
    """Devuelve el id de categoría (mayores, reserva, sub20...) o None."""
    for text in (_norm_text(tournament), _norm_text(series)):
        for cid, pat in CATEGORY_PATTERNS:
            if pat.search(text):
                return cid
    return None

# Nombre legible de la fase a partir del nombre de serie del Sistema A.
# None = fase regular / primera rueda.
_STAGE_PRIMARY = [
    (re.compile(r"COPA\s*(DE\s*)?ORO"),                    "Copa de Oro"),
    (re.compile(r"COPA\s*(DE\s*)?PLATA"),                  "Copa de Plata"),
    (re.compile(r"COPA\s*(DE\s*)?BRONCE"),                 "Copa de Bronce"),
    (re.compile(r"TIT\.?\s*Y\s*ASC|TITULO\s*Y\s*ASC"),     "Título y Ascenso"),
    (re.compile(r"TITULO|\bTIT\b|\bTIT\."),                "Fase Título"),
    (re.compile(r"PER\.?\s*Y\s*DESC|PERMANENCIA|DESCENSO"), "Permanencia y Descenso"),
    (re.compile(r"DESEM"),                                 "Desempate"),
    (re.compile(r"SEMI"),                                  "Semifinal"),
    (re.compile(r"4TOS|CUARTOS"),                          "Cuartos de Final"),
    (re.compile(r"8VOS|OCTAVOS"),                          "Octavos de Final"),
    (re.compile(r"\bFINAL\b"),                             "Final"),
]
_STAGE_RUEDA2 = re.compile(r"RUEDA\s*2|\bR\.?\s*2\b|2DA\.?\s*RUEDA|SEGUNDA\s*RUEDA")

def stage_from_series(series: str | None) -> str | None:
    text = _norm_text(series)
    primary = next((name for pat, name in _STAGE_PRIMARY if pat.search(text)), None)
    rueda2 = bool(_STAGE_RUEDA2.search(text))
    if primary and rueda2:
        return f"{primary} · 2ª Rueda"
    if primary:
        return primary
    if rueda2:
        return "2ª Rueda"
    return None

def _opponent_key(name: str | None) -> str:
    """Clave para comparar rivales entre sistemas (ignora puntos, espacios, tildes)."""
    return re.sub(r"[^A-Z0-9]", "", _norm_text(name))

def _is_bye(name: str | None) -> bool:
    """'FECHA LIBRE' / 'LIBRE' aparecen como rival cuando CLT no juega esa fecha."""
    key = _opponent_key(name)
    return key in ("FECHALIBRE", "LIBRE") or key.startswith("FECHALIBRE")

# Categorías con API del Sistema B — validadas el 14/04/2026 para temporada 113.
# `serie` es el código de la fase regular; las series de fases posteriores se leen
# de la base, donde el extractor ya las dejó (ver _series_for_category).
FIXTURE_CATEGORIES = [
    {"id": "mayores",   "name": "Mayores",   "division": "Divisional A", "copa": "Copa Pilsen 0,0%",
     "torneo": "2",  "categoria": "1",  "serie": "A"},
    {"id": "reserva",   "name": "Reserva",   "division": "Divisional A", "copa": "Copa Antel",
     "torneo": "2B", "categoria": "2",  "serie": "RS1"},
    {"id": "sub20",     "name": "Sub-20",    "division": "Divisional A", "copa": "Copa Perifar",
     "torneo": "20", "categoria": "20", "serie": "20A"},
    {"id": "sub18",     "name": "Sub-18",    "division": "Divisional 3", "copa": "",
     "torneo": "18", "categoria": "18", "serie": "18-3-", "ida_vuelta": True},
    {"id": "sub16",     "name": "Sub-16",    "division": "Divisional 3", "copa": "",
     "torneo": "16", "categoria": "16", "serie": "16-3-", "ida_vuelta": True},
    {"id": "sub14",     "name": "Sub-14",    "division": "Serie 1", "copa": "",
     "torneo": "14", "categoria": "14", "serie": "S14S1", "ida_vuelta": True},
    {"id": "presenior", "name": "Presenior", "division": "Divisional B", "copa": "Copa Summum",
     "torneo": "32", "categoria": "32", "serie": "PSB"},
    {"id": "mas40",     "name": "Más 40",   "division": "Divisional B", "copa": "",
     "torneo": "40", "categoria": "40", "serie": "M40S2"},
    {"id": "mas48",     "name": "Más 48",   "division": "Ronda 1", "copa": "",
     "torneo": "48", "categoria": "48", "serie": "48R1"},
]

def _api_get(url: str, params: dict) -> list:
    """GET a una API de la liga con reintentos simples. Retorna lista o []."""
    for attempt in range(3):
        try:
            r = requests.get(url, params=params, timeout=20)
            r.raise_for_status()
            data = r.json()
            return data if isinstance(data, list) else []
        except Exception as e:
            if attempt < 2:
                time.sleep(1)
            else:
                print(f"  ⚠ Error fetching {url} params={params}: {e}")
    return []

def _clt_series_from_db(conn, season: int) -> dict[str, list[str]]:
    """
    Series del Sistema B donde CLT juega esta temporada, agrupadas por torneo.

    El extractor ya hizo el descubrimiento: `league_standings` solo guarda una
    serie si CLT aparece en su tabla de posiciones, y sus labels tienen la forma
    "T{torneo}/{serie}" (ej: "T18/18-3-", "T18/18-32"). Leerlas de acá evita que
    el generador vuelva a bajar y sondear las ~180 series de config.json — eso
    hacía que la corrida del cron se pasara del timeout.

    Retorna {torneo: [serie, ...]}, o {} si la tabla no existe todavía.
    """
    tables = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}
    if "league_standings" not in tables:
        return {}

    by_torneo: dict[str, list[str]] = {}
    rows = conn.execute(
        "SELECT DISTINCT series FROM league_standings WHERE season=?", (season,)
    ).fetchall()
    for r in rows:
        label = (r["series"] or "").strip()
        if not label.startswith("T") or "/" not in label:
            continue
        torneo, serie = label[1:].split("/", 1)
        if torneo and serie:
            by_torneo.setdefault(torneo, [])
            if serie not in by_torneo[torneo]:
                by_torneo[torneo].append(serie)
    return by_torneo

def _series_for_category(cat: dict, clt_series: dict[str, list[str]]) -> list[str]:
    """Códigos de serie a consultar: el conocido primero, después los de la base."""
    series = [cat["serie"]]
    for serie in clt_series.get(cat["torneo"], []):
        if serie not in series:
            series.append(serie)
    return series

def _split_datetime(raw: str | None) -> tuple[str, str | None]:
    """'2026-04-19 11:15:00' → ('2026-04-19', '11:15'); hora 00:00 → None."""
    raw = (raw or "").strip()
    date_str = raw.split(" ")[0] if raw else ""
    time_str = raw.split(" ")[1][:5] if " " in raw else None
    if time_str == "00:00":
        time_str = None
    return date_str, time_str

def _parse_api_match(row: dict, played: bool) -> dict | None:
    """Convierte una fila de resultados/partidos (Sistema B) a partido de CLT, o None."""
    loc = (row.get("Locatario") or "").strip().upper()
    vis = (row.get("Visitante") or "").strip().upper()
    is_home = loc == CLT_NAME
    is_away = vis == CLT_NAME
    if not is_home and not is_away:
        return None
    opponent = vis if is_home else loc
    if _is_bye(opponent):
        return None

    # Jugados: Fecha_Hora es el datetime y Fecha el número de fecha.
    # Próximos: Fecha es el datetime.
    date_str, time_str = _split_datetime(row.get("Fecha_Hora") if played else row.get("Fecha"))
    m = {
        "date":     date_str,
        "opponent": opponent.title(),
        "home":     is_home,
        "played":   played,
    }
    if played:
        try:
            m["score_home"] = int(row.get("GL") or 0)  # GL = goles local (tal cual de la API)
            m["score_away"] = int(row.get("GV") or 0)  # GV = goles visitante
        except (TypeError, ValueError):
            m["score_home"] = m["score_away"] = 0
        fecha = str(row.get("Fecha") or "").strip()
        if fecha.isdigit():
            m["round"] = fecha
    if time_str:
        m["time"] = time_str
    if row.get("Cancha"):
        m["venue"] = row.get("Cancha")
    return m

def _db_category_matches(conn, season: int, cat_id: str, exclude_ids: set[str]) -> list[dict]:
    """
    Partidos de CLT de la categoría según la base (Sistema A). Es la fuente más
    completa: el extractor recorre todos los torneos y series de la temporada,
    incluidas las de la segunda fase. Cada partido trae `stage` (nombre de fase).
    """
    rows = conn.execute("""
        SELECT id, tournament, series, round, datetime, venue,
               home_team, away_team, score_home, score_away, clt_side, result
        FROM matches WHERE season=? ORDER BY datetime
    """, (season,)).fetchall()

    out = []
    for r in rows:
        if r["id"] in exclude_ids:
            continue
        if classify_category(r["tournament"], r["series"]) != cat_id:
            continue
        is_home = r["clt_side"] == "home"
        opponent = ((r["away_team"] if is_home else r["home_team"]) or "").strip()
        if not opponent or _is_bye(opponent):
            continue
        date_str, time_str = _split_datetime(r["datetime"])
        if not date_str:
            continue
        played = r["result"] is not None and r["score_home"] is not None and r["score_away"] is not None
        m = {
            "date":     date_str,
            "opponent": opponent.title(),
            "home":     is_home,
            "played":   played,
            "match_id": r["id"],
        }
        if played:
            m["score_home"] = r["score_home"]
            m["score_away"] = r["score_away"]
        if r["round"]:
            m["round"] = str(r["round"])
        if time_str:
            m["time"] = time_str
        if r["venue"]:
            m["venue"] = r["venue"]
        stage = stage_from_series(r["series"])
        if stage:
            m["stage"] = stage
        out.append(m)
    return out

def _fetch_category_fixtures(cat: dict, season: int, conn=None,
                             exclude_ids: set[str] | None = None,
                             clt_series: dict[str, list[str]] | None = None) -> dict:
    """
    Arma el calendario de CLT de una categoría combinando:
      1. La base SQLite (Sistema A): todos los partidos jugados, de todas las fases.
      2. Sistema B `resultados` + `partidos` para cada serie de la categoría
         (la conocida + las de fases posteriores que el extractor ya descubrió):
         jugados y PRÓXIMOS.
    Retorna la estructura de categoría lista para el JSON.
    """
    exclude_ids = exclude_ids or set()
    clt_series = clt_series or {}
    today = datetime.now().date()

    # Clave (fecha, rival) → partido. Se cargan primero los de la base porque
    # traen la fase; los de la API completan próximos, hora y cancha.
    merged: dict[tuple, dict] = {}

    db_matches = _db_category_matches(conn, season, cat["id"], exclude_ids) if conn is not None else []
    for m in db_matches:
        merged.setdefault((m["date"], _opponent_key(m["opponent"])), m)

    # Fase actual según la base: la del último partido jugado con nombre de fase.
    played_db = [m for m in db_matches if m["played"]]
    current_stage = next((m.get("stage") for m in reversed(played_db) if m.get("stage")), None)

    series_codes = _series_for_category(cat, clt_series)
    extra_found = []
    for serie in series_codes:
        params = {
            "action":    "cargarPartidos",
            "temporada": str(season),
            "deporte":   SPORT_API,
            "torneo":    cat["torneo"],
            "categoria": cat["categoria"],
            "serie":     serie,
        }
        results  = _api_get(f"{LIGA_BASE}/resultados/api.php", params)
        upcoming = _api_get(f"{LIGA_BASE}/partidos/api.php",   params)
        time.sleep(0.25)  # rate limiting suave

        api_matches = [m for m in (_parse_api_match(r, True) for r in results) if m]
        api_matches += [m for m in (_parse_api_match(u, False) for u in upcoming) if m]
        if not api_matches:
            continue
        is_extra = serie != cat["serie"]
        if is_extra:
            extra_found.append(serie)

        for m in api_matches:
            if not m["played"]:
                # Próximos: descartar los que ya pasaron (quedaron sin resultado)
                try:
                    if datetime.strptime(m["date"], "%Y-%m-%d").date() < today:
                        continue
                except ValueError:
                    pass
                if is_extra:
                    m["stage"] = current_stage or "2ª Fase"
            key = (m["date"], _opponent_key(m["opponent"]))
            existing = merged.get(key)
            if existing is None:
                merged[key] = m
                continue
            # Ya estaba (desde la base): completar hora/cancha/marcador si faltan
            for field in ("time", "venue", "round"):
                if field not in existing and field in m:
                    existing[field] = m[field]
            if m["played"] and not existing["played"]:
                existing.update(played=True, score_home=m["score_home"], score_away=m["score_away"])

    matches = list(merged.values())

    # Partidos de vuelta tentativos — solo para categorías ida_vuelta (juveniles)
    # y SOLO mientras no haya datos reales de una fase posterior. Cuando la liga
    # carga la segunda fase (Rueda 2, Copa de Oro...) los tentativos se dejan de
    # generar: antes quedaban como partidos transparentes que nunca se jugaban.
    has_phase2 = any(m.get("stage") for m in matches) or bool(extra_found)
    missing_return = []
    if cat.get("ida_vuelta") and not has_phase2 and matches:
        opponents_home = {_opponent_key(m["opponent"]) for m in matches if m["home"]}
        opponents_away = {_opponent_key(m["opponent"]) for m in matches if not m["home"]}
        seen = set()
        for m in matches:
            opp = _opponent_key(m["opponent"])
            if opp in seen:
                continue
            seen.add(opp)
            if m["home"] and opp not in opponents_away:
                missing_return.append({"opponent": m["opponent"], "home": False})
            elif not m["home"] and opp not in opponents_home:
                missing_return.append({"opponent": m["opponent"], "home": True})

    if missing_return:
        # Estimar fechas: continuar después del último partido conocido, una semana entre cada uno
        last_date = max(m["date"] for m in matches if m["date"])
        base = datetime.strptime(last_date, "%Y-%m-%d")
        for i, mr in enumerate(missing_return, start=1):
            est_date = base + timedelta(weeks=i)
            matches.append({
                "date":      est_date.strftime("%Y-%m-%d"),
                "opponent":  mr["opponent"],
                "home":      mr["home"],
                "played":    False,
                "tentative": True,
            })

    # Ordenar por fecha y asignar número secuencial (clave estable para el frontend;
    # `round` conserva el número de fecha real de la liga cuando se conoce)
    matches.sort(key=lambda m: (m["date"], m.get("time") or ""))
    for i, m in enumerate(matches, start=1):
        m["fecha"] = i

    if has_phase2:
        stages = [m["stage"] for m in matches if m.get("stage")]
        round_label = stages[-1] if stages else "2ª Fase"
    elif any(m.get("tentative") for m in matches):
        round_label = "Ida y Vuelta"
    else:
        round_label = "1ª Rueda"

    return {
        "id":       cat["id"],
        "name":     cat["name"],
        "division": cat["division"],
        "copa":     cat["copa"],
        "round":    round_label,
        "series":   series_codes[:1] + extra_found,
        "matches":  matches,
    }

def gen_fixtures_live(season: int, conn=None, exclude_ids: set[str] | None = None):
    """Genera fixtures_live.json con el calendario de CLT (base SQLite + APIs del Sistema B)."""
    print(f"  Bajando fixtures live (temporada {season})...")
    clt_series = _clt_series_from_db(conn, season) if conn is not None else {}
    n_series = sum(len(v) for v in clt_series.values())
    print(f"    series de CLT en la base: {n_series} "
          f"({', '.join(f'T{t}/{s}' for t, ss in sorted(clt_series.items()) for s in ss) or 'ninguna'})")
    categories = []
    for cat in FIXTURE_CATEGORIES:
        cat_data = _fetch_category_fixtures(cat, season, conn, exclude_ids, clt_series)
        total = len(cat_data["matches"])
        played = sum(1 for m in cat_data["matches"] if m.get("played"))
        print(f"    {cat['name']}: {total} partidos ({played} jugados, {total - played} próximos)")
        categories.append(cat_data)

    data = {
        "season":     season,
        "year":       season + 1913,
        "generated":  datetime.now(timezone.utc).isoformat(),
        "categories": categories,
    }
    write_json(OUT_DIR / "fixtures_live.json", data,
               f"fixtures_live.json ({len(categories)} categorías)")

# ──────────────────────────────────────────────────────────────────────────────
# last_updated.json — timestamp
# ──────────────────────────────────────────────────────────────────────────────

def gen_last_updated(conn):
    # Última temporada con datos
    latest = conn.execute("SELECT MAX(season) as s FROM matches").fetchone()["s"]
    data = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "latest_season": latest,
    }
    write_json(OUT_DIR / "last_updated.json", data, "last_updated.json")

# ──────────────────────────────────────────────────────────────────────────────

def main():
    if not DB_PATH.exists():
        raise SystemExit(f"No se encontró la base de datos: {DB_PATH}\nCorré primero: python extractor.py --full")

    print(f"Leyendo: {DB_PATH}")
    print(f"Generando JSONs en: {OUT_DIR}\n")

    conn = db_connect()

    print("Buscando duplicados...")
    exclude_ids = find_duplicate_match_ids(conn)
    if exclude_ids:
        print(f"  → {len(exclude_ids)} partido(s) duplicado(s) excluido(s)\n")
    else:
        print("  → sin duplicados\n")

    gen_matches(conn, exclude_ids)
    gen_seasons(conn)
    gen_match_details(conn, exclude_ids)
    gen_player_index(conn, exclude_ids)
    gen_players_stats(conn, exclude_ids)
    gen_league_context(conn, exclude_ids)
    gen_last_updated(conn)

    # Fixtures live — siempre la temporada más reciente
    latest = conn.execute("SELECT MAX(season) as s FROM matches").fetchone()["s"]
    gen_fixtures_live(latest, conn, exclude_ids)

    conn.close()
    print("\nListo.")

if __name__ == "__main__":
    main()
