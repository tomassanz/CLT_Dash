"""
Newsletter sender for CLT Fútbol.

Modes:
  --fixtures   Send upcoming weekend matches (run on Fridays)
  --results    Send recent match results (run on Tuesdays)
  --dry-run    Print emails to stdout without sending
"""

import argparse
import json
import sys
import urllib.request
from datetime import date, timedelta
from pathlib import Path

SUBSCRIBERS_URL = "https://script.google.com/macros/s/AKfycby-BSwDW-HVyXb6wVHXlwjY99nSsWI7lAE-d0bmJgJOBtRji1NKJwtDAG9UQu72pgMqmA/exec"
FROM_EMAIL = "CLT Fútbol <noticias@cltfutbol.com.uy>"
REPLY_TO = "tomas.sanz00@gmail.com"
DATA_DIR = Path(__file__).parent.parent / "frontend" / "public" / "data"


# ── Data loading ──────────────────────────────────────────────────────────────

def load_subscribers() -> list[dict]:
    with urllib.request.urlopen(SUBSCRIBERS_URL, timeout=15) as r:
        raw = json.loads(r.read())
    # Deduplicate by email (keep first occurrence)
    seen = set()
    unique = []
    for sub in raw:
        email = sub.get("email", "").strip().lower()
        if email and email not in seen:
            seen.add(email)
            unique.append(sub)
    return unique


def load_fixtures() -> dict:
    with open(DATA_DIR / "fixtures_live.json", encoding="utf-8") as f:
        return json.load(f)


# ── Date helpers ──────────────────────────────────────────────────────────────

def days_from_today(iso: str) -> int:
    today = date.today()
    target = date.fromisoformat(iso)
    return (target - today).days


def format_date_es(iso: str) -> str:
    d = date.fromisoformat(iso)
    days = {0: "lunes", 1: "martes", 2: "miércoles", 3: "jueves",
            4: "viernes", 5: "sábado", 6: "domingo"}
    months = {1: "enero", 2: "febrero", 3: "marzo", 4: "abril",
              5: "mayo", 6: "junio", 7: "julio", 8: "agosto",
              9: "septiembre", 10: "octubre", 11: "noviembre", 12: "diciembre"}
    return f"{days[d.weekday()]} {d.day} de {months[d.month]}"


def to_proper(s: str) -> str:
    return " ".join(w.capitalize() for w in s.split())


# ── Match builders ────────────────────────────────────────────────────────────

def get_weekend_matches(fixtures: dict) -> list[dict]:
    """Return upcoming matches for Sat/Sun/Mon of the coming weekend."""
    today = date.today()
    # Find coming Saturday (from Friday, that's tomorrow)
    days_to_sat = (5 - today.weekday()) % 7
    if days_to_sat == 0:
        days_to_sat = 7  # if today is Saturday, get next one
    next_sat = today + timedelta(days=days_to_sat)
    weekend_dates = {
        next_sat.isoformat(),
        (next_sat + timedelta(days=1)).isoformat(),  # Sunday
        (next_sat + timedelta(days=2)).isoformat(),  # Monday
    }

    matches = []
    for cat in fixtures.get("categories", []):
        for m in cat.get("matches", []):
            if m.get("played") or m.get("tentative"):
                continue
            if m["date"] not in weekend_dates:
                continue
            matches.append({
                "category": cat["name"],
                "opponent": to_proper(m["opponent"]),
                "home": m["home"],
                "date": m["date"],
                "time": m.get("time"),
                "venue": m.get("venue") if m.get("venue") and "FIJAR" not in (m.get("venue") or "").upper() else None,
            })
    matches.sort(key=lambda x: x["date"])
    return matches


def get_recent_results(fixtures: dict) -> list[dict]:
    """Return played matches from the last 5 days."""
    results = []
    for cat in fixtures.get("categories", []):
        for m in cat.get("matches", []):
            if not m.get("played"):
                continue
            if m.get("score_home") is None or m.get("score_away") is None:
                continue
            d = -days_from_today(m["date"])  # positive = past
            if d < 0 or d > 5:
                continue
            clt_goals = m["score_home"] if m["home"] else m["score_away"]
            opp_goals = m["score_away"] if m["home"] else m["score_home"]
            if clt_goals > opp_goals:
                result = "Victoria"
                emoji = "✅"
            elif clt_goals == opp_goals:
                result = "Empate"
                emoji = "➖"
            else:
                result = "Derrota"
                emoji = "❌"
            results.append({
                "category": cat["name"],
                "opponent": to_proper(m["opponent"]),
                "score_clt": clt_goals,
                "score_opp": opp_goals,
                "result": result,
                "emoji": emoji,
                "date": m["date"],
                "home": m["home"],
            })
    results.sort(key=lambda x: x["date"], reverse=True)
    return results


