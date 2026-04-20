# CLT Dashboard — Guía completa para agentes

## Qué es este proyecto

Dashboard web público que muestra toda la historia de partidos de fútbol del **Carrasco Lawn Tennis Club (CLT)** en la **Liga Universitaria de Deportes de Uruguay**. Incluye extracción automática de datos, base de datos local, y un frontend web.

**URL de la API de datos:** `https://ligauniversitaria.org.uy/detallefechas/api.php`
**Costo de infraestructura:** $0 (GitHub Actions + Vercel free tier)
**Usuario:** no técnico — explicar todo en términos simples.

---

## Estado actual del proyecto (al 14/04/2026 — actualizado sesión 5)

### 📚 Documentación de APIs (NUEVA — Marzo 2026)

**📁 Carpeta completa:** [`docs/api/`](docs/api/)

Mapeo exhaustivo de TODAS las APIs — **Validado en vivo el 22/03/2026:**

| # | Documento | Para qué | Lectura |
|---|-----------|----------|---------|
| 0️⃣ | **[docs/api/00_INDEX.md](docs/api/00_INDEX.md)** 🎯 | Índice maestro — empieza aquí | 2 min |
| 1️⃣ | **[docs/api/01_DECISION_TREE.md](docs/api/01_DECISION_TREE.md)** 🌳 | Árbol de decisión (qué sistema) | 3 min |
| 2️⃣ | **[docs/api/02_MAP.md](docs/api/02_MAP.md)** 📖 | Mapa exhaustivo con ejemplos | 15 min |
| 3️⃣ | **[docs/api/03_QUICK_REFERENCE.md](docs/api/03_QUICK_REFERENCE.md)** ⚡ | Cheat sheet (guardar bookmark) | 2 min |
| 4️⃣ | **[docs/api/04_COMPARISON.md](docs/api/04_COMPARISON.md)** ⚖️ | Comparativa Sistema A vs B | 10 min |
| 5️⃣ | **[docs/api/05_URLS_EXAMPLES.md](docs/api/05_URLS_EXAMPLES.md)** 🔗 | URLs + ejemplos (curl, Python, JS) | 5 min |
| 🟢 | **[docs/api/07_LIVE_EXAMPLES.md](docs/api/07_LIVE_EXAMPLES.md)** 🟢 | Respuestas REALES consultadas hoy | 3 min |
| 📊 | **[docs/api/06_TECHNICAL_REPORT.json](docs/api/06_TECHNICAL_REPORT.json)** | Reporte técnico (datos crudos) | - |
| 🔧 | **[docs/api/generate_report.py](docs/api/generate_report.py)** | Script validación (regenera reporte) | - |

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
| `scraper/json_generator.py` | ✅ Listo | Genera matches, seasons, match details, player_index, players_stats, league_context, last_updated, **fixtures_live** |
| `frontend/` | ✅ En producción | Next.js 16 en https://www.cltfutbol.com.uy |
| **Datos históricos** | ✅ Completos | ~2029 partidos, temporadas 2003–2026 (90–113) |
| **Deploy Vercel** | ✅ Live | Conectado a GitHub — auto-redeploy en cada push a main |
| **GitHub repo** | ✅ Público | https://github.com/tomassanz/CLT_Dash |
| **GitHub Pages (backup)** | ✅ Live | https://tomassanz.github.io/CLT_Dash/ — mirror automático |
| **Static export** | ✅ Listo | `output: "export"` — 0 edge requests en Vercel |
| **APIs de liga (Sistema B)** | ✅ En producción | Tablas T113: Mayores, Reserva, Sub-20, Sub-18, Sub-16, Sub-14, Presenior, Más 40 |
| **Modal de partido** | ✅ Listo | `MatchModal.tsx` con flechas ← → para navegar entre partidos filtrados |
| **Página Jugadores mejorada** | ✅ Listo | Filtros de rol/goles/tarjetas, modal con flechas, jugador en URL |
| **Datos T113** | ✅ Completos | 8 categorías (may, res, s20, s18, s16, s14, pre, +40) + tablas de posiciones |
| **Actualidad — Resultados** | ✅ Listo | Cards por categoría: último resultado (sin posición en tabla) |
| **Actualidad — Tablas** | ✅ Listo | Standings completos con CLT resaltado + goleadores, tabs por categoría (8 categorías) |
| **Actualidad — Próximos (fixtures live)** | ✅ Listo | `fixtures_live.json` generado por `json_generator.py` desde APIs Sistema B. 8 categorías. Sub-18/16/14 con vuelta tentativa (ida_vuelta). Muestra marcador si jugado, cancha si confirmada, badge PRÓXIMO. Partidos tentativos atenuados con borde punteado. |

### ⏳ Pendiente

