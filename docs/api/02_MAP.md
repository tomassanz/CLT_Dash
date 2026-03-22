# 🗺️ Mapa Completo de APIs — Liga Universitaria Uruguay

**Generado:** 2026-03-22 | **Datos de prueba:** Temporada 112 (2025)

---

## 📊 Resumen Ejecutivo

Hay **DOS sistemas completamente independientes** de APIs. Cada uno sirve para cosas distintas:

| Sistema | Propósito | Datos | Estado |
|---------|-----------|-------|--------|
| **A** — `detallefechas` | Detalles de partidos históricos | Campeonatos desde 2003, detalles de alineaciones y goles | ✅ Activo |
| **B** — Estadísticas | Tablas de posiciones y rankings | Posiciones, goleadores, valla (solo temporadas recientes) | ✅ Activo |

---

## 🔵 SISTEMA A — Detalles de Partidos (`detallefechas`)

**URL base:** `https://ligauniversitaria.org.uy/detallefechas/api.php`

**Flujo de datos:** Es una **cascada jerárquica** — necesitas ir de arriba hacia abajo.

### 1️⃣ `cargarTorneos` — Listar torneos de una temporada

```
GET https://ligauniversitaria.org.uy/detallefechas/api.php
Parámetros:
  action=cargarTorneos
  temporada=112
  deporte=FÚTBOL (con tilde)
```

**Respuesta:** Array de objetos con el nombre del torneo

```json
[
  { "nombre": "COPA DE CAMPEONES" },
  { "nombre": "TORNEO CLAUSURA" },
  { "nombre": "TORNEO APERTURA" },
  ...
]
```

**Cuándo usarlo:**
- Primer paso siempre — necesitas el nombre del torneo para la siguiente llamada
- Una sola vez por temporada al arrancar

---

### 2️⃣ `cargarSeries` — Listar series dentro de un torneo

```
GET https://ligauniversitaria.org.uy/detallefechas/api.php
Parámetros:
  action=cargarSeries
  temporada=112
  deporte=FÚTBOL
  torneo=TORNEO CLAUSURA  (nombre exacto del torneo anterior)
```

**Respuesta:** Array de objetos con el nombre de la serie

```json
[
  { "nombre": "SERIE A" },
  { "nombre": "SERIE B" },
  { "nombre": "SEMIFINALES" },
  ...
]
```

**Cuándo usarlo:**
- Segundo paso — necesitas el nombre de la serie para obtener fechas
- Puede haber 10-20 series por torneo

---

### 3️⃣ `cargarFechas` — Listar fechas dentro de una serie

```
GET https://ligauniversitaria.org.uy/detallefechas/api.php
Parámetros:
  action=cargarFechas
  temporada=112
  deporte=FÚTBOL
  torneo=TORNEO CLAUSURA
  serie=SERIE A  (nombre de la serie anterior)
```

**Respuesta:** Array de objetos con número de fecha

```json
[
  { "fecha": "1" },
  { "fecha": "2" },
  { "fecha": "3" },
  ...
]
```

**Cuándo usarlo:**
- Tercer paso — necesitas el número de fecha para obtener partidos
- Puede haber 15-30 fechas por serie

---

### 4️⃣ `cargarPartidos` — Listar partidos de una fecha

```
GET https://ligauniversitaria.org.uy/detallefechas/api.php
Parámetros:
  action=cargarPartidos
  temporada=112
  deporte=FÚTBOL
  torneo=TORNEO CLAUSURA
  serie=SERIE A
  fecha=1  (número de fecha anterior)
```

**Respuesta:** Array de objetos con info de partidos

```json
[
  {
    "ID": 12345,
    "Fecha": "1",
    "Fecha_Hora": "2025-11-16 09:00:00",
    "Cancha": "COMPLEJO DEPORTIVO ARRAYANES",
    "Locatario": "CARRASCO LAWN TENNIS",
    "GL": "3",
    "Visitante": "CLUB ATLÉTICO VILLA DEL PINAR",
    "GV": "1"
  },
  ...
]
```

**Campos importantes:**
- `ID` — match_id para obtener detalles ⭐
- `Fecha_Hora` — timestamp del partido
- `Locatario` / `Visitante` — nombres de equipos
- `GL` / `GV` — goles locatario / visitante

**Cuándo usarlo:**
- Cuarto paso — obtienes todos los partidos de una fecha
- **Este es el punto donde filtras por "CARRASCO LAWN TENNIS"** para identificar partidos de CLT

---

### 5️⃣ Endpoints de Detalle — Información de un partido específico

Una vez que tienes un `ID` de partido, puedes consultar 10 endpoints diferentes para obtener detalles:

