# ⚡ Quick Reference — APIs Liga Universitaria

## 🔵 SISTEMA A: `detallefechas` — Detalles de partidos (cualquier temporada)

Base: `https://ligauniversitaria.org.uy/detallefechas/api.php`

| Endpoint | Parámetros | Devuelve | Uso |
|----------|-----------|----------|-----|
| `cargarTorneos` | `temporada`, `deporte=FÚTBOL` | `[{nombre}]` | Torneos de una temporada |
| `cargarSeries` | +`torneo` (nombre) | `[{nombre}]` | Series de un torneo |
| `cargarFechas` | +`serie` (nombre) | `[{fecha}]` | Fechas de una serie |
| `cargarPartidos` | +`fecha` (número) | `[{ID, Fecha_Hora, Locatario, GL, Visitante, GV}]` | Partidos de una fecha |
| `Titulares {Locatario\|Visitante}` | `id` (match_id) | `[{carne, Nombre, camiseta, Capitan}]` | Alineación |
| `Cambios{Locatario\|Visitante}` | `id` | `[{CarneSale, CarneEntra, minutos}]` | Sustituciones |
| `Goles{Locatario\|Visitante}` | `id` | `[{carne, Nombre, minutos, EnContra}]` | Goles |
| `Amonestados {Locatario\|Visitante}` | `id` | `[{Nombre}]` | ⚠️ Solo nombres, sin carne |
| `Expulsados {Locatario\|Visitante}` | `id` | `[{Nombre, observaciones}]` | ⚠️ Sin carne |

**Parámetros comunes:**
- `deporte=FÚTBOL` ← **con tilde**
- `torneo`, `serie`, `fecha` → nombres como strings exactos

---

## 🟢 SISTEMA B: Estadísticas — Tablas y rankings

Parámetros comunes: `temporada`, `deporte=F`, `torneo=<id>`, `serie=<codigo>`, `categoria=<id>`, `action=cargarPartidos` (o `cargarPosiciones`)

| URL | action | Devuelve | Uso |
|-----|--------|----------|-----|
| `posiciones/api.php` | `cargarPosiciones` | `[{Institucion, PJ, PG, PE, PP, GF, GC, Puntos}]` | Tabla de posiciones |
| `goleadores/api.php` | `cargarPartidos` | `[{Jugador, Institucion, goles}]` | Top goleadores |
| `valla_menos_vencida/api.php` | `cargarPartidos` | `[{Jugador, Institución, GR, partidos, ppp}]` | Estadísticas arqueros |
| `resultados/api.php` | `cargarPartidos` | `[{ID, Fecha_Hora, Locatario, GL, Visitante, GV}]` | Resultados completados |
| `partidos/api.php` | `cargarPartidos` | `[{...}]` o `[]` | Próximos partidos (solo activa) |

**Parámetros comunes:**
- `deporte=F` ← **sin tilde**
- `torneo` ← ID numérico — ver tabla de categorías abajo
- `serie` ← Código corto — depende de la categoría
- `categoria` ← mismo número que `torneo` (excepto Reserva: `torneo=2B`, `categoria=2`)
- **Para descubrir parámetros válidos:** consultar `https://ligauniversitaria.org.uy/config/config.json`

**Categorías disponibles (fútbol, `deporte=F`) — confirmadas T112:**

| torneo | categoria | serie ejemplo | Nombre |
|--------|-----------|---------------|--------|
| `2` | `1` | `AT`, `A`, `BT`... | Mayores |
| `2B` | `2` | `RSAT`, `RS1`... | Reserva |
| `20` | `20` | `20AT`, `20A`... | Sub-20 |
| `18` | `18` | `18-1-`... | Sub-18 |
| `16` | `16` | `16-1-`... | Sub-16 |
| `32` | `32` | `PSAT`, `PSA`... | Pre-Senior |
| `40` | `40` | `M40S1`... | Más de 40 |
| `48` | `48` | `48R1`... | Más de 48 |
| `1` | `1` | `THM8`... | Copa de Campeones / Torneo Harmony |

**Temporadas con datos:** T109–T113. T108 y anteriores: vacíos.

**⚠️ IMPORTANTE — Cada categoría usa su propio `categoria`:**
El parámetro `categoria` NO es siempre `1`. Cada torneo tiene su propio valor. No intercambiarlos.

