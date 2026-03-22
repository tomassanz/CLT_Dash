# 📖 Índice Maestro de Documentación de APIs

## 🗺️ Documentos Disponibles

### 1. [API_MAP.md](API_MAP.md) — Mapa Exhaustivo
**📖 +3000 palabras | Lectura: 15 min**

Guía completa y detallada de TODAS las APIs disponibles.

**Contiene:**
- Descripción de Sistema A (cascada jerárquica de detalles)
- Descripción de Sistema B (endpoints de estadísticas)
- 10 endpoints de detalle de partidos
- Ejemplos de respuestas JSON reales
- Casos de uso prácticos
- Explicación de parámetros y límites

**Útil para:**
- Entender cómo funciona cada API
- Ver ejemplos reales de respuestas
- Implementar nuevos features
- Debugging de requests fallidas

**Buscas si:**
- "¿Qué campos devuelve amonestados?"
- "¿Cuál es el rango de temporadas?"
- "¿Cómo hago una cascada de requests?"

---

### 2. [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md) — Cheat Sheet
**📋 1 página | Lectura: 2 min**

Referencia rápida en tabla para consultas constantes.

**Contiene:**
- Tabla de todos los endpoints (Sistema A y B)
- Decisión rápida (cuándo usar qué)
- URLs completas de ejemplo
- Limitaciones importantes
- Rate limiting

**Útil para:**
- Consultas rápidas mientras codificas
- Recordar nombre del parámetro
- Copiar-pegar URLs de ejemplo

**Buscas si:**
- "¿Cuál es el action para tabla de posiciones?"
- "¿Qué parámetro falta aquí?"
- "¿Deporte es F o FÚTBOL?"

---

### 3. [API_COMPARISON.md](API_COMPARISON.md) — Análisis Comparativo
**⚖️ Documentación estratégica | Lectura: 10 min**

Comparativa profunda entre Sistema A y Sistema B.

**Contiene:**
- Flujos visuales de cada sistema
- Tabla comparativa (15+ aspectos)
- 4 casos de uso prácticos lado a lado
- Decisión: qué usar cuándo
- Limitaciones y workarounds
- Diagrama de uso combinado

**Útil para:**
- Decidir qué sistema necesitas
- Entender el tradeoff performance vs detalles
- Planificar nuevas features

**Buscas si:**
- "¿Debería usar Sistema A o Sistema B?"
- "¿Por qué el scraper usa A y no B?"
- "¿Cuántos requests necesito para X?"

---

### 4. [scraper/api_map.json](scraper/api_map.json) — Reporte Técnico
**📊 JSON estructurado | Generado automáticamente**

Reporte crudo generado por `map_all_apis.py`.

**Contiene:**
- Pruebas de todas las URLs base
- Análisis de estructura de respuestas
- Variantes de parámetros
- Casos borde
- Tipos de datos devueltos

**Útil para:**
- Validaciones técnicas
- Integración con herramientas
- Análisis de cambios (generado periódicamente)

**No leas si:**
- Solo necesitas respuesta rápida
- No hablas JSON fluido

---

### 5. [CLAUDE.md](CLAUDE.md) — Guía General del Proyecto
**📚 Guía maestra del proyecto | Lectura: 20 min**

Incluye secciones sobre:
- Estado del proyecto
- Arquitectura general
- Flujo de datos
- Cómo correr scripts
- Próximos pasos

**Referencia a APIs:**
- Link a los 3 docs anteriores
- Overview de los dos sistemas
- Parámetros principales

---

## 🎯 Elige el documento correcto

### "No sé nada de las APIs, empieza desde cero"
**Ruta:** API_MAP.md completo (20 min)
Luego guardar API_QUICK_REFERENCE.md como bookmark

### "Necesito recordar un parámetro rápido"
**Ruta:** API_QUICK_REFERENCE.md (30 segundos)

### "Estoy diseñando una nueva feature, ¿qué sistema?"
**Ruta:** API_COMPARISON.md (10 min)

### "Me fallan los requests, necesito debug"
**Ruta:** API_MAP.md sección del endpoint específico

### "Quiero ver todas las respuestas reales"
**Ruta:** api_map.json + API_MAP.md ejemplos

### "Tengo un bug extraño en la cascada"
**Ruta:** API_MAP.md sección Sistema A + API_COMPARISON.md caso de uso

