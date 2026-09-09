"""
Newsletter sender for CLT Fútbol.

Modes:
  --fixtures   Send upcoming weekend matches (run on Fridays)
  --results    Send recent match results (run on Tuesdays)
  --resume     Send whatever was left pending by an earlier batch
  --dry-run    Print emails to stdout without sending
"""

import argparse
import json
import sys
import time
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from newsletter_common import (SEND_DELAY_SECONDS, SEND_OK, SEND_QUOTA,
                               load_subscribers, send_email, unsubscribe_url)

DATA_DIR = Path(__file__).parent.parent / "frontend" / "public" / "data"


# ── Data loading ──────────────────────────────────────────────────────────────


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

def get_upcoming_matches(fixtures: dict) -> list[dict]:
    """Return upcoming matches from the coming Saturday through the next Friday.

    El email sale los viernes, así que la ventana cubre los 7 días hasta el
    próximo envío: ningún partido queda sin anunciar ni se anuncia dos veces.
    Antes la ventana era solo sábado/domingo/lunes y se perdían categorías que
    juegan entre semana (Más 48 los martes, Sub-14 algunos miércoles).
    """
    today = date.today()
    # Find coming Saturday (from Friday, that's tomorrow)
    days_to_sat = (5 - today.weekday()) % 7
    if days_to_sat == 0:
        days_to_sat = 7  # if today is Saturday, get next one
    next_sat = today + timedelta(days=days_to_sat)
    upcoming_dates = {
        (next_sat + timedelta(days=offset)).isoformat()
        for offset in range(7)  # sábado a viernes
    }

    matches = []
    for cat in fixtures.get("categories", []):
        for m in cat.get("matches", []):
            if m.get("played") or m.get("tentative"):
                continue
            if m["date"] not in upcoming_dates:
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
    """Return played matches from the last 7 days (martes to martes)."""
    results = []
    for cat in fixtures.get("categories", []):
        for m in cat.get("matches", []):
            if not m.get("played"):
                continue
            if m.get("score_home") is None or m.get("score_away") is None:
                continue
            d = -days_from_today(m["date"])  # positive = past
            if d < 0 or d > 7:
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

def fixtures_wording(matches: list[dict]) -> tuple[str, str, str]:
    """Textos del email según si los partidos son solo del finde o de la semana.

    (subtítulo del header, frase del saludo, título de la sección)
    """
    if matches and all(date.fromisoformat(m["date"]).weekday() >= 5 for m in matches):
        return ("Este fin de semana juega el CLT",
                "este finde el CLT tiene partidos",
                "Partidos del fin de semana")
    return ("Los próximos partidos del CLT",
            "estos son los partidos que se vienen",
            "Próximos partidos")


def build_fixtures_html(nombre: str, email: str, matches: list[dict]) -> str:
    header_sub, greeting, section_title = fixtures_wording(matches)

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
        body = '<p class="no-matches">No hay partidos confirmados para los próximos días.</p>'

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{STYLE}</style></head>
<body><div class="wrap">
  <div class="header">
    <p class="header-title">CLT Fútbol</p>
    <p class="header-sub">{header_sub}</p>
  </div>
  <div class="gold-line"></div>
  <div class="content">
    <p style="color:#3A1A1A;font-size:15px;">Hola {nombre}, {greeting}. ¡A alentar!</p>
    <p class="section-title">{section_title}</p>
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
    <p class="header-sub">Los resultados de la semana</p>
  </div>
  <div class="gold-line"></div>
  <div class="content">
    <p style="color:#3A1A1A;font-size:15px;">Hola {nombre}, acá van los resultados del CLT de esta semana.</p>
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


# ── Cola de pendientes ────────────────────────────────────────────────────────

# El plan gratuito de Resend corta a los 100 emails por día (día calendario UTC,
# o sea 21:00 hora de Uruguay). Cuando la lista no entra en un solo día, el envío
# se detiene al tocar el techo y guarda acá a quién le falta. El workflow
# "newsletter_drain.yml" reintenta más tarde con --resume y drena lo que quedó
# en cuanto el cupo se renueva.
#
# Antes de esto, si la lista pasaba de 100 el script mandaba a 100 elegidos al
# azar y el resto no recibía nada, sin aviso. Ahora nadie queda afuera y nadie
# recibe el mail dos veces.
QUEUE_FILE = Path(__file__).parent / "newsletter_queue.json"

