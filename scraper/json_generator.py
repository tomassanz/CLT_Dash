"""
json_generator.py — Genera los JSONs estáticos para el frontend a partir de clt.db

Uso:
    python json_generator.py

Genera los archivos en ../frontend/public/data/
"""

import json
import sqlite3
import time
from datetime import datetime, timezone
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
# matches.json — tabla principal (compacto, sin detalles de alineación)
# ──────────────────────────────────────────────────────────────────────────────

def gen_matches(conn):
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

def gen_match_details(conn):
    matches = conn.execute("SELECT id FROM matches").fetchall()
    detail_dir = OUT_DIR / "match"
    detail_dir.mkdir(parents=True, exist_ok=True)

    count = 0
    for row in matches:
        mid = row["id"]

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

def gen_player_index(conn):
    """Genera player_index.json — mapeo carne → [match_ids] para evitar cargar 2000+ archivos en el frontend."""
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
        idx.setdefault(r["player_carne"], set()).add(r["match_id"])
    for r in subs_in:
        idx.setdefault(r["player_in_carne"], set()).add(r["match_id"])
    for r in subs_out:
        idx.setdefault(r["player_out_carne"], set()).add(r["match_id"])

    # Convertir sets a listas ordenadas para JSON
    data = {carne: sorted(match_ids) for carne, match_ids in idx.items()}

    write_json(OUT_DIR / "player_index.json", data,
               f"player_index.json ({len(data)} jugadores)")

def gen_players_stats(conn):
    # Goleadores con desglose por temporada (excluye goles en contra)
    scorers_raw = conn.execute("""
        SELECT
            g.player_carne as carne,
            g.player_name  as name,
            m.season as season,
            COUNT(*) as goals
        FROM match_goals g
        JOIN matches m ON m.id = g.match_id
        WHERE g.is_own_goal = 0
        GROUP BY g.player_carne, g.player_name, m.season
        ORDER BY g.player_carne, m.season
    """).fetchall()

    # Agrupar por jugador
    scorers_map = {}
    for r in scorers_raw:
        key = r["carne"]
        if key not in scorers_map:
            scorers_map[key] = {"carne": r["carne"], "name": r["name"], "goals": 0, "bySeason": []}
        scorers_map[key]["goals"] += r["goals"]
        scorers_map[key]["bySeason"].append({"year": r["season"] + 1913, "goals": r["goals"]})

    scorers = sorted(scorers_map.values(), key=lambda x: (-x["goals"], x["name"]))

    # Apariciones (titulares + entradas como cambio)
    appearances_raw = conn.execute("""
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
                FROM match_starters GROUP BY player_carne
            ) st ON st.player_carne = p.carne
            LEFT JOIN (
                SELECT player_in_carne, COUNT(*) as n
                FROM match_subs GROUP BY player_in_carne
            ) su ON su.player_in_carne = p.carne
        )
        WHERE total > 0
        ORDER BY total DESC, name
    """).fetchall()

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

