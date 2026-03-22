# 🔗 URLs de Ejemplo — Copiar y Pegar

## Sistema A — Cascada de Detalles

### Paso 1: Obtener torneos de temporada 112
```
https://ligauniversitaria.org.uy/detallefechas/api.php?
  action=cargarTorneos
  &temporada=112
  &deporte=FÚTBOL
```

**Respuesta esperada:**
```json
[
  {"nombre": "COPA DE CAMPEONES"},
  {"nombre": "TORNEO CLAUSURA"},
  {"nombre": "TORNEO APERTURA"},
  ...
]
```

---

### Paso 2: Obtener series de un torneo
```
https://ligauniversitaria.org.uy/detallefechas/api.php?
  action=cargarSeries
  &temporada=112
  &deporte=FÚTBOL
  &torneo=TORNEO CLAUSURA
```

⚠️ **Importante:** `torneo` es el nombre exacto del torneo anterior (en URL encoding)

**URL con espacios codificados:**
```
https://ligauniversitaria.org.uy/detallefechas/api.php?action=cargarSeries&temporada=112&deporte=FÚTBOL&torneo=TORNEO%20CLAUSURA
```

---

### Paso 3: Obtener fechas de una serie
```
https://ligauniversitaria.org.uy/detallefechas/api.php?
  action=cargarFechas
  &temporada=112
  &deporte=FÚTBOL
  &torneo=TORNEO CLAUSURA
  &serie=SERIE A
```

**URL codificada:**
```
https://ligauniversitaria.org.uy/detallefechas/api.php?action=cargarFechas&temporada=112&deporte=FÚTBOL&torneo=TORNEO%20CLAUSURA&serie=SERIE%20A
```

---

### Paso 4: Obtener partidos de una fecha
```
https://ligauniversitaria.org.uy/detallefechas/api.php?
  action=cargarPartidos
  &temporada=112
  &deporte=FÚTBOL
  &torneo=TORNEO CLAUSURA
  &serie=SERIE A
  &fecha=1
```

**Aquí obtienes los match_id** — busca donde `Locatario` o `Visitante` sea `"CARRASCO LAWN TENNIS"`

---

### Paso 5: Obtener detalles del partido

#### Titulares (alineación)
```
https://ligauniversitaria.org.uy/detallefechas/api.php?
  action=Titulares Locatario
  &id=12345
```

O para visitante:
```
https://ligauniversitaria.org.uy/detallefechas/api.php?
  action=Titulares Visitante
  &id=12345
```

#### Cambios (sustituciones)
```
https://ligauniversitaria.org.uy/detallefechas/api.php?
  action=CambiosLocatario
  &id=12345
```

#### Goles
```
https://ligauniversitaria.org.uy/detallefechas/api.php?
  action=GolesLocatario
  &id=12345
```

#### Amonestados (tarjetas amarillas)
```
https://ligauniversitaria.org.uy/detallefechas/api.php?
  action=Amonestados Locatario
  &id=12345
```

⚠️ **Nota:** Espacio en el action (`"Amonestados Locatario"`, no `"AmonestadosLocatario"`)

#### Expulsados (tarjetas rojas)
```
https://ligauniversitaria.org.uy/detallefechas/api.php?
  action=Expulsados Locatario
  &id=12345
```

---

## Sistema B — Endpoints Directos

### Tabla de Posiciones (División A, Torneo)
```
https://ligauniversitaria.org.uy/posiciones/api.php?
  action=cargarPosiciones
  &temporada=112
  &deporte=F
  &torneo=2
  &categoria=1
  &serie=AT
```

**Respuesta:** Array con Institución, PJ, PG, PE, PP, GF, GC, Puntos

---

### Goleadores de la Temporada
```
https://ligauniversitaria.org.uy/goleadores/api.php?
  action=cargarPartidos
  &temporada=112
  &deporte=F
  &torneo=2
  &categoria=1
  &serie=AT
```

**Respuesta:** Array ordenado por goles (descendente) con Jugador, Institución, goles

---

### Valla Menos Vencida (Arqueros)
```
https://ligauniversitaria.org.uy/valla_menos_vencida/api.php?
  action=cargarPartidos
  &temporada=112
  &deporte=F
  &torneo=2
  &categoria=1
  &serie=AT
```

**Respuesta:** Array de arqueros con GR (goles recibidos), partidos, ppp (promedio)

---

### Resultados de la Temporada
```
https://ligauniversitaria.org.uy/resultados/api.php?
  action=cargarPartidos
  &temporada=112
  &deporte=F
  &torneo=2
  &categoria=1
  &serie=AT
```

**Respuesta:** Array de partidos completados con ID, Fecha_Hora, resultado

