# Proyecto: Dashboard Histórico de Fútbol — Carrasco Lawn Tennis Club

## Objetivo

Sistema completo para extraer, almacenar y visualizar toda la historia de partidos de fútbol de **Carrasco Lawn Tennis** en la **Liga Universitaria de Deportes de Uruguay**. Incluye extracción histórica completa + actualización semanal automática + dashboard web público.

---

## Arquitectura (costo $0)

| Componente | Tecnología | Costo |
|---|---|---|
| **Extracción de datos** | Script Python corriendo en GitHub Actions (schedule + manual trigger) | Gratis (2000 min/mes free) |
| **Almacenamiento** | SQLite como DB intermedia → JSONs estáticos generados por el script | Gratis (archivos en el repo) |
| **Frontend / Dashboard** | Next.js o React estático desplegado en Vercel | Gratis (tier free de Vercel) |
| **Actualización semanal** | GitHub Actions cron → ejecuta script → commitea datos → Vercel auto-redeploy | Gratis |

**Flujo:** GitHub Actions (cron semanal) → Python extrae datos de la API → genera/actualiza SQLite → genera JSONs optimizados → commitea al repo → Vercel detecta push y redeploya automáticamente.

---

## API de la Liga Universitaria

**Base URL:** `https://ligauniversitaria.org.uy/detallefechas/api.php`

### Endpoints de navegación (cascada jerárquica)

Se recorren en orden para llegar a los partidos:

1. **Torneos:** `?action=cargarTorneos&temporada={N}&deporte=FÚTBOL`
   - Devuelve lista de objetos con campo `nombre`
   
2. **Series:** `?action=cargarSeries&temporada={N}&deporte=FÚTBOL&torneo={nombre}`
   - Devuelve lista de objetos con campo `nombre` (ej: "DIVISIONAL A", "DIVISIONAL B", etc.)

3. **Fechas:** `?action=cargarFechas&temporada={N}&deporte=FÚTBOL&torneo={nombre}&serie={nombre}`
   - Devuelve lista con campo `fecha` (número de ronda)

4. **Partidos:** `?action=cargarPartidos&temporada={N}&deporte=FÚTBOL&torneo={nombre}&serie={nombre}&fecha={N}`
   - Devuelve lista de partidos con campos: `ID`, `Fecha_Hora`, `Cancha`, `Locatario`, `Visitante`, `GL` (goles local), `GV` (goles visitante)

### Endpoints de detalle por partido (usando el ID del partido)

**IMPORTANTE sobre los nombres de action:** algunos llevan espacio y otros no. Respetar exactamente:

| Dato | Action (lado local) | Action (lado visitante) |
|---|---|---|
| Titulares | `Titulares Locatario` (con espacio) | `Titulares Visitante` (con espacio) |
| Cambios | `CambiosLocatario` (sin espacio) | `CambiosVisitante` (sin espacio) |
| Goles | `GolesLocatario` (sin espacio) | `GolesVisitante` (sin espacio) |
| Amonestados | `Amonestados Locatario` (con espacio) | `Amonestados Visitante` (con espacio) |
| Expulsados | `Expulsados Locatario` (con espacio) | `Expulsados Visitante` (con espacio) |

Todos se llaman con `?action={action}&id={partido_id}`

**Campos que devuelve cada endpoint:**

- **Titulares:** `carne` (ID jugador), `Nombre`, `camiseta`, `Capitan` (string, no vacío = sí)
- **Cambios:** `CarneSale`, `Jug_Sale`, `CarneEntra`, `Jug_Entra`, `camiseta`, `minutos`
- **Goles:** `carne`, `Nombre`, `minutos`, `EnContra` ("1" = gol en contra)
- **Amonestados:** campos similares (jugador, minuto)
- **Expulsados:** campos similares (jugador, minuto)

### Notas técnicas de la API

- **Rate limit:** respetar ~4 requests/segundo con retries y exponential backoff
- **Temporadas:** usan números enteros (99 es la más reciente conocida, bajar hasta que no devuelva datos)
- **Deporte:** siempre `FÚTBOL` (con tilde y mayúsculas)
- **Club:** filtrar partidos donde `Locatario` o `Visitante` == `CARRASCO LAWN TENNIS` (uppercase)
- **Lado CLT:** si CLT es el Locatario, consultar endpoints con "Locatario"; si es Visitante, con "Visitante"

---

## Alcance de datos

### Qué extraer (solo lado CLT)

- **Partidos:** temporada, torneo, serie, fecha/ronda, rival, si CLT fue local o visitante, resultado (goles a favor / en contra), cancha, fecha y hora
- **Titulares:** nombre, ID jugador (carne), número de camiseta, si fue capitán
- **Cambios:** quién sale, quién entra, minuto
- **Goles de CLT:** quién hizo el gol, minuto, si fue en contra
- **Amonestados CLT:** jugador, datos disponibles
- **Expulsados CLT:** jugador, datos disponibles
- **Del rival:** solo el nombre del equipo y el resultado (ya viene en los datos del partido, no se consultan endpoints de detalle del rival)

