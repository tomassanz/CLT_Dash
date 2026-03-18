# CLT Dashboard — Guía completa para agentes

## Qué es este proyecto

Dashboard web público que muestra toda la historia de partidos de fútbol del **Carrasco Lawn Tennis Club (CLT)** en la **Liga Universitaria de Deportes de Uruguay**. Incluye extracción automática de datos, base de datos local, y un frontend web.

**URL de la API de datos:** `https://ligauniversitaria.org.uy/detallefechas/api.php`
**Costo de infraestructura:** $0 (GitHub Actions + Vercel free tier)
**Usuario:** no técnico — explicar todo en términos simples.

---

## Estado actual del proyecto (al 18/03/2026)

### URLs de producción
- **Sitio live:** https://clt-futbol-historia.vercel.app
- **GitHub repo:** https://github.com/tomassanz/CLT_Dash (privado)
- **Vercel project:** tomas-projects-4252e6bd/frontend

### ✅ Completado

| Componente | Estado | Notas |
|---|---|---|
| `scraper/test_api.py` | ✅ Listo | Script de reconocimiento/diagnóstico de la API |
| `scraper/extractor.py` | ✅ Listo | Extractor unificado, probado |
| `scraper/json_generator.py` | ✅ Listo | Generador de JSONs estáticos |
| `frontend/` | ✅ En producción | Next.js 16 en https://clt-futbol-historia.vercel.app |
| **Datos históricos** | ✅ Completos | 1688 partidos, temporadas 2003–2025 (90–112) |
| **Deploy Vercel** | ✅ Live | Conectado a GitHub — auto-redeploy en cada push a main |
| **GitHub repo** | ✅ Privado | https://github.com/tomassanz/CLT_Dash |

### ⏳ Pendiente

| Tarea | Prioridad | Detalle |
|---|---|---|
| **GitHub Actions (cron semanal)** | 🟡 Próxima instancia | Automatización semanal `.github/workflows/update.yml`. Corre `--incremental` cada domingo y hace push automático. |

### Cómo deployar cambios
Vercel está conectado a GitHub. Cualquier `git push origin main` redespliega el sitio automáticamente en ~1 minuto.

---

## Arquitectura

```
CLT_Dash/
  scraper/
    extractor.py        ← Baja datos de la API → SQLite
    json_generator.py   ← SQLite → JSONs estáticos
    test_api.py         ← Diagnóstico/reconocimiento de la API
    requirements.txt    ← Solo: requests==2.32.3
    clt.db              ← Base de datos SQLite (NO commitear a git)
    .venv/              ← Entorno virtual Python (NO commitear a git)
  frontend/
    app/
      page.tsx                  ← Vista "Historia" (página principal)
      actualidad/page.tsx       ← Vista "Actualidad"
      partido/[id]/page.tsx     ← Detalle de partido
      layout.tsx                ← Header, nav, footer
      globals.css               ← Paleta de colores CLT + Tailwind
    components/
      Filters.tsx               ← Panel de filtros (temporada/torneo/serie/rival/condición/resultado)
      MatchTable.tsx            ← Tabla de partidos
      StatsBar.tsx              ← Cards de estadísticas (PJ, W, D, L, GF, GA, %)
      RankingTable.tsx          ← Tablas de goleadores y presencias
      ResultBadge.tsx           ← Badge V/E/D con color
    lib/
      types.ts                  ← Interfaces TypeScript de todos los datos
      data.ts                   ← Funciones para cargar los JSONs + helpers
    public/
      data/
        matches.json            ← Todos los partidos (compacto)
        seasons.json            ← Metadatos para filtros (temporadas, torneos, series, rivales)
        players_stats.json      ← Rankings goleadores + presencias
        last_updated.json       ← Timestamp de última actualización
        match/
          {id}.json             ← Detalle de cada partido (alineación, goles, cambios, tarjetas)
  .github/
    workflows/
      (vacío — pendiente crear update.yml)
  Prompt.md             ← Documento original de requerimientos del usuario
  CLAUDE.md             ← Este archivo
```

---

## Flujo de datos

