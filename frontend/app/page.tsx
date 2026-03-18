"use client"
import { useEffect, useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { Match, SeasonsData, Filters, AppearanceStat } from "@/lib/types"
import { loadMatches, loadSeasons, loadMatchDetail, loadPlayersStats, rival } from "@/lib/data"
import StatsBar from "@/components/StatsBar"
import FiltersPanel from "@/components/Filters"
import MatchTable from "@/components/MatchTable"
import { ScorersTable, AppearancesTable } from "@/components/RankingTable"
import type { ScorerWithSeasons } from "@/components/RankingTable"

// ── Índice jugador → set de match_ids ────────────────────────────────────────
type PlayerIndex = Map<string, Set<string>>

async function buildPlayerIndex(matchIds: string[]): Promise<PlayerIndex> {
  const idx: PlayerIndex = new Map()
  await Promise.all(
    matchIds.map(id =>
      loadMatchDetail(id).then(detail => {
        const add = (carne: string) => {
          if (!carne) return
          if (!idx.has(carne)) idx.set(carne, new Set())
          idx.get(carne)!.add(id)
        }
        for (const s of detail.starters) add(s.carne)
        for (const s of detail.subs)     add(s.in_carne)
      }).catch(() => {})
    )
  )
  return idx
}

// ── Rankings desde match_ids (con desglose por temporada) ────────────────────
async function computeRankings(matches: Match[]) {
  const scorersMap = new Map<string, { name: string; goals: number; bySeason: Map<number, number> }>()
  const appearMap  = new Map<string, { name: string; starters: number; subs_in: number }>()

  await Promise.all(
    matches.map(m =>
      loadMatchDetail(m.id).then(detail => {
        for (const g of detail.goals) {
          if (g.own_goal) continue
          const key = g.carne || g.name
          const prev = scorersMap.get(key) ?? { name: g.name, goals: 0, bySeason: new Map() }
          prev.goals += 1
          prev.bySeason.set(m.year, (prev.bySeason.get(m.year) ?? 0) + 1)
          scorersMap.set(key, prev)
        }
        for (const s of detail.starters) {
          const key = s.carne || s.name
          const prev = appearMap.get(key) ?? { name: s.name, starters: 0, subs_in: 0 }
          appearMap.set(key, { ...prev, name: s.name, starters: prev.starters + 1 })
        }
        for (const s of detail.subs) {
          const key = s.in_carne || s.in_name
          const prev = appearMap.get(key) ?? { name: s.in_name, starters: 0, subs_in: 0 }
          appearMap.set(key, { ...prev, name: s.in_name, subs_in: prev.subs_in + 1 })
        }
      }).catch(() => {})
    )
  )

  const scorers: ScorerWithSeasons[] = [...scorersMap.entries()]
    .map(([carne, v]) => ({
      carne,
      name: v.name,
      goals: v.goals,
      bySeason: [...v.bySeason.entries()].map(([year, goals]) => ({ year, goals })),
    }))
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name))

  const appearances: AppearanceStat[] = [...appearMap.entries()]
    .map(([carne, v]) => ({ carne, name: v.name, starters: v.starters, subs_in: v.subs_in, total: v.starters + v.subs_in }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))

  return { scorers, appearances }
}

// ── URL ↔ Filters ─────────────────────────────────────────────────────────────
function filtersFromParams(params: URLSearchParams): Filters {
  const getArr = (k: string) => params.getAll(k)
  return {
    seasons:     getArr("season"),
    tournaments: getArr("tournament"),
    series:      getArr("series"),
    rivals:      getArr("rival"),
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
  f.rivals.forEach(v      => p.append("rival",      v))
  f.sides.forEach(v       => p.append("side",       v))
  f.results.forEach(v     => p.append("result",     v))
  if (f.player)            p.set("player", f.player)
  return p.toString()
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function HistoriaPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [matches,     setMatches]     = useState<Match[]>([])
  const [seasonsData, setSeasonsData] = useState<SeasonsData | null>(null)
  const [players,     setPlayers]     = useState<AppearanceStat[]>([])
  const [playerIdx,   setPlayerIdx]   = useState<PlayerIndex>(new Map())
  const [loading,     setLoading]     = useState(true)

  const [tab,         setTab]         = useState<"partidos" | "goleadores" | "presencias">("partidos")
  const [scorers,     setScorers]     = useState<ScorerWithSeasons[]>([])
  const [appearances, setAppearances] = useState<AppearanceStat[]>([])
  const [rankLoading, setRankLoading] = useState(false)

  const filters = useMemo(() => filtersFromParams(searchParams), [searchParams])

  const setFilters = (f: Filters) => {
    const qs = filtersToParams(f)
    router.replace(qs ? `/?${qs}` : "/", { scroll: false })
  }

  useEffect(() => {
    Promise.all([loadMatches(), loadSeasons(), loadPlayersStats()])
      .then(([m, s, ps]) => {
        setMatches(m)
        setSeasonsData(s)
        setPlayers(ps.appearances)
        buildPlayerIndex(m.map(x => x.id)).then(setPlayerIdx)
      })
      .finally(() => setLoading(false))
  }, [])

  const filteredByMeta = useMemo(() => {
    return matches.filter(m => {
      if (filters.seasons.length     && !filters.seasons.includes(String(m.year)))         return false
      if (filters.tournaments.length && !filters.tournaments.includes(m.tournament))       return false
      if (filters.series.length      && !filters.series.includes(m.series))                return false
      if (filters.rivals.length      && !filters.rivals.includes(rival(m)))                return false
      if (filters.sides.length       && !filters.sides.includes(m.clt_side))              return false
      if (filters.results.length     && !filters.results.includes(m.result ?? ""))        return false
      return true
    })
  }, [matches, filters])

  const filtered = useMemo(() => {
    if (!filters.player) return filteredByMeta
    const matchSet = playerIdx.get(filters.player)
    if (!matchSet) return []
    return filteredByMeta.filter(m => matchSet.has(m.id))
  }, [filteredByMeta, filters.player, playerIdx])

  useEffect(() => {
    if (tab === "partidos") return
    setRankLoading(true)
    computeRankings(filtered)
      .then(({ scorers, appearances }) => {
        setScorers(scorers)
        setAppearances(appearances)
      })
      .finally(() => setRankLoading(false))
  }, [tab, filtered])

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-gray-400">Cargando datos...</div>
  }

  return (
    <div>
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

      {tab === "partidos" && <MatchTable matches={filtered} />}

      {tab === "goleadores" && (
        rankLoading
          ? <div className="text-center py-8 text-gray-400 text-sm">Calculando...</div>
          : <div className="max-w-lg"><ScorersTable scorers={scorers} /></div>
      )}

      {tab === "presencias" && (
        rankLoading
          ? <div className="text-center py-8 text-gray-400 text-sm">Calculando...</div>
          : <div className="max-w-lg"><AppearancesTable appearances={appearances} /></div>
      )}
    </div>
  )
}
