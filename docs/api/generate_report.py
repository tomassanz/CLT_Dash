"""
map_all_apis.py — Mapeo exhaustivo de TODAS las APIs de la Liga Universitaria

Propósito: Descubrir y documentar cada endpoint conocido y potencial de ambos sistemas.
Genera un reporte JSON con la estructura exacta de cada API.

Uso:
    python map_all_apis.py > api_map.json
"""

import json
import time
import requests
from typing import Any, Optional
from pathlib import Path

# ──────────────────────────────────────────────────────────────────────────────
# Config
# ──────────────────────────────────────────────────────────────────────────────

TIMEOUT = 15
THROTTLE_MS = 250  # ms entre requests

# Todas las posibles URLs base descubiertas
API_BASES = {
    "detallefechas": "https://ligauniversitaria.org.uy/detallefechas/api.php",
    "posiciones": "https://ligauniversitaria.org.uy/posiciones/api.php",
    "goleadores": "https://ligauniversitaria.org.uy/goleadores/api.php",
    "valla_menos_vencida": "https://ligauniversitaria.org.uy/valla_menos_vencida/api.php",
    "resultados": "https://ligauniversitaria.org.uy/resultados/api.php",
    "partidos": "https://ligauniversitaria.org.uy/partidos/api.php",
}

# Parámetros conocidos para descubrimiento
SAMPLE_SEASON = 112
SAMPLE_SPORT_OLD = "FÚTBOL"
SAMPLE_SPORT_NEW = "F"

# Un match_id real para probar endpoints de detalle
SAMPLE_MATCH_ID = 19  # muy viejo, pero debería existir

session = requests.Session()

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def throttle():
    """Rate limit simple"""
    time.sleep(THROTTLE_MS / 1000)

def fetch(url: str, params: dict, label: str = "") -> Optional[dict | list]:
    """GET con manejo de errores"""
    throttle()
    try:
        r = session.get(url, params=params, timeout=TIMEOUT)
        if r.status_code != 200:
            return {"_error": f"HTTP {r.status_code}"}
        try:
            return r.json()
        except:
            return {"_error": "JSON decode failed", "_body_preview": r.text[:200]}
    except requests.Timeout:
        return {"_error": "Timeout"}
    except Exception as e:
        return {"_error": f"{type(e).__name__}: {str(e)[:100]}"}

def analyze_response(data: Any) -> dict:
    """Analiza estructura de respuesta"""
    if data is None:
        return {"type": "null"}

    if isinstance(data, dict):
        if "_error" in data:
            return {"type": "error", "error": data["_error"]}
        return {
            "type": "object",
            "keys": list(data.keys()),
            "sample": {k: v for k, v in list(data.items())[:2]}
        }

    if isinstance(data, list):
        if len(data) == 0:
            return {"type": "empty_array"}
        item = data[0]
        if isinstance(item, dict):
            return {
                "type": "array_of_objects",
                "count": len(data),
                "item_keys": list(item.keys()),
                "sample_item": {k: v for k, v in list(item.items())[:3]}
            }
        else:
            return {
                "type": "array_of_scalars",
                "count": len(data),
                "sample": data[:3]
            }

    return {"type": type(data).__name__, "value": str(data)[:100]}

# ──────────────────────────────────────────────────────────────────────────────
# Discovery
# ──────────────────────────────────────────────────────────────────────────────

def test_base_urls():
    """Prueba si todas las URLs base existen"""
    print("\n🔍 [1/6] Probando URLs base...", end="", flush=True)
    result = {}

    for name, url in API_BASES.items():
        data = fetch(url, {}, label=f"base {name}")
        result[name] = {
            "url": url,
            "status": "❌ error" if "_error" in data else "✓ ok",
            "response": analyze_response(data)
        }

    print(" ✓")
    return result

def test_sistema_a():
    """Sistema A: detallefechas con parámetros de cascada"""
    print("🔍 [2/6] Probando Sistema A (detallefechas)...", end="", flush=True)
    url = API_BASES["detallefechas"]
    result = {}

    # Test: cargarTorneos
    data = fetch(url, {
        "action": "cargarTorneos",
        "temporada": SAMPLE_SEASON,
        "deporte": SAMPLE_SPORT_OLD
    })
    result["cargarTorneos"] = analyze_response(data)

    # Test: cargarSeries (si tenemos torneos)
    if isinstance(data, list) and len(data) > 0:
        primer_torneo = data[0] if isinstance(data[0], str) else data[0].get("nombre")
        data_series = fetch(url, {
            "action": "cargarSeries",
            "temporada": SAMPLE_SEASON,
            "deporte": SAMPLE_SPORT_OLD,
            "torneo": primer_torneo
        })
        result["cargarSeries"] = analyze_response(data_series)

        # Test: cargarFechas (si tenemos series)
        if isinstance(data_series, list) and len(data_series) > 0:
            primer_serie = data_series[0] if isinstance(data_series[0], str) else data_series[0].get("nombre")
            data_fechas = fetch(url, {
                "action": "cargarFechas",
                "temporada": SAMPLE_SEASON,
                "deporte": SAMPLE_SPORT_OLD,
                "torneo": primer_torneo,
                "serie": primer_serie
            })
            result["cargarFechas"] = analyze_response(data_fechas)

            # Test: cargarPartidos (si tenemos fechas)
            if isinstance(data_fechas, list) and len(data_fechas) > 0:
                primer_fecha = data_fechas[0] if isinstance(data_fechas[0], int) else data_fechas[0].get("fecha")
                data_partidos = fetch(url, {
                    "action": "cargarPartidos",
                    "temporada": SAMPLE_SEASON,
                    "deporte": SAMPLE_SPORT_OLD,
                    "torneo": primer_torneo,
                    "serie": primer_serie,
                    "fecha": primer_fecha
                })
                result["cargarPartidos"] = analyze_response(data_partidos)

    # Test: endpoints de detalle (aunque no tengamos match_id válido, documentamos la estructura)
    detail_actions = [
        "Titulares Locatario",
        "Titulares Visitante",
        "CambiosLocatario",
        "CambiosVisitante",
        "GolesLocatario",
        "GolesVisitante",
        "Amonestados Locatario",
        "Amonestados Visitante",
        "Expulsados Locatario",
        "Expulsados Visitante",
    ]

    for action in detail_actions:
        data = fetch(url, {"action": action, "id": SAMPLE_MATCH_ID})
        result[f"detail: {action}"] = analyze_response(data)

    print(" ✓")
    return result

