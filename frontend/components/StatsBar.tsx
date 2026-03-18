"use client"
import type { Match } from "@/lib/types"

interface Props {
  matches: Match[]
}

export default function StatsBar({ matches }: Props) {
  const pj = matches.length
  const wins   = matches.filter(m => m.result === "W").length
  const draws  = matches.filter(m => m.result === "D").length
  const losses = matches.filter(m => m.result === "L").length
  const gf = matches.reduce((s, m) => s + (m.gf ?? 0), 0)
  const ga = matches.reduce((s, m) => s + (m.ga ?? 0), 0)

  const winPct = pj > 0 ? Math.round((wins / pj) * 100) : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      <StatCard label="Partidos" value={pj} />
      <StatCard label="Victorias" value={wins} color="#16a34a" />
      <StatCard label="Empates"   value={draws} color="#ca8a04" />
      <StatCard label="Derrotas"  value={losses} color="#dc2626" />
      <StatCard label="Goles F."  value={gf} />
      <StatCard label="Goles C."  value={ga} />
      <StatCard label="% Victorias" value={`${winPct}%`} color="#6B2D2D" />
    </div>
  )
}

function StatCard({ label, value, color }: {
  label: string
  value: number | string
  color?: string
}) {
  return (
    <div className="bg-white rounded-lg border p-3 text-center shadow-sm"
      style={{ borderColor: "#F0E8DF" }}>
      <div className="text-2xl font-bold" style={{ color: color ?? "#3A1A1A" }}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}