def gen_league_context(conn):
    # Verificar que las tablas existen (pueden no existir en DBs antiguas)
    tables = {r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'"
    ).fetchall()}
    if "league_standings" not in tables:
        print("  ⚠ league_standings no existe — saltando league_context.json")
        return

    # result[season] = lista de contextos de series donde CLT aparece
    result = {}

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

        ctx = {
            "label":       serie,  # ej: "T2/AT"
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

# Categorías con API del Sistema B — validadas el 14/04/2026 para temporada 113
FIXTURE_CATEGORIES = [
    {"id": "mayores",   "name": "Mayores",   "division": "Divisional A", "copa": "Copa Pilsen 0,0%",
     "torneo": "2",  "categoria": "1",  "serie": "A",     "db_tournament": "Mayores Masculino"},
    {"id": "reserva",   "name": "Reserva",   "division": "Divisional A", "copa": "Copa Antel",
     "torneo": "2B", "categoria": "2",  "serie": "RS1",   "db_tournament": "RESERVA"},
    {"id": "sub20",     "name": "Sub-20",    "division": "Divisional A", "copa": "Copa Perifar",
     "torneo": "20", "categoria": "20", "serie": "20A",   "db_tournament": "Sub - 20"},
    {"id": "sub18",     "name": "Sub-18",    "division": "Divisional 3", "copa": "",
     "torneo": "18", "categoria": "18", "serie": "18-3-", "db_tournament": "SUB 18", "ida_vuelta": True},
    {"id": "sub16",     "name": "Sub-16",    "division": "Divisional 3", "copa": "",
     "torneo": "16", "categoria": "16", "serie": "16-3-", "db_tournament": "SUB 16", "ida_vuelta": True},
    {"id": "sub14",     "name": "Sub-14",    "division": "Serie 1", "copa": "",
     "torneo": "14", "categoria": "14", "serie": "S14S1", "db_tournament": "SUB14", "ida_vuelta": True},
    {"id": "presenior", "name": "Presenior", "division": "Divisional B", "copa": "Copa Summum",
     "torneo": "32", "categoria": "32", "serie": "PSB",   "db_tournament": "PRE SENIOR"},
    {"id": "mas40",     "name": "Más 40",   "division": "Divisional B", "copa": "",
     "torneo": "40", "categoria": "40", "serie": "M40S2", "db_tournament": "MÁS 40"},
    {"id": "mas48",     "name": "Más 48",   "division": "Ronda 1", "copa": "",
     "torneo": "48", "categoria": "48", "serie": "48R1",  "db_tournament": "MÁS 48 MASCULINO"},
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

def _fetch_category_fixtures(cat: dict, season: int, conn: sqlite3.Connection | None = None) -> dict:
    """
    Descarga resultados (jugados) + próximos partidos de una categoría para CLT.
    Retorna la estructura de categoría lista para el JSON.

    Si `conn` está disponible, completa los partidos jugados que el Sistema B aún
    no haya cargado (común en partidos de mitad de semana) usando los datos ya
    extraídos por Sistema A en `clt.db`.
    """
    params_base = {
        "action":    "cargarPartidos",
        "temporada": str(season),
        "deporte":   SPORT_API,
        "torneo":    cat["torneo"],
        "categoria": cat["categoria"],
        "serie":     cat["serie"],
    }

    results  = _api_get(f"{LIGA_BASE}/resultados/api.php", params_base)
    upcoming = _api_get(f"{LIGA_BASE}/partidos/api.php",   params_base)
    time.sleep(0.25)  # rate limiting suave

    matches = []
    seen_played = set()  # claves (date, opponent_upper) para deduplicar

    # Partidos ya jugados — Fecha es el número de fecha (ej: "1")
    for r in results:
        loc = (r.get("Locatario") or "").strip().upper()
        vis = (r.get("Visitante") or "").strip().upper()
        is_home = loc == CLT_NAME
        is_away = vis == CLT_NAME
        if not is_home and not is_away:
            continue

        fecha_hora = r.get("Fecha_Hora") or ""
        date_str = fecha_hora.split(" ")[0] if fecha_hora else ""
        time_str = fecha_hora.split(" ")[1][:5] if " " in fecha_hora else None
        if time_str == "00:00":
            time_str = None

        try:
            score_home = int(r.get("GL") or 0)
            score_away = int(r.get("GV") or 0)
        except (TypeError, ValueError):
            score_home = score_away = 0

        opponent = (vis if is_home else loc).title()
        seen_played.add((date_str, opponent.upper()))

        matches.append({
            "date":       date_str,
            "opponent":   opponent,
            "home":       is_home,
            "played":     True,
            "score_home": score_home,  # GL = goles local (tal cual de la API)
            "score_away": score_away,  # GV = goles visitante (tal cual de la API)
            **({"time": time_str} if time_str else {}),
            **({"venue": r.get("Cancha")} if r.get("Cancha") else {}),
        })

    # Fallback: rellenar partidos jugados que el Sistema B aún no cargó, leyendo
    # directo de clt.db (Sistema A). Esto cubre el caso de partidos de mitad de
    # semana cuyo resultado tarda días en aparecer en /resultados/api.php.
    if conn is not None and cat.get("db_tournament"):
        db_rows = conn.execute("""
            SELECT datetime, venue, home_team, away_team, score_home, score_away, clt_side
              FROM matches
             WHERE season = ? AND tournament = ?
        """, (season, cat["db_tournament"])).fetchall()

        for row in db_rows:
            dt = row["datetime"] or ""
            date_str = dt.split(" ")[0] if dt else ""
            time_str = dt.split(" ")[1][:5] if " " in dt else None
            if time_str == "00:00":
                time_str = None

            is_home = row["clt_side"] == "home"
            opponent_raw = row["away_team"] if is_home else row["home_team"]
            opponent = (opponent_raw or "").title()
            key = (date_str, opponent.upper())
            if key in seen_played:
                continue  # Sistema B ya lo trae

            seen_played.add(key)
            matches.append({
                "date":       date_str,
                "opponent":   opponent,
                "home":       is_home,
                "played":     True,
                "score_home": row["score_home"] or 0,
                "score_away": row["score_away"] or 0,
                **({"time": time_str} if time_str else {}),
                **({"venue": row["venue"]} if row["venue"] else {}),
            })
            print(f"    + completado desde DB: {date_str} vs {opponent} ({cat['name']})")

    # Partidos próximos — Fecha es un datetime ISO (ej: "2026-04-19 11:15:00")
    today = datetime.now().date()
    for u in upcoming:
        loc = (u.get("Locatario") or "").strip().upper()
        vis = (u.get("Visitante") or "").strip().upper()
        is_home = loc == CLT_NAME
        is_away = vis == CLT_NAME
        if not is_home and not is_away:
            continue

        fecha_raw = u.get("Fecha") or ""
        date_str  = fecha_raw.split(" ")[0] if fecha_raw else ""
        time_str  = fecha_raw.split(" ")[1][:5] if " " in fecha_raw else None
        if time_str == "00:00":
            time_str = None

        # Filtrar partidos en el pasado (excluir si la fecha ya pasó)
        try:
            match_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            if match_date < today:
                continue
        except (ValueError, AttributeError):
            pass

        matches.append({
            "date":     date_str,
            "opponent": (vis if is_home else loc).title(),
            "home":     is_home,
            "played":   False,
            **({"time": time_str} if time_str else {}),
            **({"venue": u.get("Cancha")} if u.get("Cancha") else {}),
        })

    # Detectar partidos de vuelta faltantes — solo para categorías con ida_vuelta
    # (juveniles). Si un rival solo aparece con una localía, generar el partido
    # inverso como tentativo (la liga carga ida primero y luego agrega vuelta).
    opponents_home = {m["opponent"].upper() for m in matches if m["home"]}
    opponents_away = {m["opponent"].upper() for m in matches if not m["home"]}
    missing_return = []
    if cat.get("ida_vuelta"):
        seen = set()
        for m in matches:
            opp = m["opponent"].upper()
            if opp in seen:
                continue
            seen.add(opp)
            if m["home"] and opp not in opponents_away:
                missing_return.append({"opponent": m["opponent"], "home": False, "tentative": True})
            elif not m["home"] and opp not in opponents_home:
                missing_return.append({"opponent": m["opponent"], "home": True, "tentative": True})

    if missing_return:
        # Estimar fechas: continuar después del último partido conocido, una semana entre cada uno
        last_date = max(m["date"] for m in matches if m["date"])
        from datetime import timedelta
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

    # Ordenar por fecha y asignar número de fecha secuencial
    matches.sort(key=lambda m: m["date"])
    for i, m in enumerate(matches, start=1):
        m["fecha"] = i

    has_return = any(m.get("tentative") for m in matches)

    return {
        "id":       cat["id"],
        "name":     cat["name"],
        "division": cat["division"],
        "copa":     cat["copa"],
        "round":    "Ida y Vuelta" if has_return else "1ª Rueda",
        "matches":  matches,
    }

def gen_fixtures_live(season: int, conn: sqlite3.Connection | None = None):
    """Genera fixtures_live.json con el calendario de CLT desde las APIs del Sistema B.

    Si se pasa `conn`, los partidos jugados que el Sistema B aún no haya cargado
    se completan desde la base de datos (Sistema A) para que ningún partido
    desaparezca temporalmente del fixture.
    """
    print(f"  Bajando fixtures live (temporada {season})...")
    categories = []
    for cat in FIXTURE_CATEGORIES:
        cat_data = _fetch_category_fixtures(cat, season, conn=conn)
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

    gen_matches(conn)
    gen_seasons(conn)
    gen_match_details(conn)
    gen_player_index(conn)
    gen_players_stats(conn)
    gen_league_context(conn)
    gen_last_updated(conn)

    # Fixtures live — siempre la temporada más reciente
    latest = conn.execute("SELECT MAX(season) as s FROM matches").fetchone()["s"]
    gen_fixtures_live(latest, conn=conn)

    conn.close()
    print("\nListo.")

if __name__ == "__main__":
    main()