#### Titulares

```
GET api.php?action=Titulares Locatario&id=12345
GET api.php?action=Titulares Visitante&id=12345
```

**Respuesta:**
```json
[
  {
    "carne": "12345",
    "Nombre": "JUAN PÉREZ",
    "camiseta": "7",
    "Capitan": "1"  // 1=capitán, 0=no
  },
  ...
]
```

**Campos:**
- `carne` — ID único del jugador (clave para agrupar históricos)
- `Nombre` — nombre completo
- `camiseta` — número de camiseta
- `Capitan` — 1 si es capitán, 0 si no

---

#### Cambios (Sustituciones)

```
GET api.php?action=CambiosLocatario&id=12345
GET api.php?action=CambiosVisitante&id=12345
```

**Respuesta:**
```json
[
  {
    "CarneSale": "12345",
    "Jug_Sale": "JUAN PÉREZ",
    "CarneEntra": "54321",
    "Jug_Entra": "DIEGO GARCÍA",
    "camiseta": "7",
    "minutos": "45"
  },
  ...
]
```

**Campos:**
- `CarneSale` / `CarneEntra` — carnés de los jugadores
- `minutos` — minuto en que ocurrió el cambio
- `camiseta` — número que pasó al que entró

---

#### Goles

```
GET api.php?action=GolesLocatario&id=12345
GET api.php?action=GolesVisitante&id=12345
```

**Respuesta:**
```json
[
  {
    "carne": "12345",
    "Nombre": "JUAN PÉREZ",
    "minutos": "15",
    "EnContra": "0"  // "1" = gol en contra, "0" = gol normal
  },
  ...
]
```

**Campos:**
- `minutos` — minuto del gol
- `EnContra` — "1" si es gol en contra, "0" si es gol normal

---

#### Amonestados (Tarjetas amarillas)

```
GET api.php?action=Amonestados Locatario&id=12345
GET api.php?action=Amonestados Visitante&id=12345
```

**Respuesta:**
```json
[
  {
    "Nombre": "JUAN PÉREZ"
    // ⚠️ SIN carne, SIN minuto — solo el nombre
  },
  ...
]
```

**Limitaciones:**
- Solo devuelve nombre, no ID de jugador
- No devuelve minuto de la amonestación
- ❌ **Menos útil que titulares/goles**

---

#### Expulsados (Tarjetas rojas)

```
GET api.php?action=Expulsados Locatario&id=12345
GET api.php?action=Expulsados Visitante&id=12345
```

**Respuesta:**
```json
[
  {
    "Nombre": "JUAN PÉREZ",
    "observaciones": "Doble amarilla"
  },
  ...
]
```

**Limitaciones:**
- No devuelve `carne` (ID del jugador)
- Devuelve observaciones (ej: "doble amarilla", "roja directa")

---

## 🟢 SISTEMA B — Estadísticas y Tablas

**URLs base (diferentes para cada endpoint):**
- `https://ligauniversitaria.org.uy/posiciones/api.php`
- `https://ligauniversitaria.org.uy/goleadores/api.php`
- `https://ligauniversitaria.org.uy/valla_menos_vencida/api.php`
- `https://ligauniversitaria.org.uy/resultados/api.php`
- `https://ligauniversitaria.org.uy/partidos/api.php`

**Parámetros comunes (completamente distintos del Sistema A):**

| Parámetro | Valor | Notas |
|-----------|-------|-------|
| `temporada` | 112 | Número de temporada |
| `deporte` | `F` | **Sin tilde** — a diferencia del Sistema A |
| `torneo` | `2` | **ID numérico**, no nombre (`2` = mayoristas) |
| `serie` | `AT` | **Código corto**, no nombre (`AT` = divA Torneo) |
| `categoria` | `1` | Siempre `1` (mayores) |
| `action` | Depende | Ver abajo |

**⚠️ IMPORTANTE:** No hay endpoint que devuelva los IDs/códigos disponibles. Hay que descubrirlos probando.

Códigos de serie conocidos: `AT`, `APD`, `BT`, `BPD`, `CT`, `CPD`, `DT`, `DPD`, `ET`, `EPD`, `FT`, `FPD`, `GT`, `GPD`, `A`, `B`, `C`, `D`, `E`, `F`, `G`

---

### 1️⃣ `posiciones` — Tabla de posiciones

```
GET https://ligauniversitaria.org.uy/posiciones/api.php
Parámetros:
  action=cargarPosiciones
  temporada=112
  deporte=F
  torneo=2
  categoria=1
  serie=AT
```

**Respuesta:** Array de objetos con tabla de posiciones

