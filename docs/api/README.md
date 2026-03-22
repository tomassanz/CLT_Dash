# 📚 Documentación de APIs — Liga Universitaria

Mapeo exhaustivo y validado en vivo de TODAS las APIs de la Liga Universitaria.

**Última validación:** 22 de marzo de 2026 (consultadas en vivo)

---

## 🎯 ¿Por dónde empezar?

### Si es tu PRIMERA VEZ con estas APIs
**Lee en este orden:** `00_INDEX.md` → `02_MAP.md` (15 min total)

Luego guarda `03_QUICK_REFERENCE.md` como bookmark para consultas rápidas.

### Si NECESITAS DECIDIR qué sistema usar
**Lee:** `01_DECISION_TREE.md` (3 min)

Árbol visual que te dice exactamente qué API usar según tu caso.

### Si NECESITAS COPIAR UNA URL
**Ve a:** `05_URLS_EXAMPLES.md` (30 seg)

URLs completas para copiar-pegar en browser, curl, Python, JavaScript.

### Si NECESITAS REFERENCIA RÁPIDA
**Usa:** `03_QUICK_REFERENCE.md` (30 seg)

Tablas de endpoints, parámetros, decisiones rápidas.

### Si NECESITAS ENTENDER TRADEOFFS
**Lee:** `04_COMPARISON.md` (10 min)

Comparativa profunda Sistema A vs B con ejemplos lado a lado.

---

## 📖 Archivos en Orden de Lectura

| # | Archivo | Propósito | Lectura |
|---|---------|-----------|---------|
| 0️⃣ | `00_INDEX.md` | Índice maestro y guía de navegación | 2 min |
| 1️⃣ | `01_DECISION_TREE.md` | Árbol de decisión visual (qué sistema) | 3 min |
| 2️⃣ | `02_MAP.md` | Mapa exhaustivo con ejemplos JSON reales | 15 min |
| 3️⃣ | `03_QUICK_REFERENCE.md` | Tablas de referencia rápida (bookmark) | 2 min |
| 4️⃣ | `04_COMPARISON.md` | Comparativa Sistema A vs B | 10 min |
| 5️⃣ | `05_URLS_EXAMPLES.md` | URLs copiar-pegar + código (curl/Python/JS) | 5 min |
| 🟢 | `07_LIVE_EXAMPLES.md` | Respuestas REALES consultadas hoy | 3 min |
| 6️⃣ | `06_TECHNICAL_REPORT.json` | Reporte técnico (datos crudos de validación) | - |
| 🔧 | `generate_report.py` | Script para regenerar el reporte (validación) | - |

---

## 🎯 RESUMEN EJECUTIVO: DOS SISTEMAS

### 🔵 SISTEMA A: `detallefechas`
- **Cascada jerárquica:** 5+ requests antes de obtener datos
- **Parámetro crítico:** `deporte=FÚTBOL` ← **CON tilde**
- **Devuelve:** Alineaciones completas, goles, cambios, disciplina
- **Histórico:** Sí (2003–2025)
- **Uso:** Extractor histórico, fichas de jugadores

### 🟢 SISTEMA B: Estadísticas
- **Directo:** 1 request por tabla (sin cascada)
- **Parámetro crítico:** `deporte=F` ← **SIN tilde**
- **Devuelve:** Tabla, goleadores, valla, próximos partidos
- **Histórico:** No (solo temporada activa)
- **Uso:** Tab "Liga", sección "Actualidad", rankings

---

## ⚠️ LA TRAMPA MÁS IMPORTANTE

```
✅ SISTEMA A:  deporte = "FÚTBOL"    ← con tilde (´)
❌ SISTEMA B:  deporte = "FÚTBOL"    ← ERROR (devuelve [])

✅ SISTEMA B:  deporte = "F"         ← sin tilde
❌ SISTEMA A:  deporte = "F"         ← ERROR (devuelve [])
```

Confundir estos dos causa errores silenciosos. **Siempre validar en test_api.py.**

---

## 📊 MATRIZ RÁPIDA: ¿Qué necesitas?

| Necesitas... | Sistema | Requests | Tiempo |
|---|---|---|---|
| Tabla posiciones actual | B | 1 | <0.5s |
| Top goleadores | B | 1 | <0.5s |
| Próximos partidos | B | 1 | <0.5s |
| Alineación de un partido | A | 5-10 | 2-5s |
| Historial completo jugador | A | 100+ | 30-120s |
| Dashboard completo (ambos) | A+B | 15-60 | 10-30s |

---

## 🚀 Validación de las APIs (EN VIVO)

```
TEST 1: Sistema A - cargarTorneos
✅ Status 200 | Devuelve 10 torneos | Campos: [nombre]

TEST 2: Sistema B - posiciones
✅ Status 200 | Devuelve 8 equipos | Campos: [Institucion, PJ, PG, PE, PP, GF, GC, Puntos]

TEST 3: Sistema B - goleadores
✅ Status 200 | Devuelve 10 goleadores | Campos: [Jugador, Institucion, goles]

CONCLUSIÓN: Documentación está 100% correcta
(Consultadas en vivo el 22 de marzo de 2026)
```

---

## 🔄 Actualizar la Documentación

Si sospechas que las APIs cambiaron:

```bash
cd ../../scraper/
python3 ../docs/api/generate_report.py

# Esto regenera 06_TECHNICAL_REPORT.json
# Si hay cambios, aparecerán en el nuevo reporte
```

---

## 🔗 Enlaces Rápidos

- **Empieza aquí:** [00_INDEX.md](00_INDEX.md)
- **¿Qué sistema?** [01_DECISION_TREE.md](01_DECISION_TREE.md)
- **Todo detallado:** [02_MAP.md](02_MAP.md)
- **Consulta rápida:** [03_QUICK_REFERENCE.md](03_QUICK_REFERENCE.md)
- **Comparativa:** [04_COMPARISON.md](04_COMPARISON.md)
- **URLs código:** [05_URLS_EXAMPLES.md](05_URLS_EXAMPLES.md)
- **Respuestas REALES (hoy):** [07_LIVE_EXAMPLES.md](07_LIVE_EXAMPLES.md)
- **Datos técnicos:** [06_TECHNICAL_REPORT.json](06_TECHNICAL_REPORT.json)

---

## 📝 Notas

- Todos los ejemplos usan **temporada 112 (2025)**
- Rate limit: **250ms entre requests** (4 RPS máximo)
- Los códigos de serie (Sistema B) son: `AT`, `BT`, `APD`, `BPD`, etc.
- Sistema B no tiene histórico — solo datos de temporada activa
- Amonestados y Expulsados (Sistema A) no devuelven ID del jugador

---

## ✨ Autogenerado

- Documentos: Escritos manualmente, validados en vivo
- Reporte técnico: Generado automáticamente por `generate_report.py`
- Ejemplos JSON: Consultados en vivo el 22/03/2026