**Combos validados en vivo el 14/04/2026 (T113) — únicos confirmados para CLT:**

| Categoría | torneo | categoria | serie | URL ejemplo |
|-----------|--------|-----------|-------|-------------|
| Mayores Div A | `2` | `1` | `A` | `...torneo=2&categoria=1&serie=A` |
| Reserva | `2B` | `2` | `RS1` | `...torneo=2B&categoria=2&serie=RS1` |
| Sub-20 Div A | `20` | `20` | `20A` | `...torneo=20&categoria=20&serie=20A` |
| Presenior Div B | `32` | `32` | `PSB` | `...torneo=32&categoria=32&serie=PSB` |
| Más 40 Div B | `40` | `40` | `M40S2` | `...torneo=40&categoria=40&serie=M40S2` |

**Otros deportes:** `deporte=FP` (playa), `deporte=FS` (futsal), `deporte=F7` (fútbol 7).

---

## 🎯 Decisión Rápida

**¿Quiero detalle de un partido? (alineación, goles, cambios — de cualquier año)**
→ Sistema A (`detallefechas`) + cascada

**¿Quiero tabla de posiciones, ranking de goleadores o próximos partidos del torneo?**
→ Sistema B (estadísticas) — disponible desde temporada 109 (~2022)

**¿Parámetro `deporte`?**
- Sistema A: `FÚTBOL` (con tilde)
- Sistema B: `F` (sin tilde)

**¿Qué significa cada código de serie en Sistema B?**
- Primero: División (`A`, `B`, `C`, ...)
- Segunda letra: `T` = Torneo, `P` = Play-offs
- Tercera: `D` = Desempate (ej: `APD` = Div A, Play-offs, Desempate)

---

## 🔗 URLs Completas (Ejemplos)

```
Temporada 112, Mayoristas (T2), Div A (AT)

1. Tabla:
https://ligauniversitaria.org.uy/posiciones/api.php?action=cargarPosiciones&temporada=112&deporte=F&torneo=2&categoria=1&serie=AT

2. Goleadores:
https://ligauniversitaria.org.uy/goleadores/api.php?action=cargarPartidos&temporada=112&deporte=F&torneo=2&categoria=1&serie=AT

3. Partidos históricos de CLT (cascada):
a) Torneos:
https://ligauniversitaria.org.uy/detallefechas/api.php?action=cargarTorneos&temporada=112&deporte=FÚTBOL

b) Series del primer torneo:
https://ligauniversitaria.org.uy/detallefechas/api.php?action=cargarSeries&temporada=112&deporte=FÚTBOL&torneo=COPA%20DE%20CAMPEONES

c) Fechas de primera serie:
https://ligauniversitaria.org.uy/detallefechas/api.php?action=cargarFechas&temporada=112&deporte=FÚTBOL&torneo=COPA%20DE%20CAMPEONES&serie=SERIE%20A

d) Partidos de fecha 1:
https://ligauniversitaria.org.uy/detallefechas/api.php?action=cargarPartidos&temporada=112&deporte=FÚTBOL&torneo=COPA%20DE%20CAMPEONES&serie=SERIE%20A&fecha=1

e) Detalles del partido (match_id=12345):
https://ligauniversitaria.org.uy/detallefechas/api.php?action=Titulares Locatario&id=12345
```

---

## 📊 Limitaciones Importantes

| Limitación | Impacto |
|---|---|
| Sistema A: cascada jerárquica obligatoria | Necesitas 4-5 requests antes de obtener un partido |
| Sistema B: datos desde temporada 109 (~2022) | Sin tablas/rankings para temporadas anteriores |
| Amonestados: sin ID de jugador | No se pueden asociar con otros datos |
| Expulsados: sin ID de jugador | No se pueden asociar con otros datos |
| `torneo` y `serie` en B: descubrimiento manual | Hay que probar códigos; no hay lista |
| `partidos/api.php`: devuelve `[]` si temporada terminada | No útil para historiales |

---

## ✅ Rate Limiting

- **Observado:** 4-5 req/s sin problemas
- **Recomendado:** 250ms entre requests (4 RPS)
- **Timeout:** 15-20 segundos por request