```
API Liga Universitaria
    ↓ (scraper/extractor.py)
scraper/clt.db  [SQLite — NO va al repo]
    ↓ (scraper/json_generator.py)
frontend/public/data/*.json  [van al repo, son los datos del frontend]
    ↓ (git push → Vercel detecta)
Sitio web público en Vercel
```

---

## API de la Liga Universitaria — Resumen técnico

**Base URL:** `https://ligauniversitaria.org.uy/detallefechas/api.php`

### Endpoints (cascada jerárquica)

```
1. cargarTorneos?temporada={N}&deporte=FÚTBOL
2. cargarSeries?temporada={N}&deporte=FÚTBOL&torneo={nombre}
3. cargarFechas?temporada={N}&deporte=FÚTBOL&torneo={nombre}&serie={nombre}
4. cargarPartidos?temporada={N}&deporte=FÚTBOL&torneo={nombre}&serie={nombre}&fecha={N}
```

### Endpoints de detalle por partido

```
Titulares {Locatario|Visitante}    — action con ESPACIO
CambiosLocatario / CambiosVisitante — sin espacio
GolesLocatario / GolesVisitante     — sin espacio
Amonestados {Locatario|Visitante}  — con ESPACIO
Expulsados {Locatario|Visitante}   — con ESPACIO
```

### Campos reales confirmados por testing (distintos al Prompt original)

| Endpoint | Campos reales |
|---|---|
| Titulares | `carne`, `Nombre`, `camiseta`, `Capitan` |
| Cambios | `CarneSale`, `Jug_Sale`, `CarneEntra`, `Jug_Entra`, `camiseta`, `minutos` |
| Goles | `carne`, `Nombre`, `minutos`, `EnContra` ("1" = gol en contra) |
| **Amonestados** | **Solo `Nombre`** — sin `carne` ni `minuto` |
| **Expulsados** | **`Nombre`, `observaciones`** — sin `carne` |

### Comportamiento de la API ante datos vacíos

- Cuando no hay datos → devuelve `{"error": "..."}` (NO una lista vacía `[]`)
- Temporada sin torneos → devuelve `[]`
- Sin parámetros → devuelve HTML vacío (no JSON)

### Rango de temporadas

- **Mínima conocida:** 90
- **Máxima con datos actualmente:** 112 (la 113 aún no tiene torneos cargados en la API)
- El extractor detecta automáticamente la última temporada al arrancar

### Filtro CLT

Filtrar partidos donde `Locatario` o `Visitante` sea exactamente `"CARRASCO LAWN TENNIS"` (uppercase).

---

## Modelo de datos SQLite

```sql
matches           -- partidos (uno por partido de CLT)
players           -- tabla de lookup jugadores (carne → nombre)
match_starters    -- titulares de CLT
match_subs        -- cambios de CLT
match_goals       -- goles de CLT (incluye en contra)
match_yellows     -- amarillas de CLT (solo Nombre, sin carne)
match_reds        -- rojas de CLT (Nombre + observations)
processed_matches -- control de qué partidos ya tienen detalle descargado
```

El campo `clt_side` en `matches` es `"home"` o `"away"` (en la API se llama `"Locatario"` o `"Visitante"`).

---

## Cómo correr cada script

### Requisitos previos

```bash
cd scraper/
python3 -m venv .venv           # solo la primera vez
.venv/bin/pip install requests  # solo la primera vez
```

### Extracción histórica completa (una sola vez)

```bash
cd scraper/
.venv/bin/python extractor.py --full
```

Esto procesa temporadas 90 a 112 (~24 temporadas). **Puede tardar 4-8 horas.** Solo se corre una vez desde la Mac. Usa sampling inteligente (consulta 3 fechas por serie para detectar si CLT jugó; si no, saltea la serie).

### Extracción incremental (cron semanal)

```bash
cd scraper/
.venv/bin/python extractor.py --incremental
```

Solo procesa la última temporada con datos. Ideal para el cron automático.

### Generar JSONs (después de cualquier extracción)

```bash
cd scraper/
.venv/bin/python json_generator.py
```

Genera/actualiza todos los archivos en `frontend/public/data/`.

