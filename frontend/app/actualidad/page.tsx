"use client"
import { useEffect, useState } from "react"
import { Calendar, Home, Plane, TrendingUp, LayoutList, Users } from "lucide-react"
import Link from "next/link"

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

const CATEGORY_ORDER = ["mayores", "reserva", "presenior", "mas40", "sub20", "sub18", "sub16", "sub14"]
const PENDING_CATEGORIES = ["Sub-20", "Sub-18", "Sub-16", "Sub-14"]

function formatDateLong(iso: string): string {
  const date = new Date(iso + "T12:00:00")
  return date.toLocaleDateString("es-UY", { weekday: "short", day: "numeric", month: "short" })
}

function matchStatus(iso: string): "past" | "today" | "future" {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const matchDate = new Date(iso + "T12:00:00")
  matchDate.setHours(0, 0, 0, 0)
  const diff = matchDate.getTime() - today.getTime()
  if (diff < 0) return "past"
  if (diff === 0) return "today"
  return "future"
}

/** Find the next upcoming match for a specific category */
function findNextMatchForCategory(cat: Category): number | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let closest: { fecha: number; diff: number } | null = null
  for (const m of cat.matches) {
    const d = new Date(m.date + "T12:00:00")
    d.setHours(0, 0, 0, 0)
    const diff = d.getTime() - today.getTime()
    if (diff >= 0 && (!closest || diff < closest.diff)) {
      closest = { fecha: m.fecha, diff }
    }
  }
  return closest?.fecha ?? null
}

export default function ActualidadPage() {
  const [data, setData] = useState<FixturesData | null>(null)
  const [activeTab, setActiveTab] = useState<string>("")

  useEffect(() => {
    fetch(`${BASE}/data/fixtures.json`)
      .then(r => r.json())
      .then((d: FixturesData) => {
        setData(d)
        // Default to first category in order
        const sorted = d.categories.sort((a, b) => CATEGORY_ORDER.indexOf(a.id) - CATEGORY_ORDER.indexOf(b.id))
        setActiveTab(sorted[0]?.id ?? "")
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

  const sortedCategories = [...data.categories].sort((a, b) => CATEGORY_ORDER.indexOf(a.id) - CATEGORY_ORDER.indexOf(b.id))
  const activeCat = sortedCategories.find(c => c.id === activeTab)
  const nextFechaForActive = activeCat ? findNextMatchForCategory(activeCat) : null

  const comingSoonItems = [
    { Icon: Calendar, label: "Resultados del fin de semana" },
    { Icon: TrendingUp, label: "Goleadores de la temporada" },
    { Icon: LayoutList, label: "Tabla de posiciones" },
    { Icon: Users, label: "Fichas de los jugadores" },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#6B2D2D" }}>Temporada 2026</h1>
        <p className="text-xs text-gray-400 mt-1">{data.seasonName}</p>
      </div>

      {/* ── Fixture Card ── */}
      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#D4A843" }}>
        <div className="px-5 py-3" style={{ backgroundColor: "#D4A843" }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "#3A1A1A" }}>
            Calendario
          </p>
        </div>

        <div className="px-4 py-5 sm:px-5" style={{ backgroundColor: "#FDFAF6" }}>
          {/* Category tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide">
            {sortedCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === cat.id
                    ? "text-white"
                    : "text-gray-500 bg-white hover:bg-gray-100"
                }`}
                style={activeTab === cat.id ? { backgroundColor: "#6B2D2D" } : {}}
              >
                {cat.name}
              </button>
            ))}
            {PENDING_CATEGORIES.map(name => (
              <span
                key={name}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap text-gray-300 bg-white/60 border border-dashed border-gray-200"
              >
                {name}
              </span>
            ))}
          </div>

          {/* Active category header */}
          {activeCat && (
            <>
              <div className="rounded-xl border overflow-hidden mb-3" style={{ borderColor: "#E8DDD0" }}>
                <div className="px-4 py-2 flex items-center justify-between" style={{ backgroundColor: "#6B2D2D" }}>
                  <div>
                    <span className="text-sm font-bold text-white">{activeCat.name}</span>
                    <span className="text-xs text-white/60 ml-2">{activeCat.division}</span>
                  </div>
                  <span className="text-[10px] text-white/50 uppercase tracking-wider">{activeCat.round}</span>
                </div>
                <div className="px-4 py-1.5 text-xs text-gray-400 bg-white">
                  {activeCat.copa}
                </div>
              </div>

              {/* Matches list */}
              <div className="space-y-2">
                {activeCat.matches.map(m => {
                  const status = matchStatus(m.date)
                  const isNext = m.fecha === nextFechaForActive
                  return (
                    <div
                      key={m.fecha}
                      className={`rounded-xl border px-4 py-3 flex items-center gap-3 transition-all ${
                        isNext ? "ring-2 shadow-sm" : status === "past" ? "opacity-50" : ""
                      }`}
                      style={{
                        borderColor: isNext ? "#D4A843" : "#F0E8DF",
                        backgroundColor: isNext ? "#FFFCF5" : "white",
                      }}
                    >
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{
                          backgroundColor: isNext ? "#D4A843" : "#F5F0E8",
                          color: isNext ? "white" : "#6B2D2D",
                        }}
                      >
                        {m.fecha}
                      </div>

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
      </div>

      {/* ── Próximamente Card ── */}
      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "#D4A843" }}>
        <div className="px-5 py-3" style={{ backgroundColor: "#D4A843" }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "#3A1A1A" }}>
            Próximamente
          </p>
        </div>

        <div className="px-5 py-7 sm:px-8 sm:py-8" style={{ backgroundColor: "#FDFAF6" }}>
          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            Cuando arranque la temporada, vas a poder seguir todo desde acá.
          </p>

          <div className="space-y-3">
            {comingSoonItems.map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-3 py-2.5 px-3 rounded-lg" style={{ backgroundColor: "white", border: "1px solid #F0E8DF" }}>
                <Icon size={15} strokeWidth={1.8} style={{ color: "#D4A843", flexShrink: 0 }} />
                <span className="text-sm" style={{ color: "#3A1A1A" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 sm:px-8 border-t text-xs text-gray-400" style={{ borderColor: "#F0E8DF", backgroundColor: "#FAF6F1" }}>
          Mientras tanto, explorá la historia completa en{" "}
          <Link href="/historia" className="font-medium underline" style={{ color: "#6B2D2D" }}>Historia</Link>.
        </div>
      </div>
    </div>
  )
}
