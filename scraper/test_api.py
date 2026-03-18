"""
test_api.py — Reconocimiento de la API de la Liga Universitaria

Corre esto ANTES de escribir el extractor definitivo.
Valida: estructura de respuestas, nombres de campos, casos borde, rate limit.
"""

import json
import time
import requests

BASE = "https://ligauniversitaria.org.uy/detallefechas/api.php"
SPORT = "FÚTBOL"
TEAM = "CARRASCO LAWN TENNIS"
session = requests.Session()

# ─── HTTP helper simple ────────────────────────────────────────────────────────

def get(params, label=""):
    try:
        r = session.get(BASE, params=params, timeout=20)
        print(f"  [{r.status_code}] {label or params}")
        if r.status_code == 200:
            try:
                return r.json()
            except Exception:
                print(f"    ⚠ Respuesta no es JSON: {r.text[:200]}")
                return None
        else:
            print(f"    ⚠ Body: {r.text[:200]}")
            return None
    except Exception as e:
        print(f"    ✗ Excepción: {e}")
        return None

def pp(obj, indent=4):
    print(json.dumps(obj, ensure_ascii=False, indent=indent))

# ─── Test 1: Rango de temporadas ──────────────────────────────────────────────

def test_seasons():
    print("\n" + "="*60)
    print("TEST 1: Rango de temporadas")
    print("="*60)

    for s in [113, 112, 111, 90, 89, 88]:
        data = get({"action": "cargarTorneos", "temporada": str(s), "deporte": SPORT},
                   label=f"cargarTorneos temporada={s}")
        if data:
            print(f"    → {len(data)} torneos | primero: {data[0] if data else 'vacío'}")
        else:
            print(f"    → Sin datos / vacío")
        time.sleep(0.3)

# ─── Test 2: Torneos y series de la temporada actual ─────────────────────────

def test_current_season():
    print("\n" + "="*60)
    print("TEST 2: Torneos y series — temporada 113 (actual)")
    print("="*60)

    torneos = get({"action": "cargarTorneos", "temporada": "112", "deporte": SPORT},
                  label="cargarTorneos 112")
    if not torneos:
        print("  ✗ Sin torneos para temporada 112")
        return None, None

    print(f"  → {len(torneos)} torneos:")
    for t in torneos:
        print(f"     • {t}")

    # Tomar el primer torneo y listar sus series
    primer_torneo = torneos[0].get("nombre") if isinstance(torneos[0], dict) else str(torneos[0])
    print(f"\n  Series del torneo '{primer_torneo}':")
    time.sleep(0.3)
    series = get({"action": "cargarSeries", "temporada": "112", "deporte": SPORT, "torneo": primer_torneo},
                 label=f"cargarSeries torneo={primer_torneo}")
    if series:
        for s in series:
            print(f"     • {s}")

    return primer_torneo, series

# ─── Test 3: Partidos de una fecha y estructura de campos ─────────────────────

def test_partidos(torneo, series):
    print("\n" + "="*60)
    print("TEST 3: Estructura de partidos y búsqueda de CLT")
    print("="*60)

    if not series:
        print("  ✗ Sin series para testear")
        return None

    # Buscar en las primeras series hasta encontrar CLT
    clt_match_id = None
    clt_side = None

    for s_item in series[:5]:
        serie = s_item.get("nombre") if isinstance(s_item, dict) else str(s_item)
        time.sleep(0.3)
        fechas = get({"action": "cargarFechas", "temporada": "112", "deporte": SPORT,
                      "torneo": torneo, "serie": serie},
                     label=f"cargarFechas serie={serie}")
        if not fechas:
            continue

        print(f"\n  Serie '{serie}': {len(fechas)} fechas | ejemplo: {fechas[0]}")

        # Revisar primera fecha
        first_fecha = fechas[0].get("fecha") if isinstance(fechas[0], dict) else fechas[0]
        time.sleep(0.3)
        partidos = get({"action": "cargarPartidos", "temporada": "112", "deporte": SPORT,
                        "torneo": torneo, "serie": serie, "fecha": str(first_fecha)},
                       label=f"cargarPartidos fecha={first_fecha}")
        if not partidos:
            continue

        print(f"  → {len(partidos)} partidos en fecha {first_fecha}")
        print(f"  Campos disponibles: {list(partidos[0].keys()) if partidos else '?'}")
        print(f"  Ejemplo partido:")
        pp(partidos[0])

        # Buscar CLT
        for p in partidos:
            loc = (p.get("Locatario") or "").strip().upper()
            vis = (p.get("Visitante") or "").strip().upper()
            if TEAM in loc or TEAM in vis:
                clt_match_id = p.get("ID")
                clt_side = "Locatario" if TEAM in loc else "Visitante"
                print(f"\n  ✓ CLT encontrado! ID={clt_match_id}, lado={clt_side}")
                print(f"  Partido completo:")
                pp(p)
                break

        if clt_match_id:
            break

    if not clt_match_id:
        print("  ℹ CLT no encontrado en las primeras fechas de las primeras series (normal)")

    return clt_match_id, clt_side

