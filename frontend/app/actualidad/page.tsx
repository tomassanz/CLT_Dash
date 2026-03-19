"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import type { Match, MatchDetail, LastUpdated, SeriesLeagueContext } from "@/lib/types"
import { loadMatches, loadLastUpdated, loadMatchDetail, loadLeagueContext, formatDate, toProperCase } from "@/lib/data"
import ResultBadge from "@/components/ResultBadge"
import { Home, Plane, MapPin, Calendar, Trophy } from "lucide-react"

export default function ActualidadPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [details, setDetails] = useState<Map<string, MatchDetail>>(new Map())
  const [lastUpdated, setLastUpdated] = useState<LastUpdated | null>(null)
  const [leagueContexts, setLeagueContexts] = useState<SeriesLeagueContext[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([loadMatches(), loadLastUpdated()])
      .then(([m, lu]) => {
        setMatches(m)
        setLastUpdated(lu)

        // Load details for the latest season matches to get scorers
        const latestSeason = lu?.latest_season
        const seasonMatches = m.filter(match => match.season === latestSeason)
        const played = seasonMatches.filter(match => match.result !== null)

        // Load details for played matches (last ~20)
        const recentPlayed = played
          .sort((a, b) => {
            if (!a.datetime) return 1
            if (!b.datetime) return -1
            return new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
          })
          .slice(0, 20)

        Promise.all(
          recentPlayed.map(match =>
            loadMatchDetail(match.id)
              .then(d => [match.id, d] as const)
              .catch(() => null)
          )
        ).then(results => {
          const map = new Map<string, MatchDetail>()
          for (const r of results) {
            if (r) map.set(r[0], r[1])
          }
          setDetails(map)
        })

        // Cargar contexto de liga para la temporada actual
        const seasonNum = String(lu.latest_season)
        loadLeagueContext().then(lc => {
          setLeagueContexts(lc[seasonNum] ?? [])
        }).catch(() => {})
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Cargando...</div>
  }

  const latestSeason = lastUpdated?.latest_season
  const seasonMatches = matches
    .filter(m => m.season === latestSeason)
    .sort((a, b) => {
      if (!a.datetime) return 1
      if (!b.datetime) return -1
      return new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    })

  const played = seasonMatches.filter(m => m.result !== null)
  const upcoming = seasonMatches.filter(m => m.result === null)

  // Group played by round
  const roundMap = new Map<string, Match[]>()
  for (const m of played) {
    const key = `${m.tournament}__${m.series}__${m.round}`
    if (!roundMap.has(key)) roundMap.set(key, [])
    roundMap.get(key)!.push(m)
  }

  const latestRoundKeys = [...roundMap.keys()].slice(0, 6)

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#6B2D2D" }}>Actualidad</h1>
        <p className="text-sm text-gray-500 mt-1">
          Temporada {latestSeason} · Últimos resultados y próximos partidos
        </p>
        {lastUpdated && (
          <p className="text-xs text-gray-400 mt-1">
            Datos actualizados: {new Date(lastUpdated.updated_at).toLocaleDateString("es-UY")}
          </p>
        )}
      </div>

      {/* Últimos resultados */}
      {latestRoundKeys.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: "#6B2D2D" }}>
            <Calendar size={14} /> Últimos resultados
          </h2>
          <div className="space-y-3">
            {latestRoundKeys.map(key => {
              const ms = roundMap.get(key)!
              const first = ms[0]
              return (
                <div key={key} className="bg-white rounded-xl border shadow-sm overflow-hidden"
                  style={{ borderColor: "#F0E8DF" }}>
                  {/* Header */}
                  <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide flex items-center justify-between"
                    style={{ backgroundColor: "#6B2D2D", color: "white" }}>
                    <span>{first.tournament} · {first.series}</span>
                    <span className="opacity-70">Fecha {first.round}</span>
                  </div>

                  {/* Partidos en formato fixture */}
                  {ms.map(m => {
                    const detail = details.get(m.id)
                    const matchGoals = detail?.goals.filter(g => !g.own_goal) ?? []
                    const isHome = m.clt_side === "home"

                    return (
                      <Link key={m.id} href={`/partido/${m.id}`}
                        className="block border-t hover:bg-[#FAF6F1] transition-colors"
                        style={{ borderColor: "#F0E8DF" }}>
                        <div className="px-4 py-3">
                          {/* Fixture row */}
                          <div className="flex items-center gap-2">
                            <ResultBadge result={m.result} size="sm" />

                            <div className="flex-1 min-w-0">
                              {/* Score line: CLT 2 - 1 Rival */}
                              <div className="flex items-center gap-2 text-sm">
                                <span className={`font-bold ${isHome ? "" : "text-gray-600"}`} style={isHome ? { color: "#6B2D2D" } : {}}>
                                  {isHome ? "CLT" : toProperCase(m.home)}
                                </span>
                                <span className="font-mono font-bold text-base" style={{ color: "#3A1A1A" }}>
                                  {m.score_home}
                                </span>
                                <span className="text-gray-300">-</span>
                                <span className="font-mono font-bold text-base" style={{ color: "#3A1A1A" }}>
                                  {m.score_away}
                                </span>
                                <span className={`font-bold ${!isHome ? "" : "text-gray-600"}`} style={!isHome ? { color: "#6B2D2D" } : {}}>
                                  {isHome ? toProperCase(m.away) : "CLT"}
                                </span>
                              </div>

                              {/* Goleadores inline */}
                              {matchGoals.length > 0 && (
                                <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-1.5">
                                  <span>⚽</span>
                                  {matchGoals.map((g, i) => (
                                    <span key={i}>
                                      {toProperCase(g.name)} {g.minute}&apos;
                                      {i < matchGoals.length - 1 && <span className="text-gray-300">,</span>}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Meta: fecha, cancha, condición */}
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[10px] text-gray-400">
                                <span>{formatDate(m.datetime)}</span>
                                {m.venue && (
                                  <span className="flex items-center gap-0.5">
                                    <MapPin size={8} /> {m.venue}
                                  </span>
                                )}
                                <span className="flex items-center gap-0.5">
                                  {m.clt_side === "home" ? <><Home size={8} /> Local</> : <><Plane size={8} /> Visita</>}
                                </span>
                              </div>
                            </div>

                            <span className="text-xs shrink-0" style={{ color: "#6B2D2D" }}>Ver →</span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Próximos partidos */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: "#6B2D2D" }}>
            <Calendar size={14} /> Próximos partidos
          </h2>
          <div className="space-y-2">
            {upcoming.slice(0, 10).map(m => (
              <div key={m.id} className="bg-white rounded-xl border p-4 shadow-sm"
                style={{ borderColor: "#F0E8DF" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#6B2D2D" }}>
                    {m.tournament} · {m.series}
                  </span>
                  <span className="text-[10px] text-gray-400">Fecha {m.round}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`font-bold ${m.clt_side === "home" ? "" : "text-gray-600"}`}
                    style={m.clt_side === "home" ? { color: "#6B2D2D" } : {}}>
                    {m.clt_side === "home" ? "CLT" : toProperCase(m.home)}
                  </span>
                  <span className="text-gray-400">vs</span>
                  <span className={`font-bold ${m.clt_side === "away" ? "" : "text-gray-600"}`}
                    style={m.clt_side === "away" ? { color: "#6B2D2D" } : {}}>
                    {m.clt_side === "away" ? "CLT" : toProperCase(m.away)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 mt-1 text-[10px] text-gray-400">
                  <span>{formatDate(m.datetime)}</span>
                  {m.venue && (
                    <span className="flex items-center gap-0.5">
                      <MapPin size={8} /> {m.venue}
                    </span>
                  )}
                  <span className="flex items-center gap-0.5">
                    {m.clt_side === "home" ? <><Home size={8} /> Local</> : <><Plane size={8} /> Visita</>}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tablas de posiciones de la temporada actual */}
      {leagueContexts.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide mb-3 flex items-center gap-2" style={{ color: "#6B2D2D" }}>
            <Trophy size={14} /> Posiciones
          </h2>
          <div className="space-y-4">
            {leagueContexts.map((ctx, idx) => {
              return (
                <div key={idx} className="bg-white rounded-xl border shadow-sm overflow-hidden"
                  style={{ borderColor: "#F0E8DF" }}>
                  <div className="px-4 py-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: "#6B2D2D", color: "white" }}>
                    <span>Tabla de posiciones</span>
                    {ctx.clt_rank && (
                      <span style={{ color: "#D4A843" }}>CLT #{ctx.clt_rank}</span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ background: "#FAF6F1" }}>
                          <th className="text-left px-3 py-2 font-medium text-gray-500">#</th>
                          <th className="text-left px-3 py-2 font-medium text-gray-500">Club</th>
                          <th className="text-center px-2 py-2 font-medium text-gray-500">PJ</th>
                          <th className="text-center px-2 py-2 font-medium text-gray-500">PG</th>
                          <th className="text-center px-2 py-2 font-medium text-gray-500">PE</th>
                          <th className="text-center px-2 py-2 font-medium text-gray-500">PP</th>
                          <th className="text-center px-2 py-2 font-medium text-gray-500">GF</th>
                          <th className="text-center px-2 py-2 font-medium text-gray-500">GC</th>
                          <th className="text-center px-2 py-2 font-medium text-gray-500">Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ctx.standings.map((row, i) => {
                          const isCLT = row.institution.toUpperCase().includes("CARRASCO LAWN TENNIS")
                          return (
                            <tr key={i} style={{
                              background: isCLT ? "#FFF8EC" : i % 2 === 0 ? "white" : "#FDFAF6",
                              fontWeight: isCLT ? 700 : 400,
                              color: isCLT ? "#6B2D2D" : "#3A1A1A",
                              borderTop: "1px solid #F0E8DF",
                            }}>
                              <td className="px-3 py-2">{row.rank}</td>
                              <td className="px-3 py-2">
                                {row.institution}
                                {isCLT && <span className="ml-1 text-xs" style={{ color: "#D4A843" }}>★</span>}
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
              )
            })}
          </div>
        </div>
      )}

      {played.length === 0 && upcoming.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No hay datos disponibles para la temporada {latestSeason}.
        </div>
      )}
    </div>
  )
}
