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
             ¿Qué tipo de                    ¿Qué tipo de
              dato necesito?                 dato necesito?
                    │                                 │
   ┌────────────────┼──────────────┐    ┌─────────────┼──────────────┐
   │                │              │    │             │              │
Detalle          Historial     Tarjetas  Tabla     Goles del    Próximos
de un            de un         /disciplina posic.   torneo       partidos
partido          jugador            │       │      (ranking)        │
(alineación,     (todos sus         │       │          │            │
goles, cambios)  partidos)          │       │          │            │
   │                │               │       ↓          ↓            ↓
   ↓                ↓               ↓      SIS        SIS          SIS
  SIS              SIS             SIS      B          B            B
   A                A               A
                                          (cualquier temporada)
(cualquier temporada — incluyendo esta semana)


┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  RESULTADO: ELIGE UNO DE ESTOS                                       ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛


🔵 SISTEMA A — detallefechas/api.php
──────────────────────────────────────────────────────────────────────

  USO: Detalles de partidos (alineaciones, goles, cambios, disciplina)
       Funciona para cualquier temporada — incluyendo partidos recientes

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
    ✓ "Quiero la alineación de un partido"
    ✓ "¿Cuántos goles hizo Fulano en su carrera?"
    ✓ "Dame el historial completo de CLT"
    ✓ "Quiero las tarjetas amarillas de este jugador"
    ✓ "¿Cómo salió el partido del fin de semana pasado?"

  VELOCIDAD: Lento (5-10 requests antes de obtener detalle)
  DATOS: Completos (alineación, goles, cambios, disciplina parcial)
  TEMPORADAS: 90–112 (todas, incluyendo la activa)


🟢 SISTEMA B — {posiciones|goleadores|valla_menos_vencida|resultados|partidos}/api.php
──────────────────────────────────────────────────────────────────────────────────────

  USO: Estadísticas de la liga (tabla de posiciones, rankings, próximos partidos)
       Solo tiene datos para la temporada activa

  PARÁMETROS (iguales para todos):
    • action=cargarPartidos|cargarPosiciones (depende del endpoint)
    • temporada=109-112 (solo desde ~2022)
    • deporte=F (⚠️ SIN TILDE)
    • torneo=2|2B|20|18|16|32|40|48|1 (ID numérico — ver tabla completa en API_MAP.md)
    • categoria=<mismo que torneo, excepto 2B usa categoria=2>
    • serie=AT|RSAT|20AT|... (código corto — depende de la categoría)

  CATEGORÍAS PRINCIPALES:
    • torneo=2,  cat=1  → Mayores
    • torneo=2B, cat=2  → Reserva
    • torneo=20, cat=20 → Sub-20
    • torneo=18, cat=18 → Sub-18
    • torneo=16, cat=16 → Sub-16
    • torneo=32, cat=32 → Pre-Senior
    • torneo=40, cat=40 → Más de 40
    • torneo=48, cat=48 → Más de 48
    • torneo=1,  cat=1  → Copa / Torneo Harmony

  PARA DESCUBRIR PARÁMETROS VÁLIDOS:
    → GET https://ligauniversitaria.org.uy/config/config.json
       Devuelve ~270 entradas con Temporada, Deporte, Torneo, Categoria, Serie exactos

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
  DATOS: Estadísticas de liga (tablas, rankings) — para TODAS las categorías (Mayores, Sub-20, Sub-18, Sub-16, Reserva, Pre-Senior, Más de 40, Más de 48, Copa)
  TEMPORADAS: 109–112 (~2022 en adelante) — sin datos para temporadas anteriores


┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  MATRIZ RÁPIDA DE BÚSQUEDA                                           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

  NECESITO...                              SISTEMA    REQUESTS   TIEMPO
  ────────────────────────────────────     ───────    ────────   ──────
  Tabla de posiciones del torneo           B          1          <0.5s
  Top goleadores del torneo                B          1          <0.5s
  Próximos 3 partidos                      B          1          <0.5s
  Alineación de un partido (cualquier año) A          5-10       2-5s
  Cambios y goles de un partido            A          5-10       2-5s
  Historial completo de un jugador         A          100+       30-120s
  Partidos de CLT con filtros              A          10-50      5-30s
  Dashboard "actualidad" (hoy)             B          3          1-2s
  Dashboard COMPLETO (ambos)               A+B        15-60      10-30s
  Validar cambios en la API                A+B        40-60      10-15s