# ─── Test 4: Endpoints de detalle ────────────────────────────────────────────

def test_detail_endpoints(match_id, side):
    print("\n" + "="*60)
    print(f"TEST 4: Endpoints de detalle — match_id={match_id}, lado={side}")
    print("="*60)

    if not match_id:
        print("  ✗ Sin match_id — buscando uno manual en temporada 113...")
        # Intentar forzar búsqueda con una temporada conocida
        # (Si el test 3 no encontró CLT, podemos probar con un ID de los CSVs del usuario)
        print("  Tip: podés pasar un match_id manualmente editando este script.")
        return

    endpoints = [
        ("Titulares Locatario", "Locatario"),
        ("Titulares Visitante", "Visitante"),
        ("CambiosLocatario", "Locatario"),
        ("CambiosVisitante", "Visitante"),
        ("GolesLocatario", "Locatario"),
        ("GolesVisitante", "Visitante"),
        ("Amonestados Locatario", "Locatario"),
        ("Amonestados Visitante", "Visitante"),
        ("Expulsados Locatario", "Locatario"),
        ("Expulsados Visitante", "Visitante"),
    ]

    # Solo testear el lado de CLT primero
    clt_endpoints = [(a, s) for a, s in endpoints if s == side]

    for action, s in clt_endpoints:
        time.sleep(0.3)
        data = get({"action": action, "id": str(match_id)},
                   label=f"action='{action}' id={match_id}")
        if data is not None:
            print(f"  Tipo de respuesta: {type(data).__name__}")
            if isinstance(data, list):
                print(f"  → Lista con {len(data)} elementos")
                if data:
                    print(f"  Campos: {list(data[0].keys()) if isinstance(data[0], dict) else data[0]}")
                    print(f"  Primer elemento:")
                    pp(data[0])
            elif isinstance(data, dict):
                print(f"  → Dict con claves: {list(data.keys())}")
                pp(data)
            else:
                print(f"  → Valor: {data}")
        else:
            print(f"  → None / error")

# ─── Test 5: Casos borde ─────────────────────────────────────────────────────

def test_edge_cases():
    print("\n" + "="*60)
    print("TEST 5: Casos borde")
    print("="*60)

    # Temporada inexistente
    print("\n  a) Temporada inexistente (999):")
    data = get({"action": "cargarTorneos", "temporada": "999", "deporte": SPORT},
               label="temporada=999")
    print(f"     Respuesta: {data!r}")

    time.sleep(0.3)

    # Partido ID inexistente
    print("\n  b) match_id inexistente (99999999):")
    data = get({"action": "Titulares Locatario", "id": "99999999"},
               label="id=99999999")
    print(f"     Respuesta: {data!r}")

    time.sleep(0.3)

    # Sin parámetros
    print("\n  c) Sin parámetros:")
    data = get({}, label="sin params")
    print(f"     Respuesta: {data!r}")

# ─── Test 6: Rate limit ──────────────────────────────────────────────────────

def test_rate_limit():
    print("\n" + "="*60)
    print("TEST 6: Rate limit — 10 requests rápidas seguidas")
    print("="*60)

    errors = 0
    for i in range(10):
        r = session.get(BASE, params={"action": "cargarTorneos", "temporada": "113", "deporte": SPORT}, timeout=10)
        status = r.status_code
        if status != 200:
            errors += 1
        print(f"  req {i+1}: {status}")
        # Sin sleep intencional — queremos ver si hay rate limiting

    print(f"\n  Resultado: {10 - errors}/10 OK, {errors} errores")

# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    test_seasons()

    torneo, series = test_current_season()
    time.sleep(0.3)

    match_id, side = test_partidos(torneo, series) if torneo else (None, None)
    time.sleep(0.3)

    test_detail_endpoints(match_id, side)
    time.sleep(0.3)

    test_edge_cases()
    time.sleep(0.3)

    test_rate_limit()

    print("\n" + "="*60)
    print("Reconocimiento completo.")
    print("="*60)
