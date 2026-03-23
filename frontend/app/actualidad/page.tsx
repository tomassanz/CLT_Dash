"use client"
import { useEffect, useState } from "react"
import { Calendar, MapPin, Home, Plane } from "lucide-react"

interface FixtureMatch {
  fecha: number
  date: string
  opponent: string
  home: boolean
}

interface Category {
  id: string
  name: string
  division: string
  copa: string
  round: string
  matches: FixtureMatch[]
}

interface FixturesData {
  season: number
  year: number
  seasonName: string
  categories: Category[]
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}`
}

function formatDateLong(iso: string): string {
  const date = new Date(iso + "T12:00:00")
  return date.toLocaleDateString("es-UY", { weekday: "short", day: "numeric", month: "short" })
}

function matchStatus(iso: string): "past" | "today" | "next" | "future" {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const matchDate = new Date(iso + "T12:00:00")
  matchDate.setHours(0, 0, 0, 0)
  const diff = matchDate.getTime() - today.getTime()
  if (diff < 0) return "past"
  if (diff === 0) return "today"
  return "future"
}

function findNextMatch(categories: Category[]): { catId: string; fecha: number } | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let closest: { catId: string; fecha: number; diff: number } | null = null
  for (const cat of categories) {
    for (const m of cat.matches) {
      const d = new Date(m.date + "T12:00:00")
      d.setHours(0, 0, 0, 0)
      const diff = d.getTime() - today.getTime()
      if (diff >= 0 && (!closest || diff < closest.diff)) {
        closest = { catId: cat.id, fecha: m.fecha, diff }
      }
    }
  }
  return closest ? { catId: closest.catId, fecha: closest.fecha } : null
}

export default function ActualidadPage() {
  const [data, setData] = useState<FixturesData | null>(null)
  const [activeTab, setActiveTab] = useState<string>("")

  useEffect(() => {
    fetch(`${BASE}/data/fixtures.json`)
      .then(r => r.json())
      .then((d: FixturesData) => {
        setData(d)
        const next = findNextMatch(d.categories)
        setActiveTab(next?.catId ?? d.categories[0]?.id ?? "")
      })
      .catch(() => {})
  }, [])

  if (!data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="h-8 w-48 rounded bg-gray-200 animate-pulse" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      </div>
    )
  }

  const activeCat = data.categories.find(c => c.id === activeTab)
  const nextMatch = findNextMatch(data.categories)
  const pendingCategories = ["Sub-20", "Sub-18", "Sub-16", "Sub-14"]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "#6B2D2D" }}>
          Temporada 2026
        </h1>
        <p className="text-xs text-gray-400 mt-1">{data.seasonName}</p>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-5 -mx-4 px-4 scrollbar-hide">
        {data.categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === cat.id
                ? "text-white"
                : "text-gray-500 bg-gray-100 hover:bg-gray-200"
            }`}
            style={activeTab === cat.id ? { backgroundColor: "#6B2D2D" } : {}}
          >
            {cat.name}
          </button>
        ))}
        {pendingCategories.map(name => (
          <span
            key={name}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap text-gray-300 bg-gray-50 border border-dashed border-gray-200"
          >
            {name}
          </span>
        ))}
      </div>

      {/* Active category info */}
      {activeCat && (
        <>
          <div className="rounded-xl border overflow-hidden mb-4" style={{ borderColor: "#E8DDD0" }}>
            <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: "#6B2D2D" }}>
              <div>
                <span className="text-sm font-bold text-white">{activeCat.name}</span>
                <span className="text-xs text-white/60 ml-2">{activeCat.division}</span>
              </div>
              <span className="text-[10px] text-white/50 uppercase tracking-wider">{activeCat.round}</span>
            </div>
            <div className="px-4 py-2 text-xs text-gray-400" style={{ backgroundColor: "#FAF6F1" }}>
              {activeCat.copa}
            </div>
          </div>

          {/* Matches list */}
          <div className="space-y-2">
            {activeCat.matches.map(m => {
              const status = matchStatus(m.date)
              const isNext = nextMatch?.catId === activeCat.id && nextMatch?.fecha === m.fecha
              return (
                <div
                  key={m.fecha}
                  className={`rounded-xl border px-4 py-3 flex items-center gap-3 transition-all ${
                    isNext
                      ? "ring-2 shadow-sm"
                      : status === "past"
                      ? "opacity-50"
                      : ""
                  }`}
                  style={{
                    borderColor: isNext ? "#D4A843" : "#F0E8DF",
                    backgroundColor: isNext ? "#FFFCF5" : "white",
                  }}
                >
                  {/* Fecha number */}
                  <div
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: isNext ? "#D4A843" : "#F5F0E8",
                      color: isNext ? "white" : "#6B2D2D",
                    }}
                  >
                    {m.fecha}
                  </div>

                  {/* Match info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold truncate" style={{ color: "#3A1A1A" }}>
                        {m.home ? "CLT" : m.opponent}
                      </span>
                      <span className="text-xs text-gray-400">vs</span>
                      <span className="text-sm font-semibold truncate" style={{ color: "#3A1A1A" }}>
                        {m.home ? m.opponent : "CLT"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDateLong(m.date)}
                      </span>
                      <span
                        className="text-[10px] font-medium flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: m.home ? "#E8F5E9" : "#FFF3E0",
                          color: m.home ? "#2E7D32" : "#E65100",
                        }}
                      >
                        {m.home ? <Home size={9} /> : <Plane size={9} />}
                        {m.home ? "Local" : "Visitante"}
                      </span>
                      {isNext && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: "#D4A843", color: "white" }}
                        >
                          PRÓXIMO
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