| Tarea | Prioridad | Detalle |
|---|---|---|
| **GitHub Actions (cron semanal)** | 🔴 Próxima instancia | `.github/workflows/update.yml`. Corre `extractor.py --incremental` + `json_generator.py` cada domingo y hace push automático. El `json_generator.py` ya incluye fixtures_live al final. |
| **Fixtures juveniles: vuelta real** | 🟢 Cuando la liga los cargue | Sub-18/16/14 tienen vuelta tentativa generada. Cuando la liga cargue los partidos de vuelta en la API, el próximo `json_generator.py` los reemplazará automáticamente (los tentativos desaparecen porque el rival aparecerá con ambas localías). |
| **Fixtures: partidos suspendidos/reprogramados** | 🟡 Futuro | Como fixtures_live viene directo de la API, si la liga actualiza la fecha de un partido reprogramado, se refleja automáticamente en el próximo `json_generator.py`. No hay problema de sync como había con el JSON estático. |

### Hosting y deploy

El sitio es **100% estático** (`output: "export"` en Next.js). No hay servidor, no hay APIs, no hay SSR. Esto permite hostearlo en cualquier servicio de archivos estáticos.

#### Dos deploys en paralelo (automáticos)

Cada `git push origin main` dispara **ambos** deploys simultáneamente:

| Hosting | URL | Mecanismo | Límites |
|---|---|---|---|
| **Vercel** (principal) | https://www.cltfutbol.com.uy | Auto-deploy al detectar push en GitHub | 1M edge requests/mes (plan Hobby gratuito, se renueva el 1 de cada mes) |
| **GitHub Pages** (backup) | https://tomassanz.github.io/CLT_Dash/ | GitHub Actions workflow (`.github/workflows/gh-pages.yml`) | Sin límites de requests |

#### Dominio `cltfutbol.com.uy`

Registrado en **NIC Uruguay**. Hoy apunta a Vercel con esta configuración DNS:

| Registro | Tipo | Valor actual (Vercel) | TTL |
|---|---|---|---|
| `@` | A | `216.198.79.1` | 24 hrs |
| `www` | CNAME | `3322827bebbe183c.vercel-dns-01...` | 24 hrs |

#### Cambiar dominio a GitHub Pages (plan de emergencia)

Si se agotan los edge requests de Vercel, cambiar el dominio sin tocar código:

