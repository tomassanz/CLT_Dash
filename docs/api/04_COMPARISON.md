# 🔄 Comparativa Detallada: Sistema A vs Sistema B

## Flujo Visual

```
SISTEMA A (detallefechas)
========================
                         Cascada jerárquica
                         ↓
┌─────────────────────────────────────────────┐
│ 1. cargarTorneos                            │
│ params: temporada, deporte=FÚTBOL (tilde)  │
│ respuesta: [{"nombre": "COPA DE..."}]      │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 2. cargarSeries (+ torneo)                 │
│ respuesta: [{"nombre": "SERIE A"}]         │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 3. cargarFechas (+ serie)                  │
│ respuesta: [{"fecha": "1"}]                │
└──────────────────┬──────────────────────────┘
                   ↓
┌─────────────────────────────────────────────┐
│ 4. cargarPartidos (+ fecha)                │
│ respuesta: [{ID, Locatario, GL, ...}]     │
└──────────────────┬──────────────────────────┘
                   ↓
        🎯 FILTRAR por "CARRASCO LAWN TENNIS"
                   ↓
┌─────────────────────────────────────────────┐
│ 5. Endpoints de Detalle (con match_id)    │
│ - Titulares Locatario/Visitante            │
│ - Cambios...                                │
│ - Goles...                                  │
│ - Amonestados...                            │
│ - Expulsados...                             │
└─────────────────────────────────────────────┘
                   ↓
        📊 DATOS DE UN PARTIDO CON DETALLES


SISTEMA B (Estadísticas)
========================
                    Directo, sin cascada
                         ↓
┌─────────────────────────────────────────────┐
│ Endpoint directo (1 request)               │
│ params: temporada, deporte=F, torneo=2,   │
│         serie=AT, categoria=1             │
│                                            │
│ ELIJE UNO:                                 │
│ • posiciones/api.php → Tabla              │
│ • goleadores/api.php → Top goles          │
│ • valla_menos_vencida/api.php → Arqueros │
│ • resultados/api.php → Resultados         │
│ • partidos/api.php → Próximos (si activa) │
└─────────────────────────────────────────────┘
                   ↓
        📊 DATOS ESTRUCTURADOS (tabla/rankings)
```

---

## Tabla Comparativa Detallada

| Aspecto | Sistema A | Sistema B |
|---------|-----------|-----------|
| **URL Base** | `detallefechas/api.php` | 5 endpoints diferentes |
| **Diseño** | Cascada jerárquica | Directos (no encadenados) |
| **Requests mínimos** | 5+ (hasta obtener partidos) | 1 |
| **Parámetro `deporte`** | `FÚTBOL` (con tilde) | `F` (sin tilde) |
| **Parámetro `torneo`** | Nombre exacto string | ID numérico |
| **Parámetro `serie`** | Nombre string | Código corto |
| **Descubrimiento params** | Cascada automática | Manual (probar códigos) |
| **Datos históricos** | ✅ Sí (2003–2025) | ⚠️ Solo desde temporada 109 (~2022) |
| **Categorías cubiertas** | Todas (Mayores, Sub-20, etc.) | Todas las categorías: Mayores, Reserva, Sub-20, Sub-18, Sub-16, Pre-Senior, Más de 40, Más de 48, Copa |
| **Detalles alineación** | ✅ Sí (titulares, cambios) | ❌ No |
| **Goles con detalles** | ✅ Sí (minuto, jugador) | ❌ Solo resumen |
| **Disciplina detallada** | ⚠️ Parcial (solo nombres) | ❌ No |
| **Tabla de posiciones** | ❌ No | ✅ Sí |
| **Rankings (goles/valla)** | ❌ No | ✅ Sí |
| **Próximos partidos** | ❌ No | ✅ Sí (si temporada activa) |
| **Casos borde bien manejados** | Sí (cascada clara) | Inesperados (códigos ocultos) |

---

## Ejemplos Lado a Lado

### Caso 1: Obtener tabla actual + goleadores

**Sistema A:**
```
Imposible — no devuelve tablas de posiciones
```

**Sistema B:**
```
GET posiciones/api.php?
  action=cargarPosiciones&temporada=112&deporte=F&torneo=2&categoria=1&serie=AT
→ Tabla completa en 1 request

GET goleadores/api.php?
  action=cargarPartidos&temporada=112&deporte=F&torneo=2&categoria=1&serie=AT
→ Top goleadores en 1 request más
```

**Ventaja:** Sistema B (2 requests vs ninguno)

---

### Caso 2: Obtener todos los partidos de CLT de una serie

**Sistema A:**
```
1. cargarTorneos?temporada=112&deporte=FÚTBOL
   → [{"nombre": "TORNEO CLAUSURA"}]

2. cargarSeries?..&torneo=TORNEO CLAUSURA
   → [{"nombre": "SERIE A"}]

3. cargarFechas?..&serie=SERIE A
   → [{"fecha": "1"}, {"fecha": "2"}, ...]

4. cargarPartidos?..&fecha=1
   → [{...}, {...}, ...]  ← filtrar por CLT

5. Repetir paso 4 para fechas 2, 3, ..., N
   → Potencialmente 15-30 requests adicionales

Total: ~35-50 requests mínimo
```

**Sistema B:**
```
GET resultados/api.php?
  action=cargarPartidos&temporada=112&deporte=F&torneo=2&categoria=1&serie=AT
→ Todos los partidos de esa serie en 1 request

Total: 1 request (mucho más eficiente)
```

**Ventaja:** Sistema B (1 request vs 35-50)

---

### Caso 3: Obtener detalles completos de un partido (alineación, goles, cambios)

