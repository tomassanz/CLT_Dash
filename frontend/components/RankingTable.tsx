"use client"
import { useState } from "react"
import type { AppearanceStat } from "@/lib/types"
import { toProperCase } from "@/lib/data"
import { ChevronDown, ChevronUp } from "lucide-react"

export interface ScorerWithSeasons {
  carne: string
  name: string
  goals: number
  bySeason: { year: number; goals: number }[]
}

export function ScorersTable({ scorers }: { scorers: ScorerWithSeasons[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div>
      <h3 className="font-bold text-sm mb-2 uppercase tracking-wide" style={{ color: "#6B2D2D" }}>
        Goleadores
      </h3>
      <div className="rounded-lg border overflow-hidden shadow-sm" style={{ borderColor: "#F0E8DF" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "#6B2D2D", color: "white" }}>
              <th className="text-left px-3 py-2 font-semibold w-8">#</th>
              <th className="text-left px-3 py-2 font-semibold">Jugador</th>
              <th className="text-center px-3 py-2 font-semibold w-16">Goles</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          {scorers.slice(0, 15).map((s, i) => {
            const isExpanded = expanded === (s.carne || s.name)
            return (
              <tbody key={s.carne || s.name}>
                <tr
                  className="border-t cursor-pointer hover:bg-[#FAF6F1] transition-colors"
                  style={{ borderColor: "#F0E8DF", backgroundColor: i % 2 === 0 ? "white" : "#FDFAF7" }}
                  onClick={() => setExpanded(isExpanded ? null : (s.carne || s.name))}
                >
                  <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{toProperCase(s.name)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="font-bold" style={{ color: "#6B2D2D" }}>{s.goals}</span>
                  </td>
                  <td className="px-1 py-2 text-gray-400">
                    {s.bySeason.length > 0 && (
                      isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                    )}
                  </td>
                </tr>
                {isExpanded && s.bySeason.length > 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-2" style={{ backgroundColor: "#FAF6F1" }}>
                      <div className="flex flex-wrap gap-1.5 pl-6">
                        {s.bySeason
                          .sort((a, b) => b.year - a.year)
                          .map(bs => (
                            <span key={bs.year} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ backgroundColor: "#6B2D2D15" }}>
                              <span className="text-gray-500">{bs.year}:</span>
                              <span className="font-bold" style={{ color: "#6B2D2D" }}>{bs.goals}</span>
                            </span>
                          ))}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            )
          })}
        </table>
      </div>
    </div>
  )
}

export function AppearancesTable({ appearances }: { appearances: AppearanceStat[] }) {
  return (
    <div>
      <h3 className="font-bold text-sm mb-2 uppercase tracking-wide" style={{ color: "#6B2D2D" }}>
        Más partidos
      </h3>
      <div className="rounded-lg border overflow-hidden shadow-sm" style={{ borderColor: "#F0E8DF" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "#6B2D2D", color: "white" }}>
              <th className="text-left px-3 py-2 font-semibold">#</th>
              <th className="text-left px-3 py-2 font-semibold">Jugador</th>
              <th className="text-center px-3 py-2 font-semibold">Total</th>
              <th className="text-center px-3 py-2 font-semibold hidden sm:table-cell">Tit.</th>
              <th className="text-center px-3 py-2 font-semibold hidden sm:table-cell">Cambio</th>
            </tr>
          </thead>
          <tbody>
            {appearances.slice(0, 15).map((a, i) => (
              <tr
                key={a.carne || a.name}
                className="border-t"
                style={{ borderColor: "#F0E8DF", backgroundColor: i % 2 === 0 ? "white" : "#FDFAF7" }}
              >
                <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                <td className="px-3 py-2 font-medium">{toProperCase(a.name)}</td>
                <td className="px-3 py-2 text-center">
                  <span className="font-bold" style={{ color: "#6B2D2D" }}>{a.total}</span>
                </td>
                <td className="px-3 py-2 text-center text-gray-500 hidden sm:table-cell">{a.starters}</td>
                <td className="px-3 py-2 text-center text-gray-500 hidden sm:table-cell">{a.subs_in}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
