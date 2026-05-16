"""
Sends a weekly subscriber count alert to tomas.sanz00@gmail.com.
Runs every Friday before the fixtures newsletter.
"""

import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import date

SUBSCRIBERS_URL = "https://script.google.com/macros/s/AKfycbyaiac7v3g21NgLZ9cZK7xISffYOIhuJHW7xIA0Rrju2IjMBmh7dVThsabM2MNuyO7o1g/exec"
FROM_EMAIL = "CLT Fútbol <noticias@cltfutbol.com.uy>"
TO_EMAIL = "tomas.sanz00@gmail.com"


def load_subscribers() -> list[dict]:
    api_key = os.environ.get("SUBSCRIBERS_API_KEY", "")
    if not api_key:
        sys.exit("ERROR: SUBSCRIBERS_API_KEY not set")
    url = f"{SUBSCRIBERS_URL}?key={urllib.parse.quote(api_key)}"
    with urllib.request.urlopen(url, timeout=15) as r:
        raw = json.loads(r.read())
    if isinstance(raw, dict) and raw.get("error"):
        sys.exit(f"ERROR: API rejected request ({raw['error']}) — verificá SUBSCRIBERS_API_KEY")
    seen = set()
    unique = []
    for sub in raw:
        email = sub.get("email", "").strip().lower()
        if email and email not in seen:
            seen.add(email)
            unique.append(sub)
    return unique


RESEND_DAILY_LIMIT = 100

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

    # Alerta de capacidad
    capacity_pct = round(total / RESEND_DAILY_LIMIT * 100)
    if total >= 90:
        alert_html = f"""
    <div style="background:#fee;border-left:4px solid #dc2626;padding:14px 18px;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0;color:#dc2626;font-weight:bold;font-size:14px;">⚠️ Atención: cerca del límite</p>
      <p style="margin:6px 0 0;color:#3A1A1A;font-size:13px;">
        Estás usando {capacity_pct}% del límite diario de Resend ({total}/{RESEND_DAILY_LIMIT}).
        Tiempo de buscar alternativa o pasar a plan pago ($20/mes por 50k mails).
      </p>
    </div>"""
    elif total >= 75:
        alert_html = f"""
    <div style="background:#fef3c7;border-left:4px solid #ca8a04;padding:14px 18px;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0;color:#ca8a04;font-weight:bold;font-size:14px;">📈 Crecimiento alto</p>
      <p style="margin:6px 0 0;color:#3A1A1A;font-size:13px;">
        {capacity_pct}% del límite diario usado ({total}/{RESEND_DAILY_LIMIT}). Empezar a pensar en alternativas.
      </p>
    </div>"""
    else:
        alert_html = ""

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
    {alert_html}
    <div style="background:white;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;">
      <div style="font-size:48px;font-weight:bold;color:#6B2D2D;">{total}</div>
      <div style="font-size:14px;color:#888;margin-top:4px;">suscriptores activos</div>
      <div style="font-size:11px;color:#aaa;margin-top:8px;">{capacity_pct}% del límite diario ({total}/{RESEND_DAILY_LIMIT})</div>
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
                "subject": f"CLT · {len(subscribers)} suscriptores al {date.today().strftime('%d/%m')}",
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