### Correr el frontend localmente

```bash
cd frontend/
npm run dev
# Abre http://localhost:3000
```

---

## Paleta de colores CLT

| Uso | Color | Hex |
|---|---|---|
| Primario (bordo) | Fondo header, títulos, bordes | `#6B2D2D` |
| Acento (dorado) | Estrella capitán, línea decorativa, selects | `#D4A843` |
| Texto oscuro | Texto principal | `#3A1A1A` |
| Fondo crema | Fondo del sitio | `#FAF6F1` |
| Verde victoria | Badge V | `#16a34a` |
| Amarillo empate | Badge E | `#ca8a04` |
| Rojo derrota | Badge D | `#dc2626` |

---

## Funcionalidades del dashboard

### Vista Historia (`/`)
- Tabla de partidos con filtros en cascada: Temporada → Torneo → Serie → Rival → Condición (local/visita) → Resultado
- Cards de estadísticas que se actualizan según los filtros activos (PJ, W, D, L, GF, GA, % victorias)
- Tabs: Partidos | Goleadores | Más presencias
- Click en partido → navega a `/partido/[id]`

### Vista Detalle partido (`/partido/[id]`)
- Cabecera con marcador, resultado, torneo, serie, fecha, cancha
- Titulares (número de camiseta, nombre, ★ si capitán)
- Cambios (minuto, sale, entra)
- Goles CLT (minuto, jugador; goles en contra marcados)
- Disciplina (🟨 amarillas, 🟥 rojas con observaciones)

### Vista Actualidad (`/actualidad`)
- Últimos resultados de la temporada actual (agrupados por fecha)
- Próximos partidos si la API los tiene cargados

---

## Próximos pasos (en orden)

### Paso 1 — Extracción histórica completa 🔴

```bash
cd /Users/tomassanz/CLT_Dash/scraper
.venv/bin/python extractor.py --full
# Luego:
.venv/bin/python json_generator.py
```

Esto poblará el dashboard con datos de todas las temporadas (90–112). Actualmente solo tiene la 112.

### Paso 2 — Revisar y ajustar el frontend

Con datos completos, el usuario debe revisar:
- Filtros funcionan correctamente
- Estadísticas son correctas
- Vista de detalle de partido se ve bien
- Vista Actualidad muestra los datos correctos
- Diseño visual en mobile y desktop

### Paso 3 — GitHub Actions (automatización semanal)

Crear `.github/workflows/update.yml` con:
- Trigger: cron domingo 9am UTC (6am Uruguay) + `workflow_dispatch` (manual)
- Steps: checkout → python → `extractor.py --incremental` → `json_generator.py` → git commit JSONs → git push
- El SQLite se genera y descarta en el mismo job (nunca se pushea)

### Paso 4 — Deploy en Vercel

1. Crear cuenta en vercel.com (gratis)
2. Subir el repo a GitHub (si no está)
3. Conectar el repo en Vercel → configurar root directory = `frontend/`
4. Vercel despliega automáticamente en cada push

### Paso 5 — Primer push con datos históricos completos

Una vez que la extracción del Paso 1 termine y el frontend esté validado, hacer el primer push al repo de GitHub. Vercel detectará el push y desplegará el sitio público.

---

## Archivos que NO van al repositorio git

```
scraper/clt.db       ← Base de datos SQLite (grande, binaria, temporal)
scraper/.venv/       ← Entorno virtual Python
frontend/.next/      ← Build artifacts de Next.js
frontend/node_modules/
```

Agregar al `.gitignore`:
```
scraper/clt.db
scraper/.venv/
.next/
node_modules/
```

---

## Scripts de referencia originales (no usar, solo consultar)

Los 3 scripts originales del usuario están en la raíz del proyecto:
- `Codigo_CLT_Sep.py` — extractor de partidos (tiene bug de race condition en rate limiter)
- `titulares_cambios_goles_Sep.py` — extractor de detalles
- `scrap_detalles_clt_Julio.py` — versión anterior más simple

Fueron reemplazados por `scraper/extractor.py` que unifica todo y corrige los bugs.