def test_sistema_b():
    """Sistema B: APIs nuevas con parámetros numéricos"""
    print("🔍 [3/6] Probando Sistema B (estadísticas)...", end="", flush=True)
    result = {}

    # Parámetros del Sistema B (para mayoristas 2025)
    params_base = {
        "temporada": SAMPLE_SEASON,
        "deporte": SAMPLE_SPORT_NEW,
        "torneo": 2,  # mayoristas
        "categoria": 1,
        "serie": "AT",  # divA
    }

    # Test cada endpoint del Sistema B
    b_apis = ["posiciones", "goleadores", "valla_menos_vencida", "resultados", "partidos"]

    for api_name in b_apis:
        if api_name not in API_BASES:
            continue

        url = API_BASES[api_name]
        data = fetch(url, {
            **params_base,
            "action": "cargarPartidos" if api_name != "posiciones" else "cargarPosiciones"
        })
        result[api_name] = analyze_response(data)

    print(" ✓")
    return result

def test_parameter_variants():
    """Prueba variaciones de parámetros para descubrir endpoints ocultos"""
    print("🔍 [4/6] Probando variantes de parámetros...", end="", flush=True)
    url = API_BASES["detallefechas"]
    result = {}

    # Variaciones a probar
    variants = [
        {"action": "cargarTorneos", "temporada": SAMPLE_SEASON},  # sin deporte
        {"action": "cargarTorneos", "deporte": SAMPLE_SPORT_OLD},  # sin temporada
        {"deporte": SAMPLE_SPORT_OLD},  # sin action
        {},  # vacío
    ]

    for i, params in enumerate(variants):
        data = fetch(url, params)
        result[f"variant_{i}"] = {
            "params": params,
            "response": analyze_response(data)
        }

    print(" ✓")
    return result

def test_edge_cases():
    """Casos borde para entender límites de las APIs"""
    print("🔍 [5/6] Probando casos borde...", end="", flush=True)
    url = API_BASES["detallefechas"]
    result = {}

    cases = [
        ("temporada_futura", {"action": "cargarTorneos", "temporada": 200, "deporte": SAMPLE_SPORT_OLD}),
        ("temporada_pasada", {"action": "cargarTorneos", "temporada": 50, "deporte": SAMPLE_SPORT_OLD}),
        ("deporte_invalido", {"action": "cargarTorneos", "temporada": SAMPLE_SEASON, "deporte": "BASQUET"}),
        ("match_id_invalido", {"action": "Titulares Locatario", "id": 999999999}),
    ]

    for name, params in cases:
        data = fetch(url, params)
        result[name] = {
            "params": params,
            "response": analyze_response(data)
        }

    print(" ✓")
    return result

def generate_report():
    """Ejecuta todos los tests y genera reporte"""
    print("\n" + "="*70)
    print("MAPEO EXHAUSTIVO DE APIs — Liga Universitaria")
    print("="*70)

    report = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "sample_params": {
            "season": SAMPLE_SEASON,
            "sport_old": SAMPLE_SPORT_OLD,
            "sport_new": SAMPLE_SPORT_NEW,
            "match_id": SAMPLE_MATCH_ID,
        },
        "base_urls": test_base_urls(),
        "sistema_a": test_sistema_a(),
        "sistema_b": test_sistema_b(),
        "parameter_variants": test_parameter_variants(),
        "edge_cases": test_edge_cases(),
    }

    print("✅ [6/6] Reporte generado\n")

    return report

def main():
    report = generate_report()

    # Guardar como JSON
    output_path = Path(__file__).parent / "api_map.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"💾 Guardado en: {output_path}")
    print("\n" + "="*70)
    print("RESUMEN")
    print("="*70)

    # Resumen por sistema
    print("\n🔵 Sistema A (detallefechas):")
    for key in ["cargarTorneos", "cargarSeries", "cargarFechas", "cargarPartidos"]:
        if key in report["sistema_a"]:
            status = "✓" if "_error" not in report["sistema_a"][key].get("response", {}) else "✗"
            print(f"  {status} {key}")

    print("\n🟢 Sistema B (estadísticas):")
    for key in ["posiciones", "goleadores", "valla_menos_vencida", "resultados", "partidos"]:
        if key in report["sistema_b"]:
            status = "✓" if "_error" not in report["sistema_b"][key].get("response", {}) else "✗"
            print(f"  {status} {key}")

    print("\n📋 Ver detalles completos en: api_map.json")

if __name__ == "__main__":
    main()
