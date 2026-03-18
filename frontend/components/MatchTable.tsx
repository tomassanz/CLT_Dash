"use client"
import Link from "next/link"
import type { Match } from "@/lib/types"
import { rival, formatDate, scoreDisplay } from "@/lib/data"
import ResultBadge from "./ResultBadge"

interface Props {
  matches: Match[]
}

export default function MatchTable({ matches }: Props) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        No se encontraron partidos con los filtros seleccionados.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border shadow-sm" style={{ borderColor: "#F0E8DF" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: "#6B2D2D", color: "white" }}>
            <th className="text-left px-3 py-2.5 font-semibold">Fecha</th>
            <th className="text-left px-3 py-2.5 font-semibold hidden sm:table-cell">Torneo / Serie</th>
            <th className="text-left px-3 py-2.5 font-semibold">Rival</th>
            <th className="text-center px-3 py-2.5 font-semibold">Loc/Vis</th>
            <th className="text-center px-3 py-2.5 font-semibold">Resultado</th>
            <th className="text-center px-3 py-2.5 font-semibold">Goles</th>
            <th className="text-left px-3 py-2.5 font-semibold hidden lg:table-cell">Cancha</th>
            <th className="px-3 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m, i) => (
            <tr
              key={m.id}
              className="border-t transition-colors hover:bg-[#FAF6F1]"
              style={{ borderColor: "#F0E8DF", backgroundColor: i % 2 === 0 ? "white" : "#FDFAF7" }}
            >
              <td className="px-3 py-2 whitespace-nowrap text-gray-500 text-xs">
                {formatDate(m.datetime)}
              </td>
              <td className="px-3 py-2 hidden sm:table-cell">
                <div className="font-medium text-xs" style={{ color: "#6B2D2D" }}>{m.year} · {m.tournament}</div>
                <div className="text-xs text-gray-400">{m.series} · Fecha {m.round}</div>
              </td>
              <td className="px-3 py-2 font-medium">
                {rival(m)}
              </td>
              <td className="px-3 py-2 text-center text-xs text-gray-500">
                {m.clt_side === "home" ? "Local" : "Visita"}
              </td>
              <td className="px-3 py-2 text-center">
                <ResultBadge result={m.result} />
              </td>
              <td className="px-3 py-2 text-center font-mono font-semibold text-sm">
                {m.clt_side === "home"
                  ? <>{m.gf} <span className="text-gray-300">-</span> {m.ga}</>
                  : <>{m.gf} <span className="text-gray-300">-</span> {m.ga}</>
                }
              </td>
              <td className="px-3 py-2 hidden lg:table-cell text-xs text-gray-400 max-w-[160px] truncate">
                {m.venue ?? "—"}
              </td>
              <td className="px-3 py-2 text-right">
                <Link
                  href={`/partido/${m.id}`}
                  className="text-xs px-2 py-1 rounded font-medium transition-colors hover:text-white"
                  style={{ color: "#6B2D2D", border: "1px solid #6B2D2D" }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.backgroundColor = "#6B2D2D"
                    ;(e.currentTarget as HTMLElement).style.color = "white"
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.backgroundColor = "transparent"
                    ;(e.currentTarget as HTMLElement).style.color = "#6B2D2D"
                  }}
                >
                  Ver
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