---

## 🔄 Cómo se genera esta documentación

### Generación automática
```bash
cd scraper/
python3 map_all_apis.py
```

Esto corre 30+ requests a la API real y genera:
- `api_map.json` — datos crudos
- Imprime resumen en consola

### Documentos manuales
- `API_MAP.md` — escrito manualmente con ejemplos
- `API_QUICK_REFERENCE.md` — tabla de referencia
- `API_COMPARISON.md` — análisis estratégico
- Este archivo — índice

### Actualización recomendada
- **Mensual:** Correr `map_all_apis.py` para validar que nada cambió
- **Si descubres endpoint nuevo:** Actualizar manuales
- **Si parámetros cambian:** Regenerar desde cero

---

## 🧭 Navegación Rápida

```
┌─ PRINCIPIANTE
│  └─ API_MAP.md (lectura completa)
│     └─ Guardar API_QUICK_REFERENCE.md
│
├─ DESARROLLADOR (en medio)
│  ├─ API_QUICK_REFERENCE.md (consulta)
│  └─ API_COMPARISON.md (decisiones)
│
└─ EXPERTO (investigación)
   ├─ api_map.json (datos crudos)
   └─ map_all_apis.py (código)
```

---

## 📋 Checklist: ¿Qué documento necesitas?

Responde estas preguntas:

1. **¿Es tu primera vez con estas APIs?**
   - Sí → API_MAP.md
   - No → Siguiente pregunta

2. **¿Buscas un parámetro o nombre de endpoint?**
   - Sí → API_QUICK_REFERENCE.md
   - No → Siguiente pregunta

3. **¿Necesitas elegir entre Sistema A o B?**
   - Sí → API_COMPARISON.md
   - No → Siguiente pregunta

4. **¿Necesitas ver respuestas JSON reales?**
   - Sí → API_MAP.md (ejemplos) o api_map.json
   - No → Tu problema probablemente esté en CLAUDE.md

---

## 🔗 Enlaces Rápidos

| Documento | Para qué | Enlace |
|-----------|----------|--------|
| Mapa completo | Aprenda detalles | [API_MAP.md](API_MAP.md) |
| Cheat sheet | Consulta rápida | [API_QUICK_REFERENCE.md](API_QUICK_REFERENCE.md) |
| Comparativa | Decisiones | [API_COMPARISON.md](API_COMPARISON.md) |
| Datos crudos | Análisis técnico | [api_map.json](scraper/api_map.json) |
| Proyecto general | Contexto completo | [CLAUDE.md](CLAUDE.md) |
| Este índice | Orientación | [API_INDEX.md](API_INDEX.md) |

---

## ⚙️ Herramientas Relacionadas

| Script | Qué hace | Ubicación |
|--------|----------|-----------|
| `map_all_apis.py` | Genera api_map.json | `scraper/` |
| `test_api.py` | Test manual y exploración | `scraper/` |
| `extractor.py` | Extrae datos (usa Sistema A) | `scraper/` |
| `json_generator.py` | Genera JSONs del dashboard | `scraper/` |

---

## 📝 Notas Importantes

### Sistema A (`detallefechas`)
- Cascada obligatoria (4-5 requests antes de partidos)
- **Parámetro:** `deporte=FÚTBOL` (con tilde)
- Devuelve detalles completos (alineaciones, goles)
- Datos históricos desde 2003

### Sistema B (Estadísticas)
- Directo, 1 request por endpoint
- **Parámetro:** `deporte=F` (sin tilde)
- Devuelve tablas y rankings
- Solo temporada activa (sin histórico)

### La regla más importante
**"FÚTBOL" con tilde = Sistema A**
**"F" sin tilde = Sistema B**

Esto causa bugs silenciosos si confundes.

---

## 🚀 Próximos Pasos

### Si estás comenzando
1. Lee API_MAP.md (20 min)
2. Guarda API_QUICK_REFERENCE.md como bookmark
3. Experimenta con URLs de ejemplo

### Si mantienes el código
1. Consulta API_QUICK_REFERENCE.md según necesites
2. Usa API_COMPARISON.md para decisiones arquitectónicas
3. Corre `map_all_apis.py` mensualmente

### Si descubres cambios
1. Actualiza los manuales
2. Corre `map_all_apis.py` para validar
3. Abre issue/PR al repo

