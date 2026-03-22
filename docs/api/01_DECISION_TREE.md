# 🌳 Árbol de Decisión — Qué API usar

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                                      ┃
┃  ¿QUÉ NECESITAS?                                                   ┃
┃  (Sigue el árbol según tu caso)                                    ┃
┃                                                                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛


                                   INICIO
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
                ¿Datos               ¿Datos
               históricos?           actuales?
               (2003-2024)          (esta temporada)
                    │                        │
        ┌───────────┴───────────┐            │
        │                       │            │
   Hace 1+ años          Hace 1-2 semanas    │
        │                       │            │
        │           SI ──────→  AMBOS        │
        │           /            (ver abajo) │
        │          /                         │
        NO ◄──────┘                          │
        │                                    │
   ¿Qué tipo?                          ¿Qué tipo?
   ┌───────┬──────────┬─────────┐     ┌──────┬────────────────┬──────────┐
   │       │          │         │     │      │                │          │
Detalle  Tabla    Goles      Otro    Tabla Próx.partidos  Rankings  Detalle
partido  posic.   jugador   dato    posic.  (próximas      (goles,   partido
   │       │        │         │       │       fechas)       valla)     │
   │       │        │         │       │         │             │        │
   ↓       ↓        ↓         ↓       ↓         ↓             ↓        ↓
  SIS    SIS      SIS       ? Ver   SIS       SIS           SIS        SIS
   A      A        A       abajo     B         B             B          A

                              ↓
                        ¿Necesitas
                       detalles de
                       alineación?
                         │    │
                        SÍ    NO
                         │    │
                        ↓    ↓
                      SIS   SIS
                       A     B


┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  RESULTADO: ELIGE UNO DE ESTOS                                       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛


🔵 SISTEMA A — detallefechas/api.php
──────────────────────────────────────────────────────────────────────

  USO: Detalles históricos de partidos, alineaciones, jugadores

  PARÁMETROS:
    • action=cargarTorneos|cargarSeries|cargarFechas|cargarPartidos|...
    • temporada=90-112
    • deporte=FÚTBOL (⚠️ CON TILDE)
    • torneo="NOMBRE EXACTO"
    • serie="NOMBRE EXACTO"
    • fecha=1-30
    • id=match_id (para detalles)

  FLUJO (cascada obligatoria):
    1. cargarTorneos → [{"nombre": "..."}]
    2. cargarSeries (+ torneo)
    3. cargarFechas (+ serie)
    4. cargarPartidos (+ fecha) ← aquí obtienen match_id
    5. Titulares/Cambios/Goles/etc (+ id)

  EJEMPLOS DE USO:
    ✓ "Dame todos los partidos de CLT de 2023"
    ✓ "Quiero la alineación de este partido"
    ✓ "¿Cuántos goles hizo Fulano en su carrera?"
    ✓ "Dame el historial completo de CLT"
    ✓ "Quiero las tarjetas amarillas de este jugador"

  VELOCIDAD: Lento (5-10 requests antes de obtener detalle)
  DATOS: Completos (alineación, goles, cambios, disciplina parcial)
  HISTÓRICO: Sí (90-112)


🟢 SISTEMA B — {posiciones|goleadores|valla_menos_vencida|resultados|partidos}/api.php
──────────────────────────────────────────────────────────────────────────────────────

  USO: Tablas, rankings y contexto de la temporada actual

  PARÁMETROS (iguales para todos):
    • action=cargarPartidos|cargarPosiciones (depende del endpoint)
    • temporada=112 (solo actual realmente)
    • deporte=F (⚠️ SIN TILDE)
    • torneo=2 (mayoristas — ID numérico)
    • categoria=1 (siempre)
    • serie=AT|BT|A|B|... (código corto)

  ENDPOINTS:
    • posiciones/api.php → Tabla de posiciones
    • goleadores/api.php → Top goleadores
    • valla_menos_vencida/api.php → Estadísticas arqueros
    • resultados/api.php → Partidos completados
    • partidos/api.php → Próximos partidos ([] si terminada)

  EJEMPLOS DE USO:
    ✓ "Muestra la tabla actual"
    ✓ "Quién es el goleador actual?"
    ✓ "Cuáles son los próximos partidos?"
    ✓ "Estadísticas de valla del torneo"
    ✓ "Resultados de la última fecha"

  VELOCIDAD: Rápido (1 request por tabla)
  DATOS: Resumidos (tablas, rankings)
  HISTÓRICO: No (solo temporada activa)


┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  MATRIZ RÁPIDA DE BÚSQUEDA                                           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

  NECESITO...                              SISTEMA    REQUESTS   TIEMPO
  ────────────────────────────────────     ───────    ────────   ──────
  Tabla de posiciones actual               B          1          <0.5s
  Top 10 goleadores actuales               B          1          <0.5s
  Próximos 3 partidos                      B          1          <0.5s
  Alineación de un partido antiguo          A          5-10       2-5s
  Cambios y goles de un partido             A          5-10       2-5s
  Historial completo de un jugador          A          100+       30-120s
  Dashboard "histórico" (filtros)           A          10-50      5-30s
  Dashboard "actualidad" (hoy)              B          3          1-2s
  Dashboard COMPLETO (ambos)                A+B        15-60      10-30s
  Validar cambios en la API                 A+B        40-60      10-15s

```

---

## 📋 Checklist: Antes de hacer el request

- [ ] ¿Qué información necesito exactamente?
- [ ] ¿Es histórica (años atrás) o actual (esta semana)?
- [ ] ¿Necesito detalles o solo números?
- [ ] ¿Cuántos requests puedo hacer? (rate limit 250ms)
- [ ] ¿Sistema A o B? (revisar árbol arriba)
- [ ] Si es A: ¿Qué parámetro `torneo` y `serie` necesito? (cascada)
- [ ] Si es B: ¿Qué `serie` (código) necesito? (tabla de códigos abajo)

---

## 🔑 Códigos de Serie en Sistema B

```
MAYORISTAS (torneo=2):
  AT = División A, Torneo
  APD = División A, Play-offs, Desempate
  BT = División B, Torneo
  BPD = División B, Play-offs, Desempate
  CT = División C, Torneo
  CPD = División C, Play-offs, Desempate
  ... (DT, DPD, ET, EPD, FT, FPD, GT, GPD)

ALTERNATIVAS (si no funciona):
  A, B, C, D, E, F, G = Series simplificadas
```

---

## ⚠️ Casos Especiales

### "Necesito datos antiguos (2005, 2010, etc.)"
```
↓
SIEMPRE SISTEMA A
Sistema B no tiene histórico
```

### "Necesito datos de una serie específica que no conozco"
```
↓
1. Intenta códigos comunes: AT, BT, A, B (Sistema B)
2. Si no funciona, usa cascada del Sistema A para descubrir
3. Última opción: corre map_all_apis.py para ver qué hay
```

### "Necesito mezclar histórico con tablas actuales"
```
↓
AMBOS SISTEMAS:
  • Sistema A: historial del jugador/serie
  • Sistema B: contexto actual (tabla, goleadores)
  • Combina en el frontend
```

### "Necesito próximos partidos pero la temporada terminó"
```
↓
Sistema B devuelve [] (array vacío) si temporada terminada
No hay datos de próximos partidos para temporadas pasadas
Usa Sistema A si necesitas ver resultados históricos
```

---

## 🎯 Casos Reales — Qué Sistema Usaría

### Caso 1: "Ver todos los partidos de CLT de este mes"
```
¿Cuándo? → Este mes (actual)
¿Qué tipo? → Resultados de una serie
¿Necesito alineación? → No, solo resultados

SISTEMA B
GET resultados/api.php?temporada=112&deporte=F&torneo=2&categoria=1&serie=AT
1 request → todos los partidos
```

### Caso 2: "Ficha completa de un jugador (carrera entera)"
```
¿Cuándo? → 20 años atrás
¿Qué tipo? → Todos los partidos donde jugó
¿Necesito alineación? → Sí (ver si fue titular)

SISTEMA A
Cascada 1: cargarTorneos (s=90..112)
Cascada 2: cargarSeries (cada torneo)
Cascada 3: cargarFechas (cada serie)
Cascada 4: cargarPartidos (cada fecha)
Paso 5: Titulares (ver si jugador está)
100-500 requests (pero ✅ detalles completos)
```

### Caso 3: "Dashboard con historia + tabla actual"
```
PARTE 1 (Historia): SISTEMA A
  → Todas las temporadas, filtros, detalles

PARTE 2 (Actualidad): SISTEMA B
  → Tabla actual, goleadores, próximos

COMBINACIÓN:
  Backend: Genera histórico en SQLite con A
  Frontend: Carga JSON estático + consulta B para actualidad
```

---

## 🚀 Decisión Final: Sistema A o B

```
                START
                  │
        ¿Histórico (hace 1+ año)?
                 │
         ┌───────┴────────┐
         │                │
        SÍ                NO
         │                │
         ↓                ↓
    SIS A           ¿Detalles?
      100%             │
                  ┌────┴────┐
                  │         │
                 SÍ        NO
                  │         │
                  ↓         ↓
               SIS A      SIS B
               50-200    1-3 req
              requests
```

---

## 📞 Si aún tienes dudas

1. **"¿Qué endpoints existen?"** → Ver [API_MAP.md](API_MAP.md)
2. **"¿Parámetro exacto?"** → Ver [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md)
3. **"¿Sistema A vs B?"** → Ver [API_COMPARISON.md](API_COMPARISON.md)
4. **"¿Respuesta JSON?"** → Ver `scraper/api_map.json`
5. **"¿Código de ejemplo?"** → Ver `scraper/test_api.py`

