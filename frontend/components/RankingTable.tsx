"use client"
import type { ScorerStat, AppearanceStat } from "@/lib/types"
import { toProperCase } from "@/lib/data"

export function ScorersTable({ scorers }: { scorers: ScorerStat[] }) {
  return (
    <div>
      <h3 className="font-bold text-sm mb-2 uppercase tracking-wide" style={{ color: "#6B2D2D" }}>
        Goleadores
      </h3>
      <div className="rounded-lg border overflow-hidden shadow-sm" style={{ borderColor: "#F0E8DF" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "#6B2D2D", color: "white" }}>
              <th className="text-left px-3 py-2 font-semibold">#</th>
              <th className="text-left px-3 py-2 font-semibold">Jugador</th>
              <th className="text-center px-3 py-2 font-semibold">Goles</th>
            </tr>
          </thead>
          <tbody>
            {scorers.slice(0, 15).map((s, i) => (
              <tr
                key={s.carne || s.name}
                className="border-t"
                style={{ borderColor: "#F0E8DF", backgroundColor: i % 2 === 0 ? "white" : "#FDFAF7" }}
              >
                <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                <td className="px-3 py-2 font-medium">{toProperCase(s.name)}</td>
                <td className="px-3 py-2 text-center">
                  <span className="font-bold" style={{ color: "#6B2D2D" }}>{s.goals}</span>
                </td>
              </tr>
            ))}
          </tbody>
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
