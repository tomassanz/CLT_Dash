# CLT Dashboard — Guía completa para agentes

## Qué es este proyecto

Dashboard web público que muestra toda la historia de partidos de fútbol del **Carrasco Lawn Tennis Club (CLT)** en la **Liga Universitaria de Deportes de Uruguay**. Incluye extracción automática de datos, base de datos local, y un frontend web.

**URL de la API de datos:** `https://ligauniversitaria.org.uy/detallefechas/api.php`
**Costo de infraestructura:** $0 (GitHub Actions + Vercel free tier)
**Usuario:** no técnico — explicar todo en términos simples.

---

## Estado actual del proyecto (al 18/03/2026 — actualizado sesión 2)

### URLs de producción
- **Sitio live (Vercel):** https://www.cltfutbol.com.uy — dominio principal, apunta a Vercel
- **Sitio backup (GitHub Pages):** https://tomassanz.github.io/CLT_Dash/ — mirror automático, sin límites de requests
- **GitHub repo:** https://github.com/tomassanz/CLT_Dash (público)
- **Vercel project:** https://vercel.com/tomas-projects-4252e6bd/clt_futbol

### ✅ Completado

| Componente | Estado | Notas |
|---|---|---|
| `scraper/test_api.py` | ✅ Listo | Script de reconocimiento/diagnóstico de la API |
| `scraper/extractor.py` | ✅ Listo | Extractor unificado + tablas de liga (Sistema B) |
| `scraper/json_generator.py` | ✅ Listo | Genera matches, seasons, match details, player_index, players_stats, league_context, last_updated |
| `frontend/` | ✅ En producción | Next.js 16 en https://www.cltfutbol.com.uy |
| **Datos históricos** | ✅ Completos | ~1860 partidos, temporadas 2003–2025 (90–112) |
| **Deploy Vercel** | ✅ Live | Conectado a GitHub — auto-redeploy en cada push a main |
| **GitHub repo** | ✅ Público | https://github.com/tomassanz/CLT_Dash |
| **GitHub Pages (backup)** | ✅ Live | https://tomassanz.github.io/CLT_Dash/ — mirror automático |
| **Static export** | ✅ Listo | `output: "export"` — 0 edge requests en Vercel |
| **APIs de liga (Sistema B)** | ✅ En producción (BETA) | Tab "Liga" visible con badge BETA + aviso de solo 2025 |
| **Modal de partido** | ✅ Listo | `MatchModal.tsx` con flechas ← → para navegar entre partidos filtrados |
| **Página Jugadores mejorada** | ✅ Listo | Filtros de rol/goles/tarjetas, modal con flechas, jugador en URL |
| **Datos históricos parchados** | ✅ Completos | ~1860 partidos post-patch de todas las temporadas (90–112) |

### ⏳ Pendiente

| Tarea | Prioridad | Detalle |
|---|---|---|
| **GitHub Actions (cron semanal)** | 🔴 Próxima instancia | `.github/workflows/update.yml`. Corre `--incremental` cada domingo y hace push automático. |
| **Tab "Liga" — ampliar a más temporadas** | 🟡 Futuro | Hoy solo tiene datos de temporada 112 (2025). Ver Paso 3 abajo. |

### Hosting y deploy

El sitio es **100% estático** (`output: "export"` en Next.js). No hay servidor, no hay APIs, no hay SSR. Esto permite hostearlo en cualquier servicio de archivos estáticos.

#### Dos deploys en paralelo (automáticos)

Cada `git push origin main` dispara **ambos** deploys simultáneamente:

| Hosting | URL | Mecanismo | Límites |
|---|---|---|---|
| **Vercel** (principal) | https://www.cltfutbol.com.uy | Auto-deploy al detectar push en GitHub | 1M edge requests/mes (plan Hobby gratuito, se renueva el 1 de cada mes) |
| **GitHub Pages** (backup) | https://tomassanz.github.io/CLT_Dash/ | GitHub Actions workflow (`.github/workflows/gh-pages.yml`) | Sin límites de requests |

#### Dominio `cltfutbol.com.uy`

Hoy apunta a Vercel. Si se agotan los edge requests de Vercel, se puede redirigir el dominio a GitHub Pages sin tocar código:
1. En el DNS del dominio, cambiar el CNAME para que apunte a `tomassanz.github.io`
2. En GitHub repo → Settings → Pages → Custom domain → poner `www.cltfutbol.com.uy`
3. Listo — el sitio sigue funcionando igual pero servido desde GitHub Pages (gratis, sin límites)

