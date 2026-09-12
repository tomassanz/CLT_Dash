"""
Sends a weekly subscriber count alert to tomas.sanz00@gmail.com.
Runs every Friday before the fixtures newsletter.
"""

import json
import os
import sys
from datetime import date, datetime, timezone
from pathlib import Path

from newsletter_common import FROM_EMAIL, load_subscribers

# La cola de pendientes del último envío (la deja send_newsletter.py cuando se
# agota el cupo diario). El monitor la lee para reportar si quedó algo sin salir.
QUEUE_FILE = Path(__file__).parent / "newsletter_queue.json"

TO_EMAIL = "tomas.sanz00@gmail.com"


# Con la cola de pendientes (newsletter_queue.json) el techo diario de Resend ya
# no corta el envío: si la lista no entra en un día, se drena al día siguiente.
# La pared real pasó a ser el cupo MENSUAL.
RESEND_DAILY_LIMIT = 100
RESEND_MONTHLY_LIMIT = 3000

# Dos envíos por semana ≈ 8.7 envíos por mes a cada suscriptor.
SENDS_PER_SUBSCRIBER_PER_MONTH = 8.7

# Avisos sobre el cupo mensual: amarillo al 70%, rojo al 85%.
WARN_MONTHLY_PCT = 70
ALERT_MONTHLY_PCT = 85

# Hora del primer reintento de newsletter_drain.yml (cupo de Resend se renueva
# a las 21:00 UY). Solo para nombrarla en el mail.
DRAIN_TIME_UY = "21:15"


def read_queue() -> tuple[int, float] | None:
    """(pendientes, horas desde que se creó) de la cola, o None si no hay."""
    if not QUEUE_FILE.exists():
        return None
    try:
        q = json.loads(QUEUE_FILE.read_text(encoding="utf-8"))
        pending = len(q.get("pending") or [])
        if not pending:
            return None
        created = datetime.fromisoformat(q["created_at"])
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        age = (datetime.now(timezone.utc) - created).total_seconds() / 3600
        return pending, age
    except Exception:
        return None

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

    # Cuántas tandas necesita un envío (el cupo diario ya no corta el envío: la
    # cola de pendientes lo drena al día siguiente, solo tarda más en llegar).
    tandas = max(1, -(-total // RESEND_DAILY_LIMIT))

    # La pared real: el cupo mensual.
    monthly_used = round(total * SENDS_PER_SUBSCRIBER_PER_MONTH)
    capacity_pct = round(monthly_used / RESEND_MONTHLY_LIMIT * 100)
    max_subs = int(RESEND_MONTHLY_LIMIT / SENDS_PER_SUBSCRIBER_PER_MONTH)

    if capacity_pct >= ALERT_MONTHLY_PCT:
        alert_html = f"""
    <div style="background:#fee;border-left:4px solid #dc2626;padding:14px 18px;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0;color:#dc2626;font-weight:bold;font-size:14px;">⚠️ Atención: cerca del límite mensual</p>
      <p style="margin:6px 0 0;color:#3A1A1A;font-size:13px;">
        Con {total} suscriptores son unos {monthly_used} emails por mes: {capacity_pct}% del
        cupo de Resend ({RESEND_MONTHLY_LIMIT}/mes). El techo está en ~{max_subs} suscriptores.
        Hora de migrar a Brevo (gratis, 9.000/mes) o pasar a Resend Pro ($20/mes).
      </p>
    </div>"""
    elif capacity_pct >= WARN_MONTHLY_PCT:
        alert_html = f"""
    <div style="background:#fef3c7;border-left:4px solid #ca8a04;padding:14px 18px;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0;color:#ca8a04;font-weight:bold;font-size:14px;">📈 Crecimiento alto</p>
      <p style="margin:6px 0 0;color:#3A1A1A;font-size:13px;">
        {capacity_pct}% del cupo mensual usado (~{monthly_used} de {RESEND_MONTHLY_LIMIT}).
        El techo está en ~{max_subs} suscriptores: conviene ir planificando la migración.
      </p>
    </div>"""
    else:
        alert_html = ""

    tandas_html = ""
    if tandas > 1:
        tandas_html = f"""
    <div style="background:#eef6ff;border-left:4px solid #2563eb;padding:12px 18px;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0;color:#3A1A1A;font-size:13px;">
        ℹ️ El envío ya no entra en un día: sale en <b>{tandas} tandas</b> de hasta
        {RESEND_DAILY_LIMIT}. El cupo de Resend se renueva a las <b>21:00</b> de Uruguay,
        así que los que quedan pendientes reciben el mail a las <b>{DRAIN_TIME_UY}</b> de
        esa misma noche. Es automático, no hay que hacer nada.
      </p>
    </div>"""

    # Estado de la cola: si el último envío dejó gente sin recibir, decirlo.
    queue = read_queue()
    if queue:
        pending, age = queue
        if age > 20:
            cola_html = f"""
    <div style="background:#fee;border-left:4px solid #dc2626;padding:12px 18px;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0;color:#dc2626;font-weight:bold;font-size:14px;">🚨 Quedaron {pending} sin recibir</p>
      <p style="margin:6px 0 0;color:#3A1A1A;font-size:13px;">
        El último envío dejó {pending} pendientes hace {age:.0f} horas y ya no se van a
        mandar (el mail quedó viejo). El cupo no alcanzó ni con dos días: hay que migrar
        de plan o de proveedor.
      </p>
    </div>"""
        else:
            cola_html = f"""
    <div style="background:#fef3c7;border-left:4px solid #ca8a04;padding:12px 18px;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0;color:#3A1A1A;font-size:13px;">
        ⏳ Hay <b>{pending} pendientes</b> del último envío (de hace {age:.0f}h). Salen
        solos a las {DRAIN_TIME_UY}, cuando se renueva el cupo. No hay que hacer nada.
      </p>
    </div>"""
    else:
        cola_html = """
    <div style="background:white;border-left:4px solid #16a34a;padding:12px 18px;border-radius:8px;margin-bottom:20px;">
      <p style="margin:0;color:#3A1A1A;font-size:13px;">
        ✅ Sin pendientes: el último envío llegó a todos.
      </p>
    </div>"""

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
    {alert_html}{tandas_html}{cola_html}
    <div style="background:white;border-radius:12px;padding:24px;text-align:center;margin-bottom:20px;">
      <div style="font-size:48px;font-weight:bold;color:#6B2D2D;">{total}</div>
      <div style="font-size:14px;color:#888;margin-top:4px;">suscriptores activos</div>
      <div style="font-size:11px;color:#aaa;margin-top:8px;">~{monthly_used} emails/mes · {capacity_pct}% del cupo de Resend ({RESEND_MONTHLY_LIMIT}/mes)</div>
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
