"use client"

interface Props {
  result: "W" | "D" | "L" | null
  size?: "sm" | "md"
}

const CONFIG = {
  W: { label: "V", bg: "#16a34a", title: "Victoria" },
  D: { label: "E", bg: "#ca8a04", title: "Empate" },
  L: { label: "D", bg: "#dc2626", title: "Derrota" },
}

export default function ResultBadge({ result, size = "md" }: Props) {
  if (!result) return <span className="text-gray-400">—</span>
  const c = CONFIG[result]
  const sz = size === "sm" ? "w-5 h-5 text-[10px]" : "w-6 h-6 text-xs"
  return (
    <span
      title={c.title}
      className={`inline-flex items-center justify-center rounded font-bold text-white ${sz}`}
      style={{ backgroundColor: c.bg }}
    >
      {c.label}
    </span>
  )
}