#### Diferencia técnica entre ambos builds

- **Vercel:** build normal, `basePath` = `/` (raíz)
- **GitHub Pages:** build con `GITHUB_PAGES=true`, `basePath` = `/CLT_Dash` (subdirectorio). Configurado en `next.config.ts` con variable de entorno.

#### Optimizaciones de edge requests (marzo 2026)

Se redujo el consumo de ~2,000 edge requests/visita a ~100:
- Eliminado `cache: "no-store"` en `data.ts`
- Precalculado `player_index.json` (mapeo jugador→partidos) para evitar cargar 2,027 archivos JSON
- Precalculado `bySeason` en `players_stats.json` para rankings sin requests adicionales
- Activado `output: "export"` para que Vercel sirva desde CDN sin edge functions

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
        player_index.json       ← Mapeo carne → [match_ids] (evita cargar 2000+ archivos)
        players_stats.json      ← Rankings goleadores (con bySeason) + presencias
        league_context.json     ← Tablas de posiciones/goleadores/valla del Sistema B por temporada
        last_updated.json       ← Timestamp de última actualización
        match/
          {id}.json             ← Detalle de cada partido (alineación, goles, cambios, tarjetas)
  .github/
    workflows/
      gh-pages.yml        ← Deploy automático a GitHub Pages en cada push a main
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

## APIs de la Liga Universitaria — Resumen técnico

Hay **dos sistemas de APIs completamente distintos**. Es crítico no confundirlos.

---

### Sistema A — API de detallefechas (la que ya usábamos)

**Base URL:** `https://ligauniversitaria.org.uy/detallefechas/api.php`

Usa `deporte=FÚTBOL` (con tilde) y nombres de torneo/serie como strings largos.

#### Endpoints (cascada jerárquica)

```
1. cargarTorneos?temporada={N}&deporte=FÚTBOL
2. cargarSeries?temporada={N}&deporte=FÚTBOL&torneo={nombre}
3. cargarFechas?temporada={N}&deporte=FÚTBOL&torneo={nombre}&serie={nombre}
4. cargarPartidos?temporada={N}&deporte=FÚTBOL&torneo={nombre}&serie={nombre}&fecha={N}
```

#### Endpoints de detalle por partido

```
Titulares {Locatario|Visitante}     — action con ESPACIO
CambiosLocatario / CambiosVisitante — sin espacio
GolesLocatario / GolesVisitante     — sin espacio
Amonestados {Locatario|Visitante}  — con ESPACIO
Expulsados {Locatario|Visitante}   — con ESPACIO
```

#### Campos reales confirmados

| Endpoint | Campos reales |
|---|---|
| Titulares | `carne`, `Nombre`, `camiseta`, `Capitan` |
| Cambios | `CarneSale`, `Jug_Sale`, `CarneEntra`, `Jug_Entra`, `camiseta`, `minutos` |
| Goles | `carne`, `Nombre`, `minutos`, `EnContra` ("1" = gol en contra) |
| Amonestados | Solo `Nombre` — sin `carne` ni `minuto` |
| Expulsados | `Nombre`, `observaciones` — sin `carne` |

#### Comportamiento ante datos vacíos

- Sin datos → devuelve `{"error": "..."}` (NO lista vacía)
- Temporada sin torneos → devuelve `[]`
- Sin parámetros → devuelve HTML vacío (no JSON)

---

### Sistema B — APIs de estadísticas de liga (nuevas, distintas)

Descubiertas en marzo 2026. Usan **parámetros completamente diferentes** al Sistema A:
- `deporte=F` (sin tilde, solo una letra)
- `torneo=<id_numerico>` (ej: `2`) — NO el nombre del torneo
- `serie=<codigo_corto>` (ej: `AT`, `APD`, `BT`) — NO el nombre de la serie
- `categoria=1` (siempre)

**IMPORTANTE:** No hay endpoint que devuelva los IDs/códigos disponibles. Hay que descubrirlos probando combinaciones (ver `fetch_league_season_data` en extractor.py).

Para la categoría de mayores masculino: `torneo=2`. Los códigos de serie más comunes son `AT`, `APD`, `BT`, `BPD`, `CT`, `CPD`, `DT`, `DPD`, `ET`, `EPD`, `FT`, `FPD`, `GT`, `GPD`, `A`, `B`, `C`, `D`, `E`, `F`, `G`.

