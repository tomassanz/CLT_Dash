"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import type { Match, LastUpdated } from "@/lib/types"
import { loadMatches, loadLastUpdated, rival, formatDate, toProperCase } from "@/lib/data"
import ResultBadge from "@/components/ResultBadge"

export default function ActualidadPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [lastUpdated, setLastUpdated] = useState<LastUpdated | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([loadMatches(), loadLastUpdated()])
      .then(([m, lu]) => {
        setMatches(m)
        setLastUpdated(lu)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Cargando...</div>
  }

  // Filtrar última temporada con datos
  const latestSeason = lastUpdated?.latest_season
  const seasonMatches = matches
    .filter(m => m.season === latestSeason)
    .sort((a, b) => {
      if (!a.datetime) return 1
      if (!b.datetime) return -1
      return new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    })

  // Última fecha jugada (con resultado)
  const played = seasonMatches.filter(m => m.result !== null)
  const upcoming = seasonMatches.filter(m => m.result === null)

  // Agrupar jugados por fecha (round)
  const roundMap = new Map<string, Match[]>()
  for (const m of played) {
    const key = `${m.tournament}__${m.series}__${m.round}`
    if (!roundMap.has(key)) roundMap.set(key, [])
    roundMap.get(key)!.push(m)
  }

  // Tomar los últimos 2 grupos de fechas distintas (por datetime desc)
  const latestRoundKeys = [...roundMap.keys()].slice(0, 4)

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
          <h2 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: "#6B2D2D" }}>
            Últimos resultados
          </h2>
          <div className="space-y-3">
            {latestRoundKeys.map(key => {
              const ms = roundMap.get(key)!
              const first = ms[0]
              return (
                <div key={key} className="bg-white rounded-xl border shadow-sm overflow-hidden"
                  style={{ borderColor: "#F0E8DF" }}>
                  {/* Header de la fecha */}
                  <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: "#6B2D2D", color: "white" }}>
                    {first.tournament} · {first.series} · Fecha {first.round}
                  </div>
                  {/* Partidos */}
                  {ms.map(m => (
                    <Link key={m.id} href={`/partido/${m.id}`}
                      className="flex items-center gap-3 px-4 py-3 border-t hover:bg-[#FAF6F1] transition-colors"
                      style={{ borderColor: "#F0E8DF" }}>
                      <ResultBadge result={m.result} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {m.home} <span className="text-gray-400 mx-1">
                            {m.score_home}-{m.score_away}
                          </span> {m.away}
                        </div>
                        <div className="text-xs text-gray-400">{formatDate(m.datetime)}</div>
                      </div>
                      <span className="text-xs" style={{ color: "#6B2D2D" }}>Ver →</span>
                    </Link>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Próximos partidos */}
      {upcoming.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: "#6B2D2D" }}>
            Próximos partidos
          </h2>
          <div className="space-y-2">
            {upcoming.slice(0, 10).map(m => (
              <div key={m.id} className="bg-white rounded-xl border p-4 shadow-sm"
                style={{ borderColor: "#F0E8DF" }}>
                <div className="text-xs text-gray-400 mb-1">{m.tournament} · {m.series} · Fecha {m.round}</div>
                <div className="font-medium text-sm">{m.home} vs {m.away}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDate(m.datetime)}
                  {m.venue && ` · ${m.venue}`}
                </div>
              </div>
            ))}
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
