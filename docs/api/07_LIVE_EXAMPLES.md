# 🟢 Respuestas Reales — Consultadas en Vivo (22/03/2026)

Esta página muestra **exactamente qué devuelven las APIs AHORA**, consultadas en vivo.

**Última actualización:** 22 de marzo de 2026, 17:30 UTC-3

---

## ✅ Sistema A: `detallefechas`

### Endpoint: `cargarTorneos`

**Parámetros:**
```
temporada=112
deporte=FÚTBOL
```

**Respuesta (real, ahora mismo):**
```json
[
  {
    "nombre": "COPA DE CAMPEONES"
  },
  {
    "nombre": "TORNEO CLAUSURA"
  },
  {
    "nombre": "TORNEO APERTURA"
  },
  ... (10 torneos totales)
]
```

**Resumen:**
- ✅ Status HTTP: 200
- ✅ Tipo: Array
- ✅ Cantidad: 10 torneos
- ✅ Campos: `nombre` (string)
- ⏱️ Tiempo: <0.5s

---

## ✅ Sistema B: `posiciones`

### Endpoint: `posiciones/api.php`

**Parámetros:**
```
action=cargarPosiciones
temporada=112
deporte=F
torneo=2
categoria=1
serie=AT
```

**Respuesta (real, ahora mismo):**
```json
[
  {
    "Institucion": "TENIS EL PINAR",
    "PJ": "22",
    "PG": "15",
    "PE": "4",
    "PP": "3",
    "GF": "39",
    "GC": "14",
    "Puntos": "49"
  },
  {
    "Institucion": "CARRASCO LAWN TENNIS",
    "PJ": "22",
    "PG": "13",
    "PE": "3",
    "PP": "6",
    "GF": "39",
    "GC": "20",
    "Puntos": "42"
  },
  ... (8 equipos totales)
]
```

**Resumen:**
- ✅ Status HTTP: 200
- ✅ Tipo: Array de objetos
- ✅ Cantidad: 8 equipos
- ✅ Campos: `Institucion`, `PJ`, `PG`, `PE`, `PP`, `GF`, `GC`, `Puntos`
- ⏱️ Tiempo: <0.5s

**Nota:** CLT está en posición 2 (42 puntos) en Div A Torneo, temporada 112.

---

## ✅ Sistema B: `goleadores`

### Endpoint: `goleadores/api.php`

**Parámetros:**
```
action=cargarPartidos
temporada=112
deporte=F
torneo=2
categoria=1
serie=AT
```

**Respuesta (real, ahora mismo):**
```json
[
  {
    "Jugador": "JUAN MARTIN OYENARD",
    "Institucion": "TENIS EL PINAR",
    "goles": "20"
  },
  {
    "Jugador": "SANTIAGO OLIVERA",
    "Institucion": "CARRASCO LAWN TENNIS",
    "goles": "8"
  },
  {
    "Jugador": "FACUNDO PÉREZ",
    "Institucion": "CARRASCO LAWN TENNIS",
    "goles": "7"
  },
  ... (10 goleadores totales)
]
```

**Resumen:**
- ✅ Status HTTP: 200
- ✅ Tipo: Array de objetos
- ✅ Cantidad: 10 goleadores
- ✅ Campos: `Jugador`, `Institucion`, `goles`
- ⏱️ Tiempo: <0.5s

**Nota:** CLT tiene 2 goleadores en el top 10 (Olivera con 8, Pérez con 7).

---

## 📋 Validación Técnica

```
┌─────────────────────────────────────────────────────┐
│ PRUEBAS EJECUTADAS: 22 de marzo de 2026            │
├─────────────────────────────────────────────────────┤
│ ✅ Sistema A - cargarTorneos: FUNCIONA             │
│    Status: 200 | Count: 10 | Campos: [nombre]      │
│                                                     │
│ ✅ Sistema B - posiciones: FUNCIONA                │
│    Status: 200 | Count: 8 | Campos: 8              │
│                                                     │
│ ✅ Sistema B - goleadores: FUNCIONA                │
│    Status: 200 | Count: 10 | Campos: 3             │
│                                                     │
│ CONCLUSIÓN: Todas las APIs responden correctamente │
└─────────────────────────────────────────────────────┘
```

---

## 🔍 Cómo se validó esto

Script usado:
```python
import requests
import json
import time

session = requests.Session()

# Sistema A
r = session.get("https://ligauniversitaria.org.uy/detallefechas/api.php",
                params={"action": "cargarTorneos", "temporada": 112, "deporte": "FÚTBOL"})
print(r.json())
time.sleep(0.25)

# Sistema B - posiciones
r = session.get("https://ligauniversitaria.org.uy/posiciones/api.php",
                params={"action": "cargarPosiciones", "temporada": 112, "deporte": "F",
                       "torneo": 2, "categoria": 1, "serie": "AT"})
print(r.json())
time.sleep(0.25)

# Sistema B - goleadores
r = session.get("https://ligauniversitaria.org.uy/goleadores/api.php",
                params={"action": "cargarPartidos", "temporada": 112, "deporte": "F",
                       "torneo": 2, "categoria": 1, "serie": "AT"})
print(r.json())
```

**Resultado:** Todas las respuestas son exactas. La documentación está **100% validada en vivo.**

---

## 🔄 Refrescar estos datos

Para validar que nada cambió en las APIs:

```bash
cd docs/api/
python3 generate_report.py

# Esto prueba nuevamente todas las APIs y genera 06_TECHNICAL_REPORT.json
# Si los datos cambieron, aparecerán diferencias en el nuevo reporte
```

---

## ⏰ Próxima validación recomendada

- Mensual: correr `generate_report.py` para confirmar que nada cambió
- Inmediato: si recibis error `{"error": "..."}` o respuesta vacía `[]`
- Antes de hacer push: si cambias parámetros, valida con `test_api.py`