**Sistema A:**
```
5. Titulares Locatario?id=12345
6. Titulares Visitante?id=12345
7. GolesLocatario?id=12345
8. GolesVisitante?id=12345
9. CambiosLocatario?id=12345
10. CambiosVisitante?id=12345
11. Amonestados Locatario?id=12345
12. Expulsados Locatario?id=12345
... (hasta 10 endpoints diferentes)

Total: ~6-10 requests
Resultado:
  - Alineaciones completas ✅
  - Goles con minuto ✅
  - Cambios con minuto ✅
  - Amonestados sin ID ⚠️
  - Expulsados sin ID ⚠️
```

**Sistema B:**
```
Imposible — no devuelve detalles de partidos
```

**Ventaja:** Sistema A (detalles vs nada)

---

### Caso 4: Estadísticas históricas de un jugador

**Sistema A:**
```
1. Cascada para cada temporada (90-112) 🔄
2. Para cada partido de CLT:
   - Obtener alineación
   - Buscar jugador por nombre
   - Registrar si fue titular, suplente, goles

Tiempo: LENTO (cientos de requests) ⏳
Exactitud: Alta ✅
```

**Sistema B:**
```
Imposible — solo temporada activa
```

**Ventaja:** Sistema A (aunque lento)

---

## Decisión: Qué usar cuándo

### Usa Sistema A SI necesitas:
- ✅ Detalles de alineación y cambios
- ✅ Goles con minuto exacto
- ✅ Historiales completos de jugadores
- ✅ Datos de cualquier partido (antiguo o reciente)
- ✅ Toda la información de un partido específico

### Usa Sistema B SI necesitas:
- ✅ Tabla de posiciones del torneo
- ✅ Top goleadores del torneo
- ✅ Estadísticas de arqueros (valla menos vencida)
- ✅ Próximos partidos
- ✅ Resultados de una serie/torneo en 1 request

### Usa AMBOS SI necesitas:
- ✅ Dashboard "completo" (detalle de partidos + contexto de liga)
  - Sistema A: alineaciones, goles, historial de jugadores
  - Sistema B: tabla y rankings de la temporada activa
- ✅ Página de partido con detalles (Sistema A) + posición en la tabla (Sistema B)

---

## Optimizaciones Prácticas

### Para el scraper histórico
**Usa Sistema A** para:
- Extraer todos los partidos de CLT (necesitas cascada y detalles)
- Poblar base de datos SQLite con información completa
- Generar JSONs con detalles de alineaciones

**No uses Sistema B** para histórico:
- Solo tiene datos de la temporada activa
- Sería necesario populating manual para cada temporada (sin API)

### Para el dashboard frontend
**Usa Sistema A** para:
- Modal de partido (detalles de alineación)
- Ficha de jugador (historiales y estadísticas)
- Tab de Historia (filtros y tablas históricas)

**Usa Sistema B** para:
- Tab de Liga (tabla, goleadores, valla)
- Tab de Actualidad (próximos partidos, últimos resultados)
- Cards de "líderes de la temporada"

### Para la cron semanal
**Sistema A:**
- `--incremental`: extrae solo la última temporada con datos nuevos
- Genera nuevos match_ids, detalles de partidos
- Populatea tabla `processed_matches` con qué ya fue descargado

**Sistema B:**
- Se corre automáticamente al final de `process_season` en extractor.py
- Actualiza `league_stands`, `league_scorers`, `league_goalkeepers`
- Corre para todas las series descubiertas (AT, BT, A, B, etc.)

---

## Limitaciones y Workarounds

### Sistema A

| Limitación | Problema | Workaround |
|---|---|---|
| Cascada obligatoria | Lento para muchos requests | Cachear torneos/series en memoria |
| No devuelve posiciones | Falta info de contexto | Usar Sistema B para tabla actual |
| Amonestados sin ID | No se puede asociar con jugadores | Usar solo nombres, sin carne |
| Expulsados sin ID | No se puede asociar con jugadores | Registrar solo el nombre |
| Match_id no persiste | IDs locales/visitantes distintos | Usar combo (fecha, equipo, fecha_hora) |

### Sistema B

| Limitación | Problema | Workaround |
|---|---|---|
| Datos solo desde temporada 109 (~2022) | Sin datos para temporadas anteriores | Usar Sistema A para historial completo |
| Descubrimiento manual de códigos | `torneo` y `serie` ocultos | Consultar `config.json` (ver abajo) |
| Sin detalles de partidos | No sé alineaciones | Usar Sistema A para esos datos |
| `partidos` devuelve `[]` si temporada terminada | Próximos partidos solo si activa | Validar primero si temporada activa |

**Workaround para descubrimiento de parámetros:** `https://ligauniversitaria.org.uy/config/config.json` lista las ~270 combinaciones válidas de `Temporada`/`Deporte`/`Torneo`/`Categoria`/`Serie`. Consultarlo antes de adivinar códigos.

---

## Resumen de Uso Combinado

```
┌─────────────────────────────────────┐
│      Frontend (CLT Dashboard)        │
└────────────────────┬────────────────┘
                     │
            ┌────────┴────────┐
            ↓                 ↓
      Sistema A           Sistema B
  (detalle de partido) (estadísticas de liga)
            ↓                 ↓
   ┌──────────────┐  ┌──────────────┐
   │ Detalles     │  │ Tabla        │
   │ Alineación   │  │ Goleadores   │
   │ Goles        │  │ Valla        │
   │ Cambios      │  │ Próximos     │
   │ Jugadores    │  │              │
   │ Historiales  │  │              │
   └──────────────┘  └──────────────┘
            ↓                 ↓
   ┌──────────────────────────────────┐
   │    JSON estáticos en          │
   │    frontend/public/data/          │
   └──────────────────────────────────┘
```