```json
[
  {
    "Institucion": "TENIS EL PINAR",
    "PJ": "22",
    "PG": "15",
    "PE": "3",
    "PP": "4",
    "GF": "62",
    "GC": "23",
    "Puntos": "48"
  },
  { "Institucion": "CARRASCO LAWN TENNIS", ... },
  ...
]
```

**Campos:**
- `PJ` — Partidos Jugados
- `PG` — Partidos Ganados
- `PE` — Partidos Empatados
- `PP` — Partidos Perdidos
- `GF` — Goles Favor
- `GC` — Goles Contra
- `Puntos` — Puntos en la tabla (3=victoria, 1=empate)

**Cuándo usarlo:**
- Mostrar tabla de posiciones actual
- Solo para temporada activa (histórico no está disponible en la API)

---

### 2️⃣ `goleadores` — Top goleadores

```
GET https://ligauniversitaria.org.uy/goleadores/api.php
Parámetros:
  action=cargarPartidos  (sí, dice "cargarPartidos" pero devuelve goleadores)
  temporada=112
  deporte=F
  torneo=2
  categoria=1
  serie=AT
```

**Respuesta:** Array de objetos ordenados por goles (descendente)

```json
[
  {
    "Jugador": "JUAN MARTIN OYENARD",
    "Institucion": "TENIS EL PINAR",
    "goles": "20"
  },
  { "Jugador": "DIEGO GARCÍA", "Institucion": "CARRASCO LAWN TENNIS", "goles": "12" },
  ...
]
```

**Cuándo usarlo:**
- Mostrar top goleadores de la temporada
- Solo para temporada activa

---

### 3️⃣ `valla_menos_vencida` — Arqueros con menos goles recibidos

```
GET https://ligauniversitaria.org.uy/valla_menos_vencida/api.php
Parámetros:
  action=cargarPartidos
  temporada=112
  deporte=F
  torneo=2
  categoria=1
  serie=AT
```

**Respuesta:** Array ordenado por promedio de goles recibidos (ascendente)

```json
[
  {
    "Jugador": "JOAQUIN BERRO",
    "Institución": "TENIS EL PINAR",
    "GR": "0",
    "partidos": "22",
    "ppp": "0.00"  // goles recibidos por partido
  },
  ...
]
```

**Campos:**
- `GR` — Goles Recibidos (total)
- `partidos` — Partidos jugados
- `ppp` — Promedio de goles por partido

**Cuándo usarlo:**
- Mostrar estadísticas de arqueros/valla
- Solo para temporada activa

---

### 4️⃣ `resultados` — Resultados de partidos jugados

```
GET https://ligauniversitaria.org.uy/resultados/api.php
Parámetros:
  action=cargarPartidos
  temporada=112
  deporte=F
  torneo=2
  categoria=1
  serie=AT
```

**Respuesta:** Array de partidos completados

```json
[
  {
    "ID": 98765,
    "Fecha": "1",
    "Fecha_Hora": "2025-09-14 11:15:00",
    "Cancha": "TENIS EL PINAR",
    "Locatario": "TENIS EL PINAR",
    "GL": "3",
    "Visitante": "CARRASCO LAWN TENNIS",
    "GV": "1"
  },
  ...
]
```

**Igual que `cargarPartidos` del Sistema A, pero:**
- Devuelve resultados completados (pasados)
- Solo para el rango de torneo/serie especificado
- Campos idénticos

**Cuándo usarlo:**
- Obtener resultados de una serie/torneo específico (más eficiente que la cascada del Sistema A si solo necesitas una serie)
- Para la sección "Actualidad" del dashboard

---

### 5️⃣ `partidos` — Próximos partidos (solo temporada activa)

```
GET https://ligauniversitaria.org.uy/partidos/api.php
Parámetros:
  action=cargarPartidos
  temporada=112
  deporte=F
  torneo=2
  categoria=1
  serie=AT
```

**Respuesta:** Array de partidos próximos (aún no jugados) — **devuelve `[]` (vacío) para temporadas terminadas**

```json
[
  {
    "ID": 12000,
    "Fecha": "28",
    "Fecha_Hora": "2026-01-10 15:00:00",
    "Cancha": "CARRETA",
    "Locatario": "CARRASCO LAWN TENNIS",
    "GL": null,  // aún no se juega
    "Visitante": "CLUB VILLA DEL PINAR",
    "GV": null
  },
  ...
]
```

**Limitaciones:**
- Solo devuelve datos para la temporada activa
- Temporadas terminadas → devuelve `[]`
- `GL` / `GV` son `null` porque aún no se juega

**Cuándo usarlo:**
- Mostrar próximos partidos en la sección "Actualidad"
- **No útil para datos históricos**

---