---

### Próximos Partidos (si temporada activa)
```
https://ligauniversitaria.org.uy/partidos/api.php?
  action=cargarPartidos
  &temporada=112
  &deporte=F
  &torneo=2
  &categoria=1
  &serie=AT
```

**Respuesta:**
- Si temporada activa: Array de próximos partidos
- Si terminada: `[]` (array vacío)

---

## Variantes de Parámetros

### Diferentes Divisiones
```
DIVISIÓN A:    serie=AT   (Torneo)
DIVISIÓN A:    serie=APD  (Play-offs, Desempate)
DIVISIÓN B:    serie=BT   (Torneo)
DIVISIÓN B:    serie=BPD  (Play-offs, Desempate)
... etc
```

### Diferentes Temporadas (Sistema B — si tienen datos)
```
Temporada 112 (2025): temporada=112&deporte=F
Temporada 111 (2024): temporada=111&deporte=F  ← puede no tener datos en Sistema B
```

⚠️ Sistema B solo tiene datos completos de la temporada actual. Temporadas antiguas pueden no responder.

---

## Testing Rápido en Browser

Copia y pega en la barra de direcciones (reemplaza `[PARAM]` por valores reales):

### Test 1: ¿Funcionan los torneos?
```
https://ligauniversitaria.org.uy/detallefechas/api.php?action=cargarTorneos&temporada=112&deporte=FÚTBOL
```

### Test 2: ¿Funciona la tabla actual?
```
https://ligauniversitaria.org.uy/posiciones/api.php?action=cargarPosiciones&temporada=112&deporte=F&torneo=2&categoria=1&serie=AT
```

### Test 3: ¿Funciona el deporte sin tilde?
```
https://ligauniversitaria.org.uy/detallefechas/api.php?action=cargarTorneos&temporada=112&deporte=F
```

(Debería devolver `[]` — sin datos, porque es con `F`, no con `FÚTBOL`)

---

## Curl (línea de comandos)

### Descargar JSON desde terminal
```bash
curl -s "https://ligauniversitaria.org.uy/posiciones/api.php?action=cargarPosiciones&temporada=112&deporte=F&torneo=2&categoria=1&serie=AT" | jq .
```

### Con rate limiting (250ms entre requests)
```bash
for action in cargarTorneos cargarSeries; do
  curl -s "https://ligauniversitaria.org.uy/detallefechas/api.php?action=$action&temporada=112&deporte=FÚTBOL" | jq .
  sleep 0.25
done
```

---

## Python

### Fetch simple
```python
import requests

url = "https://ligauniversitaria.org.uy/detallefechas/api.php"
params = {
    "action": "cargarTorneos",
    "temporada": 112,
    "deporte": "FÚTBOL"
}

response = requests.get(url, params=params)
data = response.json()
print(data)
```

### Con rate limiting
```python
import requests
import time

def api_get(action, **params):
    base_url = "https://ligauniversitaria.org.uy/detallefechas/api.php"
    params["action"] = action
    params["deporte"] = "FÚTBOL"

    response = requests.get(base_url, params=params)
    time.sleep(0.25)  # Rate limit: 250ms
    return response.json()

# Uso
torneos = api_get("cargarTorneos", temporada=112)
print(torneos)
```

---

## JavaScript/TypeScript

### Fetch con async/await
```javascript
async function getAPI(action, params) {
  const base = "https://ligauniversitaria.org.uy/detallefechas/api.php";
  const url = new URL(base);

  url.searchParams.append("action", action);
  url.searchParams.append("deporte", "FÚTBOL");

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
  }

  const response = await fetch(url);
  await new Promise(resolve => setTimeout(resolve, 250)); // Rate limit

  return response.json();
}

// Uso
const torneos = await getAPI("cargarTorneos", { temporada: 112 });
console.log(torneos);
```

---

## Validación Rápida

### ¿Qué significa este error?
```json
{ "error": "No se encontraron titulares..." }
```
→ match_id no existe o no tiene datos

```json
[]
```
→ Sin datos (temporada sin torneos, serie sin fechas, etc.)

```json
<html>...</html>
```
→ Parámetros invalidos (sin `action`, etc.) — devuelve HTML

---

## Parámetro Crítico: El Tilde 🌶️

```
✅ SISTEMA A:    deporte=FÚTBOL    ← con tilde (´)
❌ SISTEMA A:    deporte=F         ← SIN TILDE (devuelve [])

✅ SISTEMA B:    deporte=F         ← SIN TILDE
❌ SISTEMA B:    deporte=FÚTBOL    ← con tilde (probablemente error)
```

**Si no funciona nada, primer check:** ¿el tilde está bien?