---

## Modelo de datos sugerido (SQLite)

```
matches (
  id, season, tournament, series, round, datetime, venue,
  home_team, away_team, score_home, score_away,
  clt_side [home|away], clt_goals_for, clt_goals_against, result [W|D|L]
)

players (
  carne [PK], name  -- tabla de lookup, se arma on-the-fly de los datos
)

match_starters (
  match_id, player_carne, player_name, shirt_number, is_captain
)

match_subs (
  match_id, player_out_carne, player_out_name, player_in_carne, player_in_name, shirt_number, minute
)

match_goals (
  match_id, player_carne, player_name, minute, is_own_goal
)

match_yellows (
  match_id, player_carne, player_name, minute
)

match_reds (
  match_id, player_carne, player_name, minute
)
```

---

## Dashboard — Funcionalidades

### Idioma: Español

### Vista "Historia" (página principal)

- **Tabla de todos los partidos** con filtros por:
  - Temporada
  - Torneo
  - Serie/categoría/divisional
  - Rival
  - Condición: local / visitante
  - Resultado: victoria / empate / derrota
- **Estadísticas agregadas** (se actualizan según los filtros aplicados):
  - Record total: partidos jugados, victorias, empates, derrotas
  - Goles a favor / en contra / diferencia
  - Rachas (mayor invicto, mayor racha ganadora)
- **Ranking de goleadores** (filtrable por temporada, torneo, serie)
- **Ranking de jugadores con más partidos** (titularidades + ingresos como cambio)
- **Detalle por partido** (al hacer click): alineación, goles, cambios, tarjetas

### Vista "Actualidad"

- Resultados de la última fecha / último fin de semana
- Próximos partidos si la API los tiene disponibles

### Filtros globales

Temporada, torneo, serie/categoría, jugador — aplicables en todas las vistas.

---

## Estilo visual

**Estética deportiva** inspirada en la identidad del Carrasco Lawn Tennis Club.

### Paleta de colores (extraída de la identidad del club)

| Uso | Color | Hex aproximado |
|---|---|---|
| **Primario** | Bordo / marrón oscuro (color dominante del club) | `#6B2D2D` |
| **Secundario** | Blanco (camiseta base) | `#FFFFFF` |
| **Acento** | Dorado / amarillo (estrella del escudo) | `#D4A843` |
| **Texto oscuro** | Marrón muy oscuro | `#3A1A1A` |
| **Fondo** | Crema / off-white suave | `#FAF6F1` |

### Dirección de diseño

- Look deportivo pero elegante, como un anuario o revista del club
- Tipografía con carácter: una display bold para títulos, una serif o sans-serif refinada para datos
- Las rayas verticales bordo y blanco del club pueden usarse como elemento decorativo sutil (bordes, headers, separadores)
- Tablas de datos limpias y legibles, con hover states en bordo
- Cards para estadísticas destacadas (goleador, jugador con más partidos, etc.)
- Responsive / mobile-first

---

## Fases sugeridas de implementación

1. **Diseño del modelo de datos** — tablas SQLite + esquema de los JSONs de salida para el frontend
2. **Script de extracción histórica** — Python, recorre todas las temporadas desde la más reciente hacia atrás hasta que no haya datos. Unifica la lógica de los 3 scripts de referencia en uno solo y más robusto.
3. **Script de generación de JSONs** — desde SQLite genera los JSONs que consume el frontend (particionados para performance: por temporada, agregados, etc.)
4. **Frontend dashboard** — React/Next.js con los filtros, tablas, y vistas descritas arriba
5. **GitHub Actions workflow** — cron semanal + extracción + generación de JSONs + commit + deploy
6. **Deploy a Vercel**

---

## Scripts de referencia

Se adjuntan 3 scripts Python que ya funcionan para extraer datos de la API. **Usarlos como referencia** para entender la API, los nombres de campos, las inconsistencias en los action names (espacios sí/no), y el approach de extracción. No copiarlos literalmente sino refactorizar en un script unificado más robusto con:

- Rate limiting global
- Retries con exponential backoff
- Logging estructurado
- Detección automática del rango de temporadas (bajar desde 99 hasta que no haya datos)
- Modo incremental (para la actualización semanal, solo procesar temporada actual)
- Sin muestreo aleatorio (el sampling fue un workaround para pruebas, en producción se procesan todas las fechas)

Archivos: `Codigo_CLT_Sep.py`, `titulares_cambios_goles_Sep.py`, `scrap_detalles_clt_Julio.py`