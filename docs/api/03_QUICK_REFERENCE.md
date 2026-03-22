# ⚡ Quick Reference — APIs Liga Universitaria

## 🔵 SISTEMA A: `detallefechas` — Detalles históricos

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

Parámetros comunes: `temporada`, `deporte=F`, `torneo=2`, `serie=AT`, `categoria=1`, `action=cargarPartidos` (o `cargarPosiciones`)

| URL | action | Devuelve | Uso |
|-----|--------|----------|-----|
| `posiciones/api.php` | `cargarPosiciones` | `[{Institucion, PJ, PG, PE, PP, GF, GC, Puntos}]` | Tabla de posiciones |
| `goleadores/api.php` | `cargarPartidos` | `[{Jugador, Institucion, goles}]` | Top goleadores |
| `valla_menos_vencida/api.php` | `cargarPartidos` | `[{Jugador, Institución, GR, partidos, ppp}]` | Estadísticas arqueros |
| `resultados/api.php` | `cargarPartidos` | `[{ID, Fecha_Hora, Locatario, GL, Visitante, GV}]` | Resultados completados |
| `partidos/api.php` | `cargarPartidos` | `[{...}]` o `[]` | Próximos partidos (solo activa) |

**Parámetros comunes:**
- `deporte=F` ← **sin tilde**
- `torneo=2` ← ID numérico (no nombre)
- `serie=AT` ← Código corto (`AT`, `BT`, `A`, `B`, etc.)
- **⚠️ No hay endpoint que devuelva los IDs de torneo/serie disponibles**

---

## 🎯 Decisión Rápida

**¿Quiero datos históricos o detalles de partidos?**
→ Sistema A (`detallefechas`) + cascada

**¿Quiero tabla, goleadores o próximos partidos actuales?**
→ Sistema B (estadísticas)

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
| Sistema B: solo temporada activa | Tablas/rankings no tienen histórico |
| Amonestados: sin ID de jugador | No se pueden asociar con otros datos |
| Expulsados: sin ID de jugador | No se pueden asociar con otros datos |
| `torneo` y `serie` en B: descubrimiento manual | Hay que probar códigos; no hay lista |
| `partidos/api.php`: devuelve `[]` si temporada terminada | No útil para historiales |

---

## ✅ Rate Limiting

- **Observado:** 4-5 req/s sin problemas
- **Recomendado:** 250ms entre requests (4 RPS)
- **Timeout:** 15-20 segundos por request