## 📋 Comparativa: Cuándo usar cada sistema

| Caso de uso | Sistema A | Sistema B |
|---|---|---|
| **Historiales de jugadores (carreras completas)** | ✅ Sí (cascada jerarquica) | ❌ No (solo temporada activa) |
| **Detalles de alineación, goles, cambios** | ✅ Sí (detalle por partido) | ❌ No |
| **Tabla de posiciones actual** | ❌ No (no devuelve posiciones) | ✅ Sí |
| **Top goleadores de temporada actual** | ❌ No | ✅ Sí |
| **Próximos partidos** | ❌ No | ✅ Sí (si temporada activa) |
| **Resultados de una serie/torneo** | ✅ Sí (pero lento) | ✅ Sí (más rápido) |
| **Estadísticas históricas por temporada** | ✅ Sí | ❌ No |
| **Tarjetas y disciplina** | ✅ Parcial (solo nombres) | ❌ No |

---

## 🚨 Casos Especiales y Limitaciones

### Parámetro `deporte`
- **Sistema A:** `deporte=FÚTBOL` ← **con tilde**
- **Sistema B:** `deporte=F` ← **sin tilde, una sola letra**
- No funciona con otros valores (ej: `BASQUET`)

### Parámetro `torneo`
- **Sistema A:** Nombre exacto del torneo como string (ej: `"TORNEO CLAUSURA"`)
- **Sistema B:** ID numérico (ej: `2` para mayoristas)
- **No hay endpoint que devuelva la lista de IDs** — hay que descubrir probando

### Parámetro `serie`
- **Sistema A:** Nombre como string (ej: `"SERIE A"`, `"SEMIFINALES"`)
- **Sistema B:** Código corto (ej: `"AT"`, `"B"`, `"FPD"`)
- **Relación:** `"AT"` = División A, Torneo | `"APD"` = División A, Play-Offs, Desempate

### Endpoints sin datos
- **Sin parámetros:** Devuelve HTML vacío (no JSON)
- **Temporada sin datos:** Devuelve `[]` (array vacío)
- **Match ID inválido:** Devuelve `{"error": "..."}` (objeto con mensaje de error)

### Rate limiting
- Observado: ~4-5 requests/segundo sin problemas
- Recomendado: Esperar 250ms entre requests (4 RPS)

---

## 🔧 Ejemplos de Uso Práctico

### Extraer todos los partidos de CLT de 2025

**Paso 1:** Obtener torneos
```
action=cargarTorneos&temporada=112&deporte=FÚTBOL
→ ["COPA DE CAMPEONES", "TORNEO CLAUSURA", "TORNEO APERTURA", ...]
```

**Paso 2:** Para cada torneo, obtener series
```
action=cargarSeries&temporada=112&deporte=FÚTBOL&torneo=TORNEO%20CLAUSURA
→ ["SERIE A", "SERIE B", ...]
```

**Paso 3:** Para cada serie, obtener fechas
```
action=cargarFechas&temporada=112&deporte=FÚTBOL&torneo=TORNEO%20CLAUSURA&serie=SERIE%20A
→ [{"fecha": "1"}, {"fecha": "2"}, ...]
```

**Paso 4:** Para cada fecha, obtener partidos
```
action=cargarPartidos&temporada=112&deporte=FÚTBOL&torneo=TORNEO%20CLAUSURA&serie=SERIE%20A&fecha=1
→ Partidos de esa fecha (filtrar por "CARRASCO LAWN TENNIS")
```

**Paso 5:** Para cada partido CLT, obtener detalles
```
action=Titulares Locatario&id=12345  (si CLT fue local)
action=GolesLocatario&id=12345
action=CambiosLocatario&id=12345
... etc
```

---

### Mostrar tabla y goleadores actuales (vista "Liga")

```
// Tabla
GET https://ligauniversitaria.org.uy/posiciones/api.php?
  action=cargarPosiciones&temporada=112&deporte=F&torneo=2&categoria=1&serie=AT

// Goleadores
GET https://ligauniversitaria.org.uy/goleadores/api.php?
  action=cargarPartidos&temporada=112&deporte=F&torneo=2&categoria=1&serie=AT

// Valla
GET https://ligauniversitaria.org.uy/valla_menos_vencida/api.php?
  action=cargarPartidos&temporada=112&deporte=F&torneo=2&categoria=1&serie=AT
```

Listo — tres requests para tener tabla, goleadores y estadísticas de arqueros.

---

## 📚 Referencias

- **Datos de prueba generados:** 2026-03-22 con temporada 112
- **Endpoint usado para generar este mapa:** `map_all_apis.py`
- **Reporte JSON detallado:** `api_map.json`