```

---

## 📋 Checklist: Antes de hacer el request

- [ ] ¿Qué información necesito exactamente?
- [ ] ¿Necesito detalle de un partido específico? → Sistema A
- [ ] ¿Necesito tabla de posiciones / ranking de goleadores del torneo? → Sistema B
- [ ] ¿Cuántos requests puedo hacer? (rate limit 250ms)
- [ ] ¿Sistema A o B? (revisar árbol arriba)
- [ ] Si es A: ¿Qué parámetro `torneo` y `serie` necesito? (cascada)
- [ ] Si es B: ¿Qué `serie` (código) necesito? (tabla de códigos abajo)

---

## 🔑 Códigos de Serie en Sistema B

```
MAYORES (torneo=2, cat=1):
  AT = División A, Torneo
  APD = División A, Play-offs, Desempate
  BT = División B, Torneo
  BPD = División B, Play-offs, Desempate
  CT, CPD, DT, DPD, ET, EPD, FT, FPD, GT, GPD = otras divisiones
  A, B, C, D, E, F, G = series simplificadas (alternativas)

RESERVA (torneo=2B, cat=2):
  RSAT, RS1, ... (prefijo RS)

SUB-20 (torneo=20, cat=20):
  20AT, 20A, ...

SUB-18 (torneo=18, cat=18):
  18-1-, 18-2-, ...

SUB-16 (torneo=16, cat=16):
  16-1-, 16-2-, ...

PRE-SENIOR (torneo=32, cat=32):
  PSAT, PSA, ...

MÁS DE 40 (torneo=40, cat=40):
  M40S1, M40S2, ...

MÁS DE 48 (torneo=48, cat=48):
  48R1, 48R2, ...

COPA / TORNEO HARMONY (torneo=1, cat=1):
  THM8, ...
```

**Forma más confiable de obtener los códigos exactos:**
Consultar `https://ligauniversitaria.org.uy/config/config.json` y filtrar por `Temporada` y `Deporte`.

---

## ⚠️ Casos Especiales

### "Necesito detalles de un partido (de cualquier año, incluso reciente)"
```
↓
SIEMPRE SISTEMA A
Sistema B no tiene detalles de partido (ni de 2005 ni del fin de semana pasado)
```

### "Necesito datos de una serie específica que no conozco"
```
↓
1. Intenta códigos comunes: AT, BT, A, B (Sistema B)
2. Si no funciona, usa cascada del Sistema A para descubrir
3. Última opción: corre map_all_apis.py para ver qué hay
```

### "Necesito mezclar detalles de partidos con tablas del torneo"
```
↓
AMBOS SISTEMAS:
  • Sistema A: alineaciones, goles, historial de jugador
  • Sistema B: tabla de posiciones, goleadores del torneo
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
         ¿Qué tipo de dato?
                 │
         ┌───────┴────────┐
         │                │
   Detalle de        Estadísticas
   un partido        de la liga
   (quién jugó,      (tabla, goleadores,
   goles, cambios)   próximos partidos)
         │                │
         ↓                ↓
      SIS A            SIS B
      5-10 req         1 req
  (cualquier          (solo
   temporada)      temporada activa)
```

---

## 📞 Si aún tienes dudas

1. **"¿Qué endpoints existen?"** → Ver [API_MAP.md](API_MAP.md)
2. **"¿Parámetro exacto?"** → Ver [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md)
3. **"¿Sistema A vs B?"** → Ver [API_COMPARISON.md](API_COMPARISON.md)
4. **"¿Respuesta JSON?"** → Ver `scraper/api_map.json`
5. **"¿Código de ejemplo?"** → Ver `scraper/test_api.py`

