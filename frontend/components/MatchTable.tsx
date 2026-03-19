"use client"
import type { Match } from "@/lib/types"
import { rival, formatDate } from "@/lib/data"
import ResultBadge from "./ResultBadge"
import { Home, Plane } from "lucide-react"

interface Props {
  matches: Match[]
  onOpen: (match: Match) => void
}

export default function MatchTable({ matches, onOpen }: Props) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No se encontraron partidos con los filtros seleccionados.
      </div>
    )
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border shadow-sm" style={{ borderColor: "#F0E8DF" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "#6B2D2D", color: "white" }}>
              <th className="text-left px-3 py-2.5 font-semibold">Fecha</th>
              <th className="text-left px-3 py-2.5 font-semibold">Torneo</th>
              <th className="text-left px-3 py-2.5 font-semibold">Rival</th>
              <th className="text-center px-3 py-2.5 font-semibold">Cond.</th>
              <th className="text-center px-3 py-2.5 font-semibold">Res.</th>
              <th className="text-center px-3 py-2.5 font-semibold">Goles</th>
              <th className="text-left px-3 py-2.5 font-semibold hidden lg:table-cell">Cancha</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m, i) => (
              <tr
                key={m.id}
                onClick={() => onOpen(m)}
                className="border-t transition-colors hover:bg-[#FAF6F1] cursor-pointer"
                style={{ borderColor: "#F0E8DF", backgroundColor: i % 2 === 0 ? "white" : "#FDFAF7" }}
              >
                <td className="px-3 py-2 whitespace-nowrap text-gray-500 text-xs">
                  {formatDate(m.datetime)}
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium text-xs" style={{ color: "#6B2D2D" }}>{m.tournament}</div>
                  <div className="text-xs text-gray-400">{m.series} · F{m.round}</div>
                </td>
                <td className="px-3 py-2 font-medium">
                  {rival(m)}
                </td>
                <td className="px-3 py-2 text-center">
                  <SideBadge side={m.clt_side} />
                </td>
                <td className="px-3 py-2 text-center">
                  <ResultBadge result={m.result} />
                </td>
                <td className="px-3 py-2 text-center font-mono font-semibold text-sm">
                  {m.gf} <span className="text-gray-300">-</span> {m.ga}
                </td>
                <td className="px-3 py-2 hidden lg:table-cell text-xs text-gray-400 max-w-[160px] truncate">
                  {m.venue ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {matches.map(m => (
          <button
            key={m.id}
            onClick={() => onOpen(m)}
            className="w-full text-left block bg-white rounded-lg border shadow-sm p-3 transition-colors hover:bg-[#FAF6F1] active:bg-[#FAF6F1]"
            style={{ borderColor: "#F0E8DF" }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#6B2D2D" }}>
                {m.tournament} · {m.series}
              </span>
              <span className="text-[10px] text-gray-400">{formatDate(m.datetime)}</span>
            </div>
            <div className="flex items-center gap-3">
              <ResultBadge result={m.result} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <SideBadge side={m.clt_side} />
                  <span className="font-medium text-sm truncate">vs {rival(m)}</span>
                </div>
              </div>
              <div className="font-mono font-bold text-base shrink-0" style={{ color: "#3A1A1A" }}>
                {m.gf} <span className="text-gray-300">-</span> {m.ga}
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  )
}

function SideBadge({ side }: { side: "home" | "away" }) {
  if (side === "home") {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded"
        style={{ backgroundColor: "#6B2D2D15", color: "#6B2D2D" }}
        title="Local"
      >
        <Home size={10} /> L
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded"
      style={{ backgroundColor: "#D4A84320", color: "#9a7a2e" }}
      title="Visitante"
    >
      <Plane size={10} /> V
    </span>
  )
}