# ── Email HTML builders ───────────────────────────────────────────────────────

STYLE = """
body { margin: 0; padding: 0; background: #FAF6F1; font-family: Arial, sans-serif; }
.wrap { max-width: 520px; margin: 0 auto; background: #FAF6F1; }
.header { background: #6B2D2D; padding: 24px 32px; }
.header-title { color: #D4A843; font-size: 20px; font-weight: bold; margin: 0; }
.header-sub { color: #ffffff99; font-size: 13px; margin: 4px 0 0; }
.gold-line { height: 3px; background: #D4A843; }
.content { padding: 28px 32px; }
.section-title { color: #6B2D2D; font-size: 13px; font-weight: bold; text-transform: uppercase;
                 letter-spacing: 0.1em; margin: 0 0 16px; border-bottom: 1px solid #D4A84333; padding-bottom: 8px; }
.match-card { background: white; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px;
              border-left: 4px solid #6B2D2D; }
.match-cat { font-size: 11px; color: #6B2D2D; font-weight: bold; text-transform: uppercase;
             letter-spacing: 0.08em; margin-bottom: 4px; }
.match-vs { font-size: 16px; font-weight: bold; color: #3A1A1A; margin-bottom: 4px; }
.match-info { font-size: 12px; color: #666; }
.result-card { background: white; border-radius: 10px; padding: 14px 16px; margin-bottom: 10px; }
.result-score { font-size: 20px; font-weight: bold; color: #3A1A1A; }
.result-cat { font-size: 11px; color: #888; margin-top: 2px; }
.cta { text-align: center; margin: 24px 0; }
.cta a { background: #6B2D2D; color: #D4A843; text-decoration: none; padding: 12px 28px;
          border-radius: 8px; font-weight: bold; font-size: 14px; }
.footer { text-align: center; padding: 20px 32px; color: #999; font-size: 11px; border-top: 1px solid #E8DDD0; }
.no-matches { color: #888; font-size: 14px; font-style: italic; text-align: center; padding: 20px 0; }
"""

def unsubscribe_url(email: str) -> str:
    from urllib.parse import quote
    return f"{SUBSCRIBERS_URL}?action=unsubscribe&email={quote(email)}"


def build_fixtures_html(nombre: str, email: str, matches: list[dict]) -> str:
    if matches:
        cards = ""
        for m in matches:
            condition = "Local" if m["home"] else "Visitante"
            date_str = format_date_es(m["date"])
            info_parts = [date_str]
            if m["time"]:
                info_parts.append(m["time"])
            if m["venue"]:
                info_parts.append(m["venue"])
            info_parts.append(condition)
            cards += f"""
            <div class="match-card">
              <div class="match-cat">{m['category']}</div>
              <div class="match-vs">CLT vs {m['opponent']}</div>
              <div class="match-info">{" · ".join(info_parts)}</div>
            </div>"""
        body = cards
    else:
        body = '<p class="no-matches">No hay partidos confirmados para este fin de semana.</p>'

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{STYLE}</style></head>
<body><div class="wrap">
  <div class="header">
    <p class="header-title">CLT Fútbol</p>
    <p class="header-sub">Este fin de semana juega el CLT</p>
  </div>
  <div class="gold-line"></div>
  <div class="content">
    <p style="color:#3A1A1A;font-size:15px;">Hola {nombre}, este finde el CLT tiene partidos. ¡A alentar!</p>
    <p class="section-title">Partidos del fin de semana</p>
    {body}
    <div class="cta"><a href="https://www.cltfutbol.com.uy/actualidad">Ver todos los próximos partidos</a></div>
  </div>
  <div class="footer">
    Carrasco Lawn Tennis · Liga Universitaria de Uruguay<br>
    <a href="https://www.cltfutbol.com.uy" style="color:#6B2D2D;">cltfutbol.com.uy</a><br><br>
    <a href="{unsubscribe_url(email)}" style="color:#aaa;">Darme de baja</a>
  </div>