En temporada 112 confirmado: `torneo=2, serie=AT` y `torneo=2, serie=A` tienen CLT.

#### Los 5 endpoints del Sistema B

| URL base | action | Campos devueltos |
|---|---|---|
| `/posiciones/api.php` | `cargarPosiciones` | `Institucion, PJ, PG, PE, PP, GF, GC, Puntos` |
| `/resultados/api.php` | `cargarPartidos` | `Fecha, Fecha_Hora, Cancha, Locatario, GL, Visitante, GV, ID` |
| `/partidos/api.php` | `cargarPartidos` | Igual a resultados — para temporada activa devuelve próximos partidos |
| `/goleadores/api.php` | `cargarPartidos` | `Jugador, Institucion, goles` |
| `/valla_menos_vencida/api.php` | `cargarPartidos` | `Jugador, Institución, GR, partidos, ppp` (GR=goles recibidos, ppp=GR/partidos) |

Ejemplo de URL completa:
```
https://ligauniversitaria.org.uy/posiciones/api.php?action=cargarPosiciones&temporada=112&deporte=F&torneo=2&categoria=1&serie=AT
```

#### Comportamiento

- Sin datos → devuelve `[]` (lista vacía, no error)
- `/partidos/` devuelve `[]` para temporadas terminadas; solo tiene datos para la temporada activa con partidos futuros aún no jugados

---

### Rango de temporadas

- **Mínima conocida:** 90
- **Máxima con datos actualmente:** 112 (la 113 todavía sin torneos en la API)
- El extractor detecta automáticamente la última temporada al arrancar

### Filtro CLT

Filtrar donde `Locatario` o `Visitante` sea exactamente `"CARRASCO LAWN TENNIS"` (uppercase).

---

## Modelo de datos SQLite

```sql
-- Partidos de CLT
matches           -- un registro por partido de CLT
players           -- lookup jugadores (carne → nombre)
match_starters    -- titulares de CLT
match_subs        -- cambios de CLT
match_goals       -- goles de CLT (incluye en contra)
match_yellows     -- amarillas de CLT (solo Nombre, sin carne)
match_reds        -- rojas de CLT (Nombre + observations)
processed_matches -- control de qué partidos ya tienen detalle descargado

-- Estadísticas de liga (Sistema B — pobladas por fetch_league_season_data)
league_standings    -- tabla de posiciones por temporada/label de serie
league_scorers      -- goleadores de la liga por temporada/label
league_goalkeepers  -- valla menos vencida por temporada/label
```

El campo `clt_side` en `matches` es `"home"` o `"away"` (en la API: `"Locatario"` o `"Visitante"`).

Las tablas de liga usan `tournament` y `series` con el mismo valor = label del tipo `"T2/AT"` (donde T2 = torneo_id=2, AT = código de serie). Esto es porque el Sistema B no tiene nombres de torneo, solo IDs.

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

### Nav order
Actualidad → Historia → Jugadores (en ese orden en el header)

### Componente MatchModal (`components/MatchModal.tsx`)
Modal reutilizable para ver el detalle de un partido sin salir de la página.
- Props: `match`, `detail`, `onClose`, `allMatches?` (lista para navegar con flechas)
- Cierra con X, click fuera, o tecla Escape
- Flechas ← → (también teclas del teclado) navegan por `allMatches`
- Muestra contador "N de Total" cuando hay lista
- Usado en Historia (`page.tsx`) y Jugadores (`jugador/page.tsx`)

### Vista Historia (`/`)
- Tabla de partidos con filtros en cascada: Temporada → Torneo → Serie → Condición → Resultado → Jugador
- El filtro de **rival fue eliminado** (estaba antes, se quitó)
- Cards de estadísticas que se actualizan según los filtros activos (PJ, W, D, L, GF, GA, % victorias)
- Tabs: **Actualidad | Historia | Jugadores** (nav) y **Partidos | Goleadores | Más presencias | Liga** (tabs internos)
- Click en fila de partido → abre `MatchModal` con navegación entre los partidos filtrados (toda la fila es clickeable, sin botón "Ver")
- Tab **Liga** (BETA): tabla de posiciones, goleadores y valla menos vencida del Sistema B. Solo disponible para 2025. Muestra badge "BETA" + aviso explicativo.

