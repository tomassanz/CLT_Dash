"use client"
import { useEffect, useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { Match, MatchDetail, SeasonsData, Filters, AppearanceStat, ScorerStat, SeriesLeagueContext, PlayerIndex } from "@/lib/types"
import { loadMatches, loadSeasons, loadMatchDetail, loadPlayersStats, loadPlayerIndex, loadLeagueContext } from "@/lib/data"
import StatsBar from "@/components/StatsBar"
import FiltersPanel from "@/components/Filters"
import MatchTable from "@/components/MatchTable"
import MatchModal from "@/components/MatchModal"
import { ScorersTable, AppearancesTable } from "@/components/RankingTable"
import type { ScorerWithSeasons } from "@/components/RankingTable"

// ── URL ↔ Filters ─────────────────────────────────────────────────────────────
function filtersFromParams(params: URLSearchParams): Filters {
  const getArr = (k: string) => params.getAll(k)
  return {
    seasons:     getArr("season"),
    tournaments: getArr("tournament"),
    series:      getArr("series"),
    sides:       getArr("side"),
    results:     getArr("result"),
    player:      params.get("player") ?? "",
  }
}

function filtersToParams(f: Filters): string {
  const p = new URLSearchParams()
  f.seasons.forEach(v     => p.append("season",     v))
  f.tournaments.forEach(v => p.append("tournament", v))
  f.series.forEach(v      => p.append("series",     v))
  f.sides.forEach(v       => p.append("side",       v))
  f.results.forEach(v     => p.append("result",     v))
  if (f.player)            p.set("player", f.player)
  return p.toString()
}

// ── Componente: Contexto de liga ──────────────────────────────────────────────
function LeagueContextPanel({ ctxList, filters }: { ctxList: SeriesLeagueContext[]; filters: Filters }) {
  const CLT = "CARRASCO LAWN TENNIS"
  const isCLT = (name: string) => name.toUpperCase().includes(CLT)

  if (filters.seasons.length !== 1) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm text-gray-500"
           style={{ borderColor: "#F0E8DF", background: "#FDFAF6" }}>
        Seleccioná una <strong>temporada</strong> para ver el contexto de la liga.
      </div>
    )
  }

  if (ctxList.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-center text-sm text-gray-500"
           style={{ borderColor: "#F0E8DF", background: "#FDFAF6" }}>
        No hay datos de liga disponibles para esta temporada.
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {ctxList.map((ctx, ctxIdx) => (
        <div key={ctxIdx} className="space-y-6">
          {/* Tabla de posiciones */}
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "#6B2D2D" }}>
              Tabla de posiciones
              {ctx.clt_rank && (
                <span className="text-xs font-normal px-2 py-0.5 rounded-full"
                  style={{ background: "#FFF8EC", color: "#D4A843", border: "1px solid #D4A843" }}>
                  CLT #{ctx.clt_rank}
                </span>
              )}
            </h3>
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "#F0E8DF" }}>
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "#6B2D2D", color: "white" }}>
                    <th className="text-left px-3 py-2 font-medium">#</th>
                    <th className="text-left px-3 py-2 font-medium">Club</th>
                    <th className="text-center px-2 py-2 font-medium">PJ</th>
                    <th className="text-center px-2 py-2 font-medium">PG</th>
                    <th className="text-center px-2 py-2 font-medium">PE</th>
                    <th className="text-center px-2 py-2 font-medium">PP</th>
                    <th className="text-center px-2 py-2 font-medium">GF</th>
                    <th className="text-center px-2 py-2 font-medium">GC</th>
                    <th className="text-center px-2 py-2 font-medium">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {ctx.standings.map((row, i) => {
                    const clt = isCLT(row.institution)
                    return (
                      <tr key={i}
                          style={{
                            background: clt ? "#FFF8EC" : i % 2 === 0 ? "white" : "#FDFAF6",
                            fontWeight: clt ? 700 : 400,
                            color: clt ? "#6B2D2D" : "#3A1A1A",
                          }}>
                        <td className="px-3 py-2">{row.rank}</td>
                        <td className="px-3 py-2">
                          {row.institution}
                          {clt && <span className="ml-1 text-xs" style={{ color: "#D4A843" }}>★</span>}
                        </td>
                        <td className="text-center px-2 py-2">{row.pj}</td>
                        <td className="text-center px-2 py-2">{row.pg}</td>
                        <td className="text-center px-2 py-2">{row.pe}</td>
                        <td className="text-center px-2 py-2">{row.pp}</td>
                        <td className="text-center px-2 py-2">{row.gf}</td>
                        <td className="text-center px-2 py-2">{row.gc}</td>
                        <td className="text-center px-2 py-2 font-bold">{row.points}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Goleadores de la liga */}
          {ctx.scorers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "#6B2D2D" }}>
                Goleadores de la liga
              </h3>
              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "#F0E8DF" }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "#6B2D2D", color: "white" }}>
                      <th className="text-left px-3 py-2 font-medium">#</th>
                      <th className="text-left px-3 py-2 font-medium">Jugador</th>
                      <th className="text-left px-3 py-2 font-medium">Club</th>
                      <th className="text-center px-2 py-2 font-medium">Goles</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ctx.scorers.map((row, i) => {
                      const clt = isCLT(row.institution)
                      return (
                        <tr key={i}
                            style={{
                              background: clt ? "#FFF8EC" : i % 2 === 0 ? "white" : "#FDFAF6",
                              fontWeight: clt ? 700 : 400,
                              color: clt ? "#6B2D2D" : "#3A1A1A",
                            }}>
                          <td className="px-3 py-2">{i + 1}</td>
                          <td className="px-3 py-2">
                            {row.player}
                            {clt && <span className="ml-1 text-xs" style={{ color: "#D4A843" }}>★</span>}
                          </td>
                          <td className="px-3 py-2">{row.institution}</td>
                          <td className="text-center px-2 py-2 font-bold">{row.goals}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Valla menos vencida */}
          {ctx.goalkeepers.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2" style={{ color: "#6B2D2D" }}>
                Valla menos vencida
              </h3>
              <div className="overflow-x-auto rounded-lg border" style={{ borderColor: "#F0E8DF" }}>
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "#6B2D2D", color: "white" }}>
                      <th className="text-left px-3 py-2 font-medium">#</th>
                      <th className="text-left px-3 py-2 font-medium">Arquero</th>
                      <th className="text-left px-3 py-2 font-medium">Club</th>
                      <th className="text-center px-2 py-2 font-medium">GR</th>
                      <th className="text-center px-2 py-2 font-medium">PJ</th>
                      <th className="text-center px-2 py-2 font-medium">GR/PJ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ctx.goalkeepers.map((row, i) => {
                      const clt = isCLT(row.institution)
                      return (
                        <tr key={i}
                            style={{
                              background: clt ? "#FFF8EC" : i % 2 === 0 ? "white" : "#FDFAF6",
                              fontWeight: clt ? 700 : 400,
                              color: clt ? "#6B2D2D" : "#3A1A1A",
                            }}>
                          <td className="px-3 py-2">{i + 1}</td>
                          <td className="px-3 py-2">
                            {row.player}
                            {clt && <span className="ml-1 text-xs" style={{ color: "#D4A843" }}>★</span>}
                          </td>
                          <td className="px-3 py-2">{row.institution}</td>
                          <td className="text-center px-2 py-2">{row.gr}</td>
                          <td className="text-center px-2 py-2">{row.matches}</td>
                          <td className="text-center px-2 py-2 font-bold">{row.ppp?.toFixed(2)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function HistoriaPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [matches,     setMatches]     = useState<Match[]>([])
  const [seasonsData, setSeasonsData] = useState<SeasonsData | null>(null)
  const [players,     setPlayers]     = useState<AppearanceStat[]>([])
  const [playerIdx,   setPlayerIdx]   = useState<PlayerIndex>({})
  const [allScorers,  setAllScorers]  = useState<ScorerStat[]>([])
  const [allAppear,   setAllAppear]   = useState<AppearanceStat[]>([])
  const [loading,     setLoading]     = useState(true)

  const [tab,         setTab]         = useState<"partidos" | "goleadores" | "presencias">("partidos")
  const [leagueCtxList, setLeagueCtxList] = useState<SeriesLeagueContext[]>([])
  const [modal, setModal] = useState<{ match: Match; detail: MatchDetail } | null>(null)

  function openMatch(m: Match) {
    loadMatchDetail(m.id).then(detail => setModal({ match: m, detail }))
  }

  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams])

  const setFilters = (f: Filters) => {
    const qs = filtersToParams(f)
    router.replace(qs ? `/historia?${qs}` : "/historia", { scroll: false })
  }

  // Cargar league_context una sola vez
  const [leagueData, setLeagueData] = useState<Record<string, SeriesLeagueContext[]> | null>(null)

  useEffect(() => {
    Promise.all([loadMatches(), loadSeasons(), loadPlayersStats(), loadPlayerIndex()])
      .then(([m, s, ps, pidx]) => {
        setMatches(m)
        setSeasonsData(s)
        setPlayers(ps.appearances)
        setAllScorers(ps.scorers)
        setAllAppear(ps.appearances)
        setPlayerIdx(pidx)
      })
      .finally(() => setLoading(false))
    loadLeagueContext().then(setLeagueData).catch(() => {})
  }, [])

  const filteredByMeta = useMemo(() => {
    return matches.filter(m => {
      if (filters.seasons.length     && !filters.seasons.includes(String(m.year)))         return false
      if (filters.tournaments.length && !filters.tournaments.includes(m.tournament))       return false
      if (filters.series.length      && !filters.series.includes(m.series))                return false
      if (filters.sides.length       && !filters.sides.includes(m.clt_side))              return false
      if (filters.results.length     && !filters.results.includes(m.result ?? ""))        return false
      return true
    })
  }, [matches, filters])

  const filtered = useMemo(() => {
    if (!filters.player) return filteredByMeta
    const matchIds = playerIdx[filters.player]
    if (!matchIds) return []
    const matchSet = new Set(matchIds)
    return filteredByMeta.filter(m => matchSet.has(m.id))
  }, [filteredByMeta, filters.player, playerIdx])

  // Resolver contexto de liga para la(s) temporada(s) seleccionadas
  useEffect(() => {
    if (!leagueData) return
    const { seasons } = filters
    if (seasons.length === 1) {
      // seasons guarda el año (ej "2025"), hay que convertir a season number (año - 1913)
      const seasonNum = String(parseInt(seasons[0]) - 1913)
      setLeagueCtxList(leagueData[seasonNum] ?? [])
    } else {
      setLeagueCtxList([])
    }
  }, [filters, leagueData])

  // Filtrar rankings según los partidos filtrados
  const filteredMatchIds = useMemo(() => new Set(filtered.map(m => m.id)), [filtered])

  const scorers: ScorerWithSeasons[] = useMemo(() => {
    // Si no hay filtros activos, usar todos los scorers
    const hasFilters = filters.seasons.length || filters.tournaments.length || filters.series.length || filters.sides.length || filters.results.length || filters.player
    if (!hasFilters) {
      return allScorers.map(s => ({ ...s }))
    }
    // Con filtros: solo incluir jugadores que participaron en los partidos filtrados
    return allScorers
      .filter(s => {
        const matchIds = playerIdx[s.carne]
        return matchIds?.some(id => filteredMatchIds.has(id))
      })
      .map(s => {
        // Filtrar bySeason si hay filtro de temporada
        if (filters.seasons.length) {
          const yearSet = new Set(filters.seasons.map(Number))
          const filteredSeasons = s.bySeason.filter(bs => yearSet.has(bs.year))
          const totalGoals = filteredSeasons.reduce((sum, bs) => sum + bs.goals, 0)
          return { ...s, goals: totalGoals, bySeason: filteredSeasons }
        }
        return { ...s }
      })
      .filter(s => s.goals > 0)
      .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))
  }, [allScorers, playerIdx, filteredMatchIds, filters])

  const appearances: AppearanceStat[] = useMemo(() => {
    const hasFilters = filters.seasons.length || filters.tournaments.length || filters.series.length || filters.sides.length || filters.results.length || filters.player
    if (!hasFilters) return allAppear
    // Solo mostrar jugadores que participaron en partidos filtrados
    return allAppear
      .filter(a => {
        const matchIds = playerIdx[a.carne]
        return matchIds?.some(id => filteredMatchIds.has(id))
      })
  }, [allAppear, playerIdx, filteredMatchIds, filters])

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-gray-400">Cargando datos...</div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#6B2D2D" }}>Historia</h1>
        <p className="text-sm text-gray-500 mt-1">
          Todos los partidos de CLT en la Liga Universitaria de Deportes
        </p>
      </div>

      <StatsBar matches={filtered} />

      <div className="clt-stripe-hr mb-4" />

      {seasonsData && (
        <FiltersPanel
          data={seasonsData}
          filters={filters}
          players={players}
          onChange={setFilters}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b" style={{ borderColor: "#F0E8DF" }}>
        {(["partidos", "goleadores", "presencias"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
            style={{
              borderColor: tab === t ? "#6B2D2D" : "transparent",
              color: tab === t ? "#6B2D2D" : "#6b7280",
            }}
          >
            {t === "partidos"
              ? `Partidos (${filtered.length})`
              : t === "goleadores"
              ? "Goleadores"
              : "Más presencias"}
          </button>
        ))}
      </div>

      {tab === "partidos" && <MatchTable matches={filtered} onOpen={openMatch} />}

      {tab === "goleadores" && (
        <div className="max-w-lg"><ScorersTable scorers={scorers} /></div>
      )}

      {tab === "presencias" && (
        <div className="max-w-lg"><AppearancesTable appearances={appearances} /></div>
      )}

      {modal && (
        <MatchModal
          match={modal.match}
          detail={modal.detail}
          allMatches={filtered}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
