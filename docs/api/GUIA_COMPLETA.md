# APIs Liga Universitaria — Guía completa

**Última validación:** 03/04/2026

---

## Qué son estas APIs

La Liga Universitaria tiene dos sistemas de APIs completamente distintos.
No los mezcles — tienen parámetros diferentes y sirven para cosas diferentes.

| Sistema | Para qué | Parámetro clave |
|---------|----------|-----------------|
| **Sistema A** | Detalles de partidos (alineaciones, goles, tarjetas) | `deporte=F%C3%9ATBOL` (con tilde) |
| **Sistema B** | Tablas de posiciones, goleadores de la liga | `deporte=F` (sin tilde) |

---

## SISTEMA B — Tablas y estadísticas

El más simple. Una sola consulta y tenés los datos.

**Base:** `https://ligauniversitaria.org.uy/`

**Parámetros fijos:** `temporada=112 &deporte=F &torneo=2 &categoria=1`

**Parámetro variable:** `serie=` (código de división)

| Código | División |
|--------|----------|
| `AT` | Divisional A — Torneo |
| `BT` | Divisional B — Torneo |
| `APD` | Divisional A — Play-offs / Desempate |

---

### Links reales Sistema B (temporada 2025)

**Tabla de posiciones Div A:**
```
https://ligauniversitaria.org.uy/posiciones/api.php?action=cargarPosiciones&temporada=112&deporte=F&torneo=2&categoria=1&serie=AT
```
Devuelve: `[{ "Institucion": "CARRASCO LAWN TENNIS", "PJ": "22", "PG": "13", "PE": "3", "PP": "6", "GF": "39", "GC": "20", "Puntos": "42" }, ...]`

---

**Goleadores Div A:**
```
https://ligauniversitaria.org.uy/goleadores/api.php?action=cargarPartidos&temporada=112&deporte=F&torneo=2&categoria=1&serie=AT
```
Devuelve: `[{ "Jugador": "SANTIAGO OLIVERA", "Institucion": "CARRASCO LAWN TENNIS", "goles": "8" }, ...]`

---

**Valla menos vencida (arqueros) Div A:**
```
https://ligauniversitaria.org.uy/valla_menos_vencida/api.php?action=cargarPartidos&temporada=112&deporte=F&torneo=2&categoria=1&serie=AT
```
Devuelve: `[{ "Jugador": "...", "Institución": "...", "GR": "12", "partidos": "20", "ppp": "0.60" }, ...]`

---

**Resultados completados Div A:**
```
https://ligauniversitaria.org.uy/resultados/api.php?action=cargarPartidos&temporada=112&deporte=F&torneo=2&categoria=1&serie=AT
```
Devuelve: lista de partidos jugados con marcador.

---

**Divisional B:**
```
https://ligauniversitaria.org.uy/posiciones/api.php?action=cargarPosiciones&temporada=112&deporte=F&torneo=2&categoria=1&serie=BT
```

---

## SISTEMA A — Detalles de partidos

Hay que consultarlo en cascada, paso a paso. Cada paso usa el resultado del anterior.

**Base:** `https://ligauniversitaria.org.uy/detallefechas/api.php`

**⚠️ Importante:** La `Ú` de `FÚTBOL` se escribe `F%C3%9ATBOL` en la URL.
Los espacios se escriben `%20` y las comillas `"` se escriben `%22`.

---

### PASO 1 — Torneos de la temporada

```
https://ligauniversitaria.org.uy/detallefechas/api.php?action=cargarTorneos&temporada=112&deporte=F%C3%9ATBOL
```

**Respuesta real:**
```json
[
  { "nombre": "COPA DE CAMPEONES" },
  { "nombre": "Mayores Masculino" },
  { "nombre": "Sub - 20" },
  { "nombre": "SUB 18 " },
  { "nombre": "SUB 16 " },
  { "nombre": "PRE SENIOR" },
  { "nombre": "MÁS 40" },
  { "nombre": "RESERVA" },
  { "nombre": "SUB14" },
  { "nombre": "MÁS 48 MASCULINO" }
]
```

---

### PASO 2 — Series del torneo "Mayores Masculino"

Usás el nombre exacto del torneo (tal como vino en el paso 1).

```
https://ligauniversitaria.org.uy/detallefechas/api.php?action=cargarSeries&temporada=112&deporte=F%C3%9ATBOL&torneo=Mayores%20Masculino
```

**Respuesta real (resumida):**
```json
[
  { "nombre": "DIVISIONAL \"A\"" },
  { "nombre": "DIVISIONAL \"B\"" },
  { "nombre": "DIVISIONAL \"C\"" },
  { "nombre": "DIVISIONAL \"A\" TITULO" },
  { "nombre": "DIVISIONAL \"A\" PER. y DES" },
  { "nombre": "DIVISIONAL \"B\" TIT. y ASC" },
  ...
]
```

---

### PASO 3 — Fechas de la serie "DIVISIONAL A"

```
https://ligauniversitaria.org.uy/detallefechas/api.php?action=cargarFechas&temporada=112&deporte=F%C3%9ATBOL&torneo=Mayores%20Masculino&serie=DIVISIONAL%20%22A%22
```

Devuelve los números de fecha disponibles (1, 2, 3...).

---

### PASO 4 — Partidos de la Fecha 1

```
https://ligauniversitaria.org.uy/detallefechas/api.php?action=cargarPartidos&temporada=112&deporte=F%C3%9ATBOL&torneo=Mayores%20Masculino&serie=DIVISIONAL%20%22A%22&fecha=1
```

**Respuesta real (resumida):**
```json
[
  {
    "Fecha": "1",
    "Fecha_Hora": "2025-03-30 09:00:00",
    "Cancha": "CARRASCO LAWN TENIS (KM 23)",
    "Locatario": "CARRASCO LAWN TENNIS",
    "GL": "0",
    "Visitante": "OLD WOODLANDS CLUB",
    "GV": "0",
    "ID": "91805"
  },
  ...
]
```

Para encontrar los partidos de CLT: buscá donde `Locatario` o `Visitante` sea `"CARRASCO LAWN TENNIS"`.
El campo `ID` es el que usás en el paso 5.

---

### PASO 5 — Detalle del partido (ID real: 91805)

CLT local → usar `Locatario`. CLT visitante → usar `Visitante`.

**Titulares de CLT:**
```
https://ligauniversitaria.org.uy/detallefechas/api.php?action=Titulares%20Locatario&id=91805
```
Devuelve: `[{ "carne": "12345", "Nombre": "JUAN PEREZ", "camiseta": "1", "Capitan": "1" }, ...]`

---

**Titulares del rival:**
```
https://ligauniversitaria.org.uy/detallefechas/api.php?action=Titulares%20Visitante&id=91805
```

---

**Goles de CLT:**
```
https://ligauniversitaria.org.uy/detallefechas/api.php?action=GolesLocatario&id=91805
```
Devuelve: `[{ "carne": "...", "Nombre": "...", "minutos": "45", "EnContra": "0" }]`
`EnContra: "1"` = gol en contra.
(Este partido terminó 0-0, devuelve `[]`)

---

**Cambios de CLT:**
```
https://ligauniversitaria.org.uy/detallefechas/api.php?action=CambiosLocatario&id=91805
```
Devuelve: `[{ "CarneSale": "...", "Jug_Sale": "...", "CarneEntra": "...", "Jug_Entra": "...", "minutos": "60" }]`

---

**Amarillas de CLT:**
```
https://ligauniversitaria.org.uy/detallefechas/api.php?action=Amonestados%20Locatario&id=91805
```
⚠️ Solo devuelve nombre, sin número de carne ni minuto.

---

**Rojas de CLT:**
```
https://ligauniversitaria.org.uy/detallefechas/api.php?action=Expulsados%20Locatario&id=91805
```
Devuelve: `[{ "Nombre": "...", "observaciones": "..." }]`

---

## Respuestas de error

| Respuesta | Qué significa |
|-----------|---------------|
| `[]` | Sin datos (normal — partido sin goles, serie vacía, etc.) |
| `{ "error": "..." }` | El ID no existe o no tiene datos cargados |
| HTML (texto raro) | Faltó el parámetro `action` |

---

## Codificación de caracteres especiales en URLs

| Carácter | Código URL |
|----------|------------|
| Ú (de FÚTBOL) | `%C3%9A` → escribís `F%C3%9ATBOL` |
| espacio | `%20` |
| comillas `"` | `%22` |

---

## Resumen visual del flujo Sistema A

```
cargarTorneos (temporada)
    ↓ nombre del torneo
cargarSeries (torneo)
    ↓ nombre de la serie
cargarFechas (torneo + serie)
    ↓ número de fecha
cargarPartidos (torneo + serie + fecha)
    ↓ ID del partido
Titulares / Goles / Cambios / Amarillas / Rojas (id)
```