### Vista Detalle partido (`/partido/[id]`)
- Sigue existiendo como página directa (navegación directa por URL)
- Cabecera con marcador, resultado, torneo, serie, fecha, cancha
- Titulares: número de camiseta, nombre, badge "C" dorado para capitán (no estrella)
- Cambios (minuto, sale, entra)
- Goles CLT (minuto, jugador; goles en contra marcados)
- Disciplina (🟨 amarillas, 🟥 rojas con observaciones)

### Vista Jugadores (`/jugador`)
- Buscador con autocomplete (mínimo 2 letras)
- El jugador seleccionado se guarda en la URL (`?carne=...`) — si volvés atrás o recargás, mantiene el jugador
- Ficha completa: estadísticas totales (partidos, titular, suplente, goles, amarillas, rojas) + goles por temporada
- Historial de partidos clickeable (toda la barra) → abre `MatchModal` con flechas para navegar
- **Filtros del historial** (chips togglables, combinables):
  - Titular / Suplente
  - ⚽ Con goles
  - 🟨 Amarilla / 🟥 Roja
  - Victoria / Empate / Derrota
- Las flechas del modal navegan por los partidos del jugador **con los filtros activos** aplicados

### Vista Actualidad (`/actualidad`)
- Últimos resultados de la temporada actual (agrupados por fecha)
- Próximos partidos si la API los tiene cargados

---

## Componentes frontend — resumen

| Archivo | Qué hace |
|---|---|
| `app/page.tsx` | Historia: filtros, tabla, tabs, modal |
| `app/jugador/page.tsx` | Ficha de jugador con buscador, filtros, modal |
| `app/actualidad/page.tsx` | Últimos partidos y próximos de la temporada activa |
| `app/partido/[id]/page.tsx` | Detalle de partido (página directa) |
| `app/layout.tsx` | Header, nav (orden: Actualidad → Historia → Jugadores), footer |
| `components/MatchModal.tsx` | Modal de detalle + flechas de navegación |
| `components/MatchTable.tsx` | Tabla de partidos (filas clickeables, sin botón "Ver") |
| `components/Filters.tsx` | Panel de filtros con dropdowns y chips |
| `components/StatsBar.tsx` | Cards de estadísticas resumidas |
| `components/RankingTable.tsx` | Tablas goleadores y presencias |
| `components/ResultBadge.tsx` | Badge V/E/D con color |
| `lib/types.ts` | Interfaces TypeScript de todos los datos |
| `lib/data.ts` | Funciones de carga de JSONs + helpers (rival, formatDate, toProperCase) |

---

## Próximos pasos (en orden)

### Paso 1 — GitHub Actions (automatización semanal) 🔴

Crear `.github/workflows/update.yml` con:
- Trigger: cron domingo 9am UTC (6am Uruguay) + `workflow_dispatch` (manual)
- Steps: checkout → python setup → `extractor.py --incremental` → `json_generator.py` → git commit JSONs → git push
- El SQLite se genera y descarta en el mismo job (nunca se pushea)
- El cron ya incluye automáticamente la extracción de datos de liga (Sistema B) al final de `process_season`

### Paso 2 — Diseño del tab "Liga" en el frontend

El backend está listo (`league_context.json` generado, tipos TypeScript definidos). Falta decidir:
- ¿Mostrar solo la Divisional A de mayores o todas las tablas encontradas?
- ¿Relacionarlo con los filtros de Historia o mostrarlo por separado?
- ¿Dónde ponerlo: tab en Historia, sección en Actualidad, o página propia?

El código del tab "Liga" en `page.tsx` existe pero está a modo de borrador. Revisar antes de habilitar en producción.

### Paso 3 — Extracción histórica de liga para todas las temporadas

El `fetch_league_season_data` hoy solo tiene datos de temporada 112. Para poblar histórico:

```bash
cd scraper/
# Correr por cada temporada que interese (puede ser lento por el discovery):
for season in $(seq 90 112); do
  .venv/bin/python -c "
import sqlite3, extractor
conn = extractor.db_connect()
extractor.db_init(conn)
extractor.fetch_league_season_data(conn, $season)
conn.close()
"
done
.venv/bin/python json_generator.py
```

Nota: muchas temporadas antiguas pueden no tener datos en el Sistema B (la API de posiciones puede no tener histórico).

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

## IMPORTANTE el usuario no es tecnico, explicar cambios y pasos de manera simple