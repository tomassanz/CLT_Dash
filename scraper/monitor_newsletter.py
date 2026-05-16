"""
Sends a weekly subscriber count alert to tomas.sanz00@gmail.com.
Runs every Friday before the fixtures newsletter.
"""

import json
import os
import sys
import urllib.request
from datetime import date

SUBSCRIBERS_URL = "https://script.google.com/macros/s/AKfycby-BSwDW-HVyXb6wVHXlwjY99nSsWI7lAE-d0bmJgJOBtRji1NKJwtDAG9UQu72pgMqmA/exec"
FROM_EMAIL = "CLT Fútbol <noticias@cltfutbol.com.uy>"
TO_EMAIL = "tomas.sanz00@gmail.com"


def load_subscribers() -> list[dict]:
    with urllib.request.urlopen(SUBSCRIBERS_URL, timeout=15) as r:
        raw = json.loads(r.read())
    seen = set()
    unique = []
    for sub in raw:
        email = sub.get("email", "").strip().lower()
        if email and email not in seen:
            seen.add(email)
            unique.append(sub)
    return unique


def build_html(subscribers: list[dict]) -> str:
    total = len(subscribers)
    today = date.today()
    date_str = today.strftime("%d/%m/%Y")

    by_rol = {}
    for sub in subscribers:
        rol = sub.get("rol") or "Sin especificar"
        by_rol[rol] = by_rol.get(rol, 0) + 1

    rol_rows = ""
    for rol, count in sorted(by_rol.items(), key=lambda x: -x[1]):
        pct = round(count / total * 100) if total else 0
        rol_rows += f"""
        <tr>
          <td style="padding:6px 12px;color:#3A1A1A;">{rol}</td>
          <td style="padding:6px 12px;text-align:right;font-weight:bold;color:#6B2D2D;">{count}</td>
          <td style="padding:6px 12px;text-align:right;color:#888;">{pct}%</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#FAF6F1;font-family:Arial,sans-serif;">
<div style="max-width:480px;margin:0 auto;background:#FAF6F1;">
  <div style="background:#6B2D2D;padding:24px 32px;">
    <p style="color:#D4A843;font-size:18px;font-weight:bold;margin:0;">CLT Fútbol · Monitor</p>
    <p style="color:#ffffff80;font-size:13px;margin:4px 0 0;">Reporte semanal de suscriptores</p>
  </div>
  <div style="height:3px;background:#D4A843;"></div>
  <div style="padding:28px 32px;">
    <p style="color:#888;font-size:12px;margin:0 0 16px;">{date_str}</p>
    <div style="background:white;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;">
      <div style="font-size:48px;font-weight:bold;color:#6B2D2D;">{total}</div>
      <div style="font-size:14px;color:#888;margin-top:4px;">suscriptores activos</div>
    </div>
    <p style="color:#6B2D2D;font-size:12px;font-weight:bold;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">Por rol</p>
    <table style="width:100%;background:white;border-radius:10px;border-collapse:collapse;overflow:hidden;">
      {rol_rows}
    </table>
    <p style="color:#aaa;font-size:11px;text-align:center;margin-top:20px;">
      Este reporte se envía automáticamente cada viernes antes del newsletter.
    </p>
  </div>
</div>
</body></html>"""


def main():
    api_key = os.environ.get("RESEND_API_KEY", "")
    if not api_key:
        sys.exit("ERROR: RESEND_API_KEY not set")

    print("Loading subscribers...")
    subscribers = load_subscribers()
    print(f"  {len(subscribers)} subscribers found")

    html = build_html(subscribers)

    try:
        import requests
        r = requests.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "from": FROM_EMAIL,
                "to": [TO_EMAIL],
                "subject": f"📋 CLT Newsletter — {len(subscribers)} suscriptores",
                "html": html,
            },
            timeout=15,
        )
        if r.ok:
            print(f"Monitor email sent to {TO_EMAIL}")
        else:
            print(f"ERROR: {r.status_code} {r.text}", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
