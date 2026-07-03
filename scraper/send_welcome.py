"""
Sends a welcome email to new newsletter subscribers.

Runs hourly via GitHub Actions (newsletter_welcome.yml). Tracks who already
got the welcome in welcomed_emails.json (committed to the repo).

First run behavior: if welcomed_emails.json doesn't exist yet, all current
subscribers are recorded WITHOUT emailing them, so only people who subscribe
after this feature ships receive the welcome.

Modes:
  --dry-run    Print emails to stdout without sending
"""

import argparse
import json
import os
import sys
import time
from datetime import date
from pathlib import Path

from newsletter_common import SEND_DELAY_SECONDS, load_subscribers, send_email, unsubscribe_url

STATE_FILE = Path(__file__).parent / "welcomed_emails.json"
SITE_URL = "https://www.cltfutbol.com.uy"


def build_welcome_html(nombre: str, email: str) -> str:
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#FAF6F1;font-family:Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;background:#FAF6F1;">
  <div style="background:#6B2D2D;padding:24px 32px;">
    <p style="color:#D4A843;font-size:20px;font-weight:bold;margin:0;">CLT Fútbol</p>
    <p style="color:#ffffff99;font-size:13px;margin:4px 0 0;">¡Bienvenido al newsletter!</p>
  </div>
  <div style="height:3px;background:#D4A843;"></div>
  <div style="padding:28px 32px;">
    <p style="color:#3A1A1A;font-size:15px;margin:0 0 16px;">
      Hola {nombre}, ¡gracias por sumarte! Ya sos parte de la comunidad del fútbol del Carrasco Lawn Tennis.
    </p>
    <p style="color:#6B2D2D;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;border-bottom:1px solid #D4A84333;padding-bottom:8px;">Qué vas a recibir</p>
    <div style="background:white;border-radius:10px;padding:14px 16px;margin-bottom:10px;border-left:4px solid #6B2D2D;">
      <div style="font-size:14px;font-weight:bold;color:#3A1A1A;">📅 Los viernes</div>
      <div style="font-size:13px;color:#666;margin-top:4px;">Los partidos del CLT del fin de semana: hora, cancha y rival de cada categoría.</div>
    </div>
    <div style="background:white;border-radius:10px;padding:14px 16px;margin-bottom:10px;border-left:4px solid #D4A843;">
      <div style="font-size:14px;font-weight:bold;color:#3A1A1A;">⚽ Los martes</div>
      <div style="font-size:13px;color:#666;margin-top:4px;">Todos los resultados de la semana, de Mayores a Sub-14.</div>
    </div>
    <p style="color:#3A1A1A;font-size:14px;margin:20px 0 0;">
      Mientras tanto, podés explorar la historia completa del club — más de 2.000 partidos desde 2003 — en el sitio:
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="{SITE_URL}" style="background:#6B2D2D;color:#D4A843;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;font-size:14px;">Visitar cltfutbol.com.uy</a>
    </div>
  </div>
  <div style="text-align:center;padding:20px 32px;color:#999;font-size:11px;border-top:1px solid #E8DDD0;">
    Carrasco Lawn Tennis · Liga Universitaria de Uruguay<br>
    <a href="{SITE_URL}" style="color:#6B2D2D;">cltfutbol.com.uy</a><br><br>
    <a href="{unsubscribe_url(email)}" style="color:#aaa;">Darme de baja</a>
  </div>
</div>
</body></html>"""


def load_state() -> set[str] | None:
    if not STATE_FILE.exists():
        return None
    return {e.strip().lower() for e in json.loads(STATE_FILE.read_text(encoding="utf-8"))}


def save_state(welcomed: set[str]) -> None:
    STATE_FILE.write_text(
        json.dumps(sorted(welcomed), indent=1, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Print without sending")
    args = parser.parse_args()

    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key and not args.dry_run:
        sys.exit("ERROR: RESEND_API_KEY not set")

    print("Loading subscribers...")
    subscribers = load_subscribers()
    print(f"  {len(subscribers)} subscribers found")

    welcomed = load_state()
    if welcomed is None:
        # First run: seed the state with everyone already subscribed, no emails.
        if args.dry_run:
            print(f"[DRY RUN] Would seed {STATE_FILE.name} with {len(subscribers)} existing subscribers.")
            return
        save_state({s["email"].strip().lower() for s in subscribers})
        print(f"Seeded {STATE_FILE.name} with {len(subscribers)} existing subscribers — no emails sent.")
        return

    new_subs = [s for s in subscribers if s["email"].strip().lower() not in welcomed]
    if not new_subs:
        print("No new subscribers. Nothing to do.")
        return

    sent = 0
    failed = 0
    for i, sub in enumerate(new_subs):
        email = sub["email"].strip()
        nombre = sub.get("nombre", "").strip() or "hincha"
        if i > 0 and not args.dry_run:
            time.sleep(SEND_DELAY_SECONDS)
        html = build_welcome_html(nombre, email)
        ok = send_email(api_key, email, "¡Bienvenido a CLT Fútbol! ⚽", html, args.dry_run)
        if ok:
            sent += 1
        else:
            failed += 1
            print(f"  WARN: welcome to {email} failed — marked as welcomed anyway "
                  f"(won't retry to avoid loops)", file=sys.stderr)
        # Mark regardless of outcome so a permanently-failing address doesn't
        # get retried every hour forever.
        welcomed.add(email.lower())

    if not args.dry_run:
        save_state(welcomed)
    print(f"\nDone. Welcomed: {sent}, Failed: {failed}")


if __name__ == "__main__":
    main()
