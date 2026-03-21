"use client"
import { useEffect, useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import type { Match, MatchDetail, AppearanceStat } from "@/lib/types"
import { loadMatches, loadMatchDetail, loadPlayersStats, rival, formatDate, toProperCase } from "@/lib/data"
import ResultBadge from "@/components/ResultBadge"
import MatchModal from "@/components/MatchModal"
import { Search, Home, Plane } from "lucide-react"

interface PlayerProfile {
  carne: string
  name: string
  matches: { match: Match; started: boolean; goals: number; yellows: number; reds: number }[]
  totalGoals: number
  totalYellows: number
  totalReds: number
  totalStarts: number
  totalSubs: number
  goalsBySeason: Map<number, number>
}

type MatchFilter = "titular" | "suplente" | "goles" | "amarilla" | "roja" | "V" | "E" | "D"

export default function JugadorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [players, setPlayers] = useState<AppearanceStat[]>([])
  const [query, setQuery] = useState("")
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [activeFilters, setActiveFilters] = useState<Set<MatchFilter>>(new Set())
  const [modal, setModal] = useState<{ match: Match; detail: MatchDetail; allMatches: Match[] } | null>(null)

  // carne comes from the URL
  const selectedCarne = searchParams.get("carne")

  useEffect(() => {
    Promise.all([loadMatches(), loadPlayersStats()])
      .then(([m, ps]) => {
        setAllMatches(m)
        setPlayers(ps.appearances)
      })
      .finally(() => setLoading(false))
  }, [])

  // When players load and there's a carne in the URL, pre-fill the search box
  useEffect(() => {
    if (!selectedCarne || players.length === 0) return
    const player = players.find(p => p.carne === selectedCarne)
    if (player) setQuery(toProperCase(player.name))
  }, [selectedCarne, players])

  const filtered = useMemo(() => {
    if (query.length < 2 || selectedCarne) return []
    const q = query.toLowerCase()
    return players
      .filter(p => p.name.toLowerCase().includes(q))
      .slice(0, 20)
  }, [players, query, selectedCarne])

  // Load player profile when carne changes
  useEffect(() => {
    if (!selectedCarne || allMatches.length === 0 || players.length === 0) return
    setProfileLoading(true)
    setProfile(null)

    const player = players.find(p => p.carne === selectedCarne)
    if (!player) { setProfileLoading(false); return }

    Promise.all(
      allMatches.map(m =>
        loadMatchDetail(m.id).then(detail => ({ match: m, detail })).catch(() => null)
      )
    ).then(results => {
      const playerMatches: PlayerProfile["matches"] = []
      const goalsBySeason = new Map<number, number>()
      let totalGoals = 0, totalYellows = 0, totalReds = 0, totalStarts = 0, totalSubs = 0

      for (const r of results) {
        if (!r) continue
        const { match, detail } = r

        const started = detail.starters.some(s => s.carne === selectedCarne)
        const subbedIn = detail.subs.some(s => s.in_carne === selectedCarne)
        if (!started && !subbedIn) continue

        if (started) totalStarts++
        else totalSubs++

        const goals = detail.goals.filter(g => g.carne === selectedCarne && !g.own_goal).length
        const yellows = detail.yellows.filter(y => y.name.toLowerCase() === player.name.toLowerCase()).length
        const reds = detail.reds.filter(rd => rd.name.toLowerCase() === player.name.toLowerCase()).length

        totalGoals += goals
        totalYellows += yellows
        totalReds += reds

        if (goals > 0) {
          goalsBySeason.set(match.year, (goalsBySeason.get(match.year) ?? 0) + goals)
        }

        playerMatches.push({ match, started, goals, yellows, reds })
      }

      playerMatches.sort((a, b) => {
        if (!a.match.datetime) return 1
        if (!b.match.datetime) return -1
        return new Date(b.match.datetime).getTime() - new Date(a.match.datetime).getTime()
      })

      setProfile({
        carne: selectedCarne,
        name: player.name,
        matches: playerMatches,
        totalGoals, totalYellows, totalReds, totalStarts, totalSubs, goalsBySeason,
      })
      setProfileLoading(false)
    })
  }, [selectedCarne, allMatches, players])

  function selectPlayer(carne: string, name: string) {
    setQuery(toProperCase(name))
    setActiveFilters(new Set())
    router.replace(`/jugador?carne=${encodeURIComponent(carne)}`, { scroll: false })
  }

  function clearPlayer() {
    setQuery("")
    setProfile(null)
    setActiveFilters(new Set())
    router.replace("/jugador", { scroll: false })
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Cargando...</div>
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#6B2D2D" }}>Jugadores</h1>
        <p className="text-sm text-gray-500 mt-1">Buscá un jugador para ver su ficha completa</p>
      </div>

      {/* Search bar */}
      <div className="relative mb-6">
        <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 shadow-sm" style={{ borderColor: "#D4A843" }}>
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value)
              if (selectedCarne) clearPlayer()
            }}
            placeholder="Escribí el nombre del jugador..."
            className="w-full text-sm focus:outline-none bg-transparent"
          />
          {selectedCarne && (
            <button onClick={clearPlayer} className="text-gray-400 hover:text-gray-600 shrink-0 text-lg leading-none">&times;</button>
          )}
        </div>

        {/* Autocomplete dropdown */}
        {filtered.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ borderColor: "#D4A843" }}>
            {filtered.map(p => (
              <button
                key={p.carne}
                onClick={() => selectPlayer(p.carne, p.name)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#FAF6F1] transition-colors flex items-center justify-between border-b last:border-b-0"
                style={{ borderColor: "#F0E8DF" }}
              >
                <span className="font-medium">{toProperCase(p.name)}</span>
                <span className="text-xs text-gray-400">{p.total} partidos</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Player profile */}
      {profileLoading && (
        <div className="text-center py-12 text-gray-400 text-sm">Cargando ficha del jugador...</div>
      )}

      {profile && !profileLoading && (
        <div className="space-y-4">
          {/* Header card */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: "#F0E8DF" }}>
            <div className="h-1 flex">
              <div className="flex-1" style={{ backgroundColor: "#6B2D2D" }} />
              <div className="flex-1 bg-white" />
              <div className="flex-1" style={{ backgroundColor: "#6B2D2D" }} />
              <div className="flex-1 bg-white" />
              <div className="flex-1" style={{ backgroundColor: "#6B2D2D" }} />
            </div>
            <div className="p-4 sm:p-6">
              <h2 className="text-xl font-bold mb-4" style={{ color: "#6B2D2D" }}>
                {toProperCase(profile.name)}
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <MiniStat label="Partidos" value={profile.totalStarts + profile.totalSubs} />
                <MiniStat label="Titular" value={profile.totalStarts} />
                <MiniStat label="Suplente" value={profile.totalSubs} />
                <MiniStat label="Goles" value={profile.totalGoals} color="#16a34a" />
                <MiniStat label="Amarillas" value={profile.totalYellows} color="#ca8a04" />
                <MiniStat label="Rojas" value={profile.totalReds} color="#dc2626" />
              </div>
            </div>
          </div>

          {/* Goals by season */}
          {profile.goalsBySeason.size > 0 && (
            <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: "#F0E8DF" }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#6B2D2D" }}>
                Goles por temporada
              </h3>
              <div className="flex flex-wrap gap-2">
                {[...profile.goalsBySeason.entries()]
                  .sort((a, b) => b[0] - a[0])
                  .map(([year, goals]) => (
                    <div key={year} className="flex items-center gap-1.5 px-2 py-1 rounded text-sm" style={{ backgroundColor: "#16a34a10" }}>
                      <span className="text-gray-500 text-xs">{year}</span>
                      <span className="font-bold" style={{ color: "#16a34a" }}>{goals}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Match history */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: "#F0E8DF" }}>
            <div className="px-4 py-2 border-b" style={{ borderColor: "#F0E8DF", backgroundColor: "#FDFAF7" }}>
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6B2D2D" }}>
                Historial de partidos
              </h3>
            </div>

            {/* Filter chips */}
            <div className="px-4 py-2.5 flex flex-wrap gap-1.5 border-b" style={{ borderColor: "#F0E8DF" }}>
              {(
                [
                  { key: "titular",  label: "Titular" },
                  { key: "suplente", label: "Suplente" },
                  { key: "goles",    label: "⚽ Con goles" },
                  { key: "amarilla", label: "🟨 Amarilla" },
                  { key: "roja",     label: "🟥 Roja" },
                  { key: "V",        label: "Victoria" },
                  { key: "E",        label: "Empate" },
                  { key: "D",        label: "Derrota" },
                ] as { key: MatchFilter; label: string }[]
              ).map(({ key, label }) => {
                const on = activeFilters.has(key)
                return (
                  <button
                    key={key}
                    onClick={() => setActiveFilters(prev => {
                      const next = new Set(prev)
                      on ? next.delete(key) : next.add(key)
                      return next
                    })}
                    className="text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors"
                    style={on
                      ? { backgroundColor: "#6B2D2D", color: "white", borderColor: "#6B2D2D" }
                      : { backgroundColor: "white", color: "#6B2D2D", borderColor: "#D4A843" }}
                  >
                    {label}
                  </button>
                )
              })}
              {activeFilters.size > 0 && (
                <button
                  onClick={() => setActiveFilters(new Set())}
                  className="text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors"
                  style={{ backgroundColor: "white", color: "#dc2626", borderColor: "#dc2626" }}
                >
                  Limpiar
                </button>
              )}
            </div>

            {(() => {
              const visibleMatches = profile.matches.filter(({ match: m, started, goals, yellows, reds }) => {
                if (activeFilters.size === 0) return true
                if (activeFilters.has("titular")  && !started)      return false
                if (activeFilters.has("suplente") && started)       return false
                if (activeFilters.has("goles")    && goals === 0)   return false
                if (activeFilters.has("amarilla") && yellows === 0) return false
                if (activeFilters.has("roja")     && reds === 0)    return false
                if (activeFilters.has("V") && m.result !== "W")     return false
                if (activeFilters.has("E") && m.result !== "D")     return false
                if (activeFilters.has("D") && m.result !== "L")     return false
                return true
              })
              return (
                <>
                  <div className="px-4 py-1.5 text-[11px] text-gray-400">
                    {visibleMatches.length} partido{visibleMatches.length !== 1 ? "s" : ""}
                    {activeFilters.size > 0 ? " (filtrado)" : ""}
                  </div>
                  <div className="divide-y" style={{ borderColor: "#F0E8DF" }}>
                    {visibleMatches.map(({ match: m, started, goals, yellows, reds }) => (
                      <button
                        key={m.id}
                        onClick={() => loadMatchDetail(m.id).then(detail => setModal({ match: m, detail, allMatches: visibleMatches.map(x => x.match) }))}
                        className="w-full text-left flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 hover:bg-[#FAF6F1] transition-colors"
                      >
                        <ResultBadge result={m.result} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="font-medium truncate">vs {rival(m)}</span>
                            <span className="text-gray-300 shrink-0">·</span>
                            <span className="font-mono text-xs shrink-0">{m.gf}-{m.ga}</span>
                          </div>
                          <div className="text-[10px] text-gray-400 flex items-center gap-1">
                            {m.clt_side === "home" ? <Home size={8} /> : <Plane size={8} />}
                            <span>{formatDate(m.datetime)}</span>
                            <span>· {m.tournament}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {started
                            ? <span className="text-[9px] px-1 py-0.5 rounded font-medium" style={{ backgroundColor: "#6B2D2D", color: "white" }}>TIT</span>
                            : <span className="text-[9px] px-1 py-0.5 rounded font-medium bg-gray-200 text-gray-600">SUP</span>}
                          {goals > 0 && <span className="text-xs">⚽{goals > 1 ? `×${goals}` : ""}</span>}
                          {yellows > 0 && <span className="w-2.5 h-3 rounded-sm inline-block" style={{ backgroundColor: "#facc15" }} />}
                          {reds > 0 && <span className="w-2.5 h-3 rounded-sm inline-block" style={{ backgroundColor: "#dc2626" }} />}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {!selectedCarne && query.length < 2 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          Escribí al menos 2 letras para buscar un jugador.
        </div>
      )}

      {modal && (
        <MatchModal
          match={modal.match}
          detail={modal.detail}
          allMatches={modal.allMatches}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-bold" style={{ color: color ?? "#3A1A1A" }}>{value}</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
    </div>
  )
}