</div></body></html>"""


def build_results_html(nombre: str, email: str, results: list[dict]) -> str:
    if results:
        cards = ""
        for r in results:
            condition = "Local" if r["home"] else "Visitante"
            date_str = format_date_es(r["date"])
            cards += f"""
            <div class="result-card" style="border-left: 4px solid {'#16a34a' if r['result']=='Victoria' else '#ca8a04' if r['result']=='Empate' else '#dc2626'}">
              <div class="match-cat">{r['category']}</div>
              <div class="result-score">{r['emoji']} CLT {r['score_clt']} – {r['score_opp']} {r['opponent']}</div>
              <div class="result-cat">{r['result']} · {date_str} · {condition}</div>
            </div>"""
        body = cards
    else:
        body = '<p class="no-matches">No se encontraron resultados recientes.</p>'

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{STYLE}</style></head>
<body><div class="wrap">
  <div class="header">
    <p class="header-title">CLT Fútbol</p>
    <p class="header-sub">Los resultados del fin de semana</p>
  </div>
  <div class="gold-line"></div>
  <div class="content">
    <p style="color:#3A1A1A;font-size:15px;">Hola {nombre}, acá van los resultados del CLT del fin de semana.</p>
    <p class="section-title">Resultados recientes</p>
    {body}
    <div class="cta"><a href="https://www.cltfutbol.com.uy/actualidad">Ver todos los resultados</a></div>
  </div>
  <div class="footer">
    Carrasco Lawn Tennis · Liga Universitaria de Uruguay<br>
    <a href="https://www.cltfutbol.com.uy" style="color:#6B2D2D;">cltfutbol.com.uy</a><br><br>
    <a href="{unsubscribe_url(email)}" style="color:#aaa;">Darme de baja</a>
  </div>
</div></body></html>"""


# ── Resend sender ─────────────────────────────────────────────────────────────

def send_email(api_key: str, to: str, subject: str, html: str, dry_run: bool) -> bool:
    if dry_run:
        print(f"[DRY RUN] To: {to} | Subject: {subject}")
        return True

    try:
        import requests as req_lib
        r = req_lib.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "from": FROM_EMAIL,
                "reply_to": REPLY_TO,
                "to": [to],
                "subject": subject,
                "html": html,
            },
            timeout=15,
        )
        if not r.ok:
            print(f"  ERROR sending to {to}: {r.status_code} {r.text}", file=sys.stderr)
        return r.ok
    except Exception as e:
        print(f"  ERROR sending to {to}: {e}", file=sys.stderr)
        return False


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixtures", action="store_true", help="Send upcoming fixtures email")
    parser.add_argument("--results", action="store_true", help="Send results email")
    parser.add_argument("--dry-run", action="store_true", help="Print without sending")
    args = parser.parse_args()

    if not args.fixtures and not args.results:
        parser.error("Specify --fixtures or --results")

    import os
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key and not args.dry_run:
        sys.exit("ERROR: RESEND_API_KEY not set")

    print("Loading subscribers...")
    subscribers = load_subscribers()
    print(f"  {len(subscribers)} subscribers found")

    print("Loading fixtures...")
    fixtures = load_fixtures()

    if args.fixtures:
        matches = get_weekend_matches(fixtures)
        print(f"  {len(matches)} weekend matches found")
        subject = f"⚽ Este finde juega el CLT — {len(matches)} partido{'s' if len(matches) != 1 else ''}"
        if not matches:
            subject = "⚽ Próximos partidos del CLT"

    if args.results:
        results = get_recent_results(fixtures)
        print(f"  {len(results)} recent results found")
        subject = f"📊 Resultados del CLT — {len(results)} partido{'s' if len(results) != 1 else ''}"
        if not results:
            subject = "📊 Resultados del CLT"

    sent = 0
    failed = 0
    for sub in subscribers:
        email = sub.get("email", "").strip()
        nombre = sub.get("nombre", "").strip() or "hincha"
        if not email:
            continue

        if args.fixtures:
            html = build_fixtures_html(nombre, email, matches)
        else:
            html = build_results_html(nombre, email, results)

        ok = send_email(api_key, email, subject, html, args.dry_run)
        if ok:
            sent += 1
        else:
            failed += 1

    print(f"\nDone. Sent: {sent}, Failed: {failed}")
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