# Si la cola no se pudo drenar en este plazo se descarta: no tiene sentido mandar
# "los partidos de este finde" cuando el finde ya pasó. 20h alcanza para que los
# reintentos de newsletter_drain.yml (22:30 a 04:30 UY) entren cómodos, y deja un
# intento posterior que encuentra la cola vencida y hace fallar el workflow para
# que llegue el aviso.
QUEUE_MAX_AGE_HOURS = 20


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def save_queue(kind: str, subject: str, items: list[dict], pending: list[dict],
               created_at: str | None = None) -> None:
    """Persist who still needs this newsletter, plus what to send them.

    The matches/results are stored alongside the addresses on purpose: the retry
    runs hours later, and by then fixtures_live.json may have changed (a match
    got played). Everyone must receive the same email, not a recalculated one.
    """
    QUEUE_FILE.write_text(
        json.dumps({
            "kind": kind,
            "subject": subject,
            "created_at": created_at or _now_utc().isoformat(timespec="seconds"),
            "items": items,
            "pending": [
                {"email": (p.get("email") or "").strip(),
                 "nombre": (p.get("nombre") or "").strip()}
                for p in pending
            ],
        }, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )


def load_queue() -> dict | None:
    if not QUEUE_FILE.exists():
        return None
    try:
        q = json.loads(QUEUE_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as e:
        print(f"WARN: cola ilegible ({e}) — se descarta.", file=sys.stderr)
        clear_queue()
        return None
    return q if q.get("pending") else None


def clear_queue() -> None:
    QUEUE_FILE.unlink(missing_ok=True)


def queue_age_hours(q: dict) -> float:
    try:
        created = datetime.fromisoformat(q["created_at"])
    except (KeyError, TypeError, ValueError):
        return float("inf")  # sin fecha válida = tratarla como vencida
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return (_now_utc() - created).total_seconds() / 3600


def send_batch(api_key: str, kind: str, subject: str, items: list[dict],
               recipients: list[dict], dry_run: bool) -> tuple[int, int, list[dict]]:
    """Send one newsletter to each recipient, stopping at the daily cap.

    Returns (sent, failed, pending): `pending` are the recipients never reached
    because the quota ran out — the caller queues them for the retry run.
    """
    sent = failed = 0
    for i, person in enumerate(recipients):
        email = (person.get("email") or "").strip()
        if not email:
            continue
        nombre = (person.get("nombre") or "").strip() or "hincha"

        if kind == "fixtures":
            html = build_fixtures_html(nombre, email, items)
        else:
            html = build_results_html(nombre, email, items)

        if i > 0 and not dry_run:
            time.sleep(SEND_DELAY_SECONDS)

        status = send_email(api_key, email, subject, html, dry_run)

        if status == SEND_QUOTA:
            pending = recipients[i:]
            print(f"\n  [CUPO] Límite diario de Resend alcanzado tras {sent} envíos. "
                  f"Quedan {len(pending)} para la próxima tanda.", file=sys.stderr)
            return sent, failed, pending

        if status == SEND_OK:
            sent += 1
        else:
            failed += 1

    return sent, failed, []


def run_resume(api_key: str, dry_run: bool) -> None:
    """Drain whatever an earlier batch left pending, if the quota allows now."""
    q = load_queue()
    if not q:
        print("No hay envíos pendientes. Nada que hacer.")
        return

    pending = q["pending"]
    age = queue_age_hours(q)
    if age > QUEUE_MAX_AGE_HOURS:
        clear_queue()
        sys.exit(f"ERROR: la tanda '{q.get('kind')}' quedó {age:.0f}h sin enviar y ya "
                 f"no es actual. Se descartó sin llegar a {len(pending)} suscriptores. "
                 f"Revisá el cupo diario de Resend — probablemente haya que migrar de plan.")

    print(f"Retomando tanda '{q.get('kind')}' de hace {age:.1f}h — {len(pending)} pendientes")
    sent, failed, still = send_batch(api_key, q["kind"], q["subject"], q["items"],
                                    pending, dry_run)

    if dry_run:
        print(f"\n[DRY RUN] Enviados: {sent}, Fallidos: {failed}, Pendientes: {len(still)}")
        return

    if still:
        save_queue(q["kind"], q["subject"], q["items"], still, created_at=q.get("created_at"))
        print(f"\nEnviados: {sent}, Fallidos: {failed}. Quedan {len(still)} para el "
              f"próximo intento.")
    else:
        clear_queue()
        print(f"\nEnviados: {sent}, Fallidos: {failed}. Tanda completa, cola vacía.")

    if failed > 0:
        sys.exit(1)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixtures", action="store_true", help="Send upcoming fixtures email")
    parser.add_argument("--results", action="store_true", help="Send results email")
    parser.add_argument("--dry-run", action="store_true", help="Print without sending")
    parser.add_argument("--test", action="store_true", help="Send only to tomas.sanz00@gmail.com")
    parser.add_argument("--only", default="", help="Comma-separated emails to limit sending to (case-insensitive)")
    parser.add_argument("--resume", action="store_true",
                        help="Enviar los pendientes que dejó una tanda anterior por falta de cupo")
    args = parser.parse_args()

    if args.resume:
        if args.fixtures or args.results:
            parser.error("--resume no se combina con --fixtures/--results: "
                         "la cola ya sabe qué mandar")
    elif not args.fixtures and not args.results:
        parser.error("Specify --fixtures or --results")

    import os
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key and not args.dry_run:
        sys.exit("ERROR: RESEND_API_KEY not set")

    if args.resume:
        run_resume(api_key, args.dry_run)
        return

    # Primero mirar si hay algo para contar; si no lo hay, no se envía nada
    # (y ni siquiera se consulta la lista de suscriptores).
    print("Loading fixtures...")
    fixtures = load_fixtures()

    if args.fixtures:
        matches = get_upcoming_matches(fixtures)
        print(f"  {len(matches)} upcoming matches found")
        if not matches:
            # Parate de fútbol o semana libre: no molestar a los suscriptores.
            print("No hay partidos en los próximos 7 días — no se envía ningún email.")
            return
        # Build a personalized subject mentioning the main rival of the weekend
        main_match = next((m for m in matches if "may" in m["category"].lower()), matches[0])
        subject = f"El CLT juega vs {main_match['opponent']} este {format_date_es(main_match['date']).split()[0]}"

    if args.results:
        results = get_recent_results(fixtures)
        print(f"  {len(results)} recent results found")
        if not results:
            print("No hay resultados esta semana — no se envía ningún email.")
            return
        wins = sum(1 for r in results if r['result'] == 'Victoria')
        subject = f"Resultados del CLT: {wins} victoria{'s' if wins != 1 else ''} esta semana"

    print("Loading subscribers...")
    subscribers = load_subscribers()
    if args.test:
        subscribers = [{"email": "tomas.sanz00@gmail.com", "nombre": "Tomas", "apellido": "Sanz", "rol": "Jugador"}]
        print("  [TEST] Sending only to tomas.sanz00@gmail.com")
    elif args.only:
        only_set = {e.strip().lower() for e in args.only.split(",") if e.strip()}
        subscribers = [s for s in subscribers if s.get("email", "").strip().lower() in only_set]
        print(f"  [ONLY] {len(subscribers)} of {len(only_set)} requested emails matched in subscribers")
    else:
        print(f"  {len(subscribers)} subscribers found")

    # Modos manuales de depuración: no tocan la cola.
    manual = args.test or bool(args.only)

    stale = load_queue()
    if stale and not manual:
        print(f"WARN: había una tanda '{stale.get('kind')}' con {len(stale['pending'])} "
              f"pendientes de hace {queue_age_hours(stale):.0f}h; se reemplaza por esta.",
              file=sys.stderr)

    kind = "fixtures" if args.fixtures else "results"
    items = matches if args.fixtures else results

    sent, failed, pending = send_batch(api_key, kind, subject, items, subscribers,
                                       args.dry_run)

    print(f"\nDone. Sent: {sent}, Failed: {failed}")

    if pending:
        if args.dry_run or manual:
            print(f"ATENCIÓN: {len(pending)} sin enviar por cupo. No se encolan en modo "
                  f"test/only/dry-run.", file=sys.stderr)
        else:
            save_queue(kind, subject, items, pending)
            print(f"Quedaron {len(pending)} pendientes por el cupo diario: guardados en "
                  f"{QUEUE_FILE.name}, se envían solos cuando el cupo se renueve.")
    elif not manual and not args.dry_run:
        clear_queue()

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
