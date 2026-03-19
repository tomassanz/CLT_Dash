"""
json_generator.py — Genera los JSONs estáticos para el frontend a partir de clt.db

Uso:
    python json_generator.py

Genera los archivos en ../frontend/public/data/
"""

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

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

def gen_players_stats(conn):
    # Goleadores (excluye goles en contra)
    scorers_raw = conn.execute("""
        SELECT
            g.player_carne as carne,
            g.player_name  as name,
            COUNT(*) as goals
        FROM match_goals g
        WHERE g.is_own_goal = 0
        GROUP BY g.player_carne, g.player_name
        ORDER BY goals DESC, name
    """).fetchall()

    scorers = [
        {"carne": r["carne"], "name": r["name"], "goals": r["goals"]}
        for r in scorers_raw
    ]

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
    gen_players_stats(conn)
    gen_league_context(conn)
    gen_last_updated(conn)

    conn.close()
    print("\nListo.")

if __name__ == "__main__":
    main()