1. **En NIC Uruguay** (https://nic.com.uy → login → dominio → Configuración avanzada):
   - Cambiar registro **A** (`@`): de `216.198.79.1` → **`185.199.108.153`**
   - Cambiar registro **CNAME** (`www`): de `3322827bebbe...` → **`tomassanz.github.io`**
2. **En GitHub:** repo → Settings → Pages → Custom domain → escribir `www.cltfutbol.com.uy` → Save
3. Esperar propagación DNS (~24 hrs por el TTL, pero suele ser más rápido)

Para volver a Vercel, revertir los valores DNS a los originales de la tabla de arriba.

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
        fixtures.json           ← Fixtures estáticos (solo Más 40 desde fixtures originales; Mayores/Reserva/Sub20/Presenior/Más40 ahora vienen de fixtures_live.json)
        fixtures_live.json      ← Calendario CLT generado desde APIs Sistema B (5 categorías, jugados + próximos)
        match/
          {id}.json             ← Detalle de cada partido (alineación, goles, cambios, tarjetas)
  .github/
    workflows/
      gh-pages.yml        ← Deploy automático a GitHub Pages en cada push a main
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

**⚠️ IMPORTANTE — Cada categoría usa su propio `categoria` (no siempre es `1`):**

**Combos validados en vivo para temporada 113:**

| Categoría | torneo | categoria | serie | Label en DB | Validado |
|-----------|--------|-----------|-------|-------------|----------|
| Mayores Div A | `2` | `1` | `A` | `T2/A` | 14/04/2026 |
| Reserva | `2B` | `2` | `RS1` | `T2B/RS1` | 14/04/2026 |
| Sub-20 Div A | `20` | `20` | `20A` | `T20/20A` | 14/04/2026 |
| Sub-18 Div 3 | `18` | `18` | `18-3-` | `T18/18-3-` | 20/04/2026 |
| Sub-16 Div 3 | `16` | `16` | `16-3-` | `T16/16-3-` | 20/04/2026 |
| Sub-14 Serie 1 | `14` | `14` | `S14S1` | `T14/S14S1` | 20/04/2026 |
| Presenior Div B | `32` | `32` | `PSB` | `T32/PSB` | 14/04/2026 |
| Más 40 Div B | `40` | `40` | `M40S2` | `T40/M40S2` | 14/04/2026 |

**Nota Sub-16:** CLT no aparece en posiciones (no jugó en fecha 1 — solo 4 equipos del grupo jugaron), pero sí en `/partidos/` como próximo.
**Nota Sub-14:** la serie usa código `S14S1` (no `14-N-` como las demás). Sin resultados todavía, 12 equipos.

El scraper (`fetch_league_season_data`) tiene `KNOWN_CATEGORY_COMBOS` con estos valores. Se prueban primero antes del brute-force de mayores.

#### fixtures_live.json — Calendario CLT desde el Sistema B

**Archivo:** `frontend/public/data/fixtures_live.json`  
**Generado por:** `json_generator.py` → función `gen_fixtures_live(season)`  
**Se regenera automáticamente** cada vez que se corre `json_generator.py`

Combina `resultados/api.php` (partidos jugados, con marcador) + `partidos/api.php` (próximos) para cada categoría, filtrando solo los partidos de CLT.

**Categorías en `FIXTURE_CATEGORIES` (json_generator.py):**

| id | name | torneo | categoria | serie | ida_vuelta |
|----|------|--------|-----------|-------|------------|
| `mayores` | Mayores | `2` | `1` | `A` | No |
| `reserva` | Reserva | `2B` | `2` | `RS1` | No |
| `sub20` | Sub-20 | `20` | `20` | `20A` | No |
| `sub18` | Sub-18 | `18` | `18` | `18-3-` | Sí |
| `sub16` | Sub-16 | `16` | `16` | `16-3-` | Sí |
| `sub14` | Sub-14 | `14` | `14` | `S14S1` | Sí |
| `presenior` | Presenior | `32` | `32` | `PSB` | No |
| `mas40` | Más 40 | `40` | `40` | `M40S2` | No |

**Campos por partido:**
```json
{
  "fecha": 2,
  "date": "2026-04-19",
  "opponent": "Old Woodlands Club",
  "home": false,
  "played": false,
  "time": "09:00",
  "venue": "Complejo Woodlands School"
}
```
Para partidos jugados se agregan: `"played": true, "score_home": 1, "score_away": 4`
Para partidos de vuelta tentativos: `"tentative": true` — generados invirtiendo la localía cuando la API solo tiene ida. Se muestran atenuados con borde punteado y "2ª Rueda (fecha a confirmar)".

**Nota importante:** `score_home`/`score_away` son siempre **local/visitante del partido** (igual que `matches.json`), NO goles de CLT. El frontend calcula el resultado de CLT a partir de `home: true/false`.

**Categorías juveniles (Sub-18/16/14):** tienen `ida_vuelta: True` en `FIXTURE_CATEGORIES`. El generador crea partidos de vuelta tentativos (invirtiendo localía) cuando la API solo tiene ida. Los tentativos se reemplazan automáticamente cuando la liga los carga en la API.

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

Tiene 3 tabs: **Resultados | Tablas | Próximos**

**Tab Resultados:**
- Cards por categoría (Mayores, Reserva, Sub-20, Presenior, Más 40) mostrando el último partido jugado de T113
- Badge V/E/D + marcador (local-visitante) + fecha + Local/Visitante
- Click en card abre MatchModal con navegación entre partidos de T113
- Categorías sin tabla de liga (ej: Más 40) aparecen al final como cards simples

**Tab Tablas:**
- Tabs por categoría: Mayores | Reserva | Sub-20 | Presenior | Más 40
- Tabla completa de posiciones con CLT resaltado en dorado
- Top 8 goleadores de la serie debajo de la tabla

**Tab Próximos (fixtures live):**
- Carga `fixtures_live.json` (generado por el scraper desde las APIs del Sistema B)
- Tabs por categoría + tabs punteados para Sub-18/16/14 (pendientes)
- Partidos jugados: atenuados, muestran marcador en color (verde/amarillo/rojo según resultado CLT)
- Partidos próximos: badge PRÓXIMO en el siguiente, cancha si está confirmada (oculta si dice "CANCHA A FIJAR")
- `score_home`/`score_away` = siempre local/visitante del partido (no de CLT)
- El badge PRÓXIMO usa `played: false` directamente (no fecha calendario)

### Sistema de Fixtures

**`fixtures_live.json`** (principal para Mayores/Reserva/Sub-20/Presenior/Más 40):
- Generado automáticamente por `json_generator.py` → `gen_fixtures_live()`
- Fuente: `resultados/api.php` (jugados) + `partidos/api.php` (próximos) por categoría
- Se actualiza solo con cada corrida del scraper — si la liga reprograma un partido, el próximo json_generator lo refleja

**`fixtures.json`** (fallback para categorías sin API):
- Sub-18, Sub-16, Sub-14 cuando estén disponibles
- El frontend filtra categorías que ya están en `fixtures_live.json` (`LIVE_CATEGORY_IDS`)

**Orden de categorías en la UI:** Mayores → Reserva → Presenior → Más 40 → Sub-20 → Sub-18 → Sub-16 → Sub-14

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

## IMPORTANTE el usuario no es tecnico, explicar cambios y pasos de manera simple