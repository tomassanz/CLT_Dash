"use client"
import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Calendar, Home, Plane, Trophy, Clock, ChevronRight } from "lucide-react"
import type { Match, MatchDetail } from "@/lib/types"
import { loadMatches, loadMatchDetail, rival, formatDate, toProperCase } from "@/lib/data"
import ResultBadge from "@/components/ResultBadge"
import MatchModal from "@/components/MatchModal"

// ── Types ────────────────────────────────────────────────────────────────────

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
  hidden?: boolean
  categories: Category[]
}

// ── Constants ────────────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
const CATEGORY_ORDER = ["mayores", "reserva", "presenior", "mas40", "sub20", "sub18", "sub16", "sub14"]
const PENDING_CATEGORIES = ["Sub-18", "Sub-16", "Sub-14"]

type Section = "fixtures" | "tablas" | "resultados"

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Section tabs config ──────────────────────────────────────────────────────

const SECTIONS: { id: Section; label: string; icon: typeof Calendar }[] = [
  { id: "resultados", label: "Resultados",  icon: Clock },
  { id: "tablas",     label: "Tablas",      icon: Trophy },
  { id: "fixtures",   label: "Próximos",   icon: Calendar },
]

// ── Main component ───────────────────────────────────────────────────────────

export default function ActualidadPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const tabParam = searchParams.get("tab") as Section | null
  const validSections: Section[] = ["resultados", "tablas", "fixtures"]
  const initialSection = tabParam && validSections.includes(tabParam) ? tabParam : "resultados"

  const [fixturesData, setFixturesData] = useState<FixturesData | null>(null)
  const [activeSection, setActiveSection] = useState<Section>(initialSection)
  const [activeCatTab, setActiveCatTab] = useState<string>("")

  // Resultados state
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [modalMatch, setModalMatch] = useState<Match | null>(null)
  const [modalDetail, setModalDetail] = useState<MatchDetail | null>(null)

  useEffect(() => {
    fetch(`${BASE}/data/fixtures.json`)
      .then(r => r.json())
      .then((d: FixturesData) => {
        setFixturesData(d)
        const sorted = d.categories.sort((a, b) => CATEGORY_ORDER.indexOf(a.id) - CATEGORY_ORDER.indexOf(b.id))
        setActiveCatTab(sorted[0]?.id ?? "")
      })
      .catch(() => {})

    loadMatches().then(m => setAllMatches(m)).catch(() => {})
  }, [])

  // Get current season (113 = 2026) matches for "Resultados"
  const currentSeason = 113
  const latestMatches = allMatches
    .filter(m => m.season === currentSeason && m.result !== null)
    .sort((a, b) => {
      if (!a.datetime || !b.datetime) return 0
      return new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    })
    .slice(0, 20)

  async function openMatchModal(m: Match) {
    const detail = await loadMatchDetail(m.id)
    setModalMatch(m)
    setModalDetail(detail)
  }

  const loading = !fixturesData

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="h-8 w-48 rounded bg-gray-200 animate-pulse" />
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      </div>
    )
  }

  const fixturesHidden = fixturesData.hidden === true
  const sortedCategories = fixturesHidden ? [] : [...fixturesData.categories].sort((a, b) => CATEGORY_ORDER.indexOf(a.id) - CATEGORY_ORDER.indexOf(b.id))
  const activeCat = sortedCategories.find(c => c.id === activeCatTab)
  const nextFechaForActive = activeCat ? findNextMatchForCategory(activeCat) : null

  const allPendingCategories = fixturesHidden
    ? ["Mayores", "Reserva", "Presenior", "Más 40", "Sub-20", "Sub-18", "Sub-16", "Sub-14"]
    : PENDING_CATEGORIES

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 flex flex-col" style={{ minHeight: "calc(100vh - 160px)" }}>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold" style={{ color: "#6B2D2D" }}>Temporada 2026</h1>
      </div>

      {/* ── Section Tabs ── */}
      <div className="flex rounded-xl overflow-hidden mb-4 border" style={{ borderColor: "#E8DDD0" }}>
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setActiveSection(id); router.replace(`?tab=${id}`, { scroll: false }) }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors"
            style={{
              backgroundColor: activeSection === id ? "#6B2D2D" : "#FDFAF6",
              color: activeSection === id ? "white" : "#9B8B7A",
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Section Content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border" style={{ borderColor: "#D4A843" }}>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* SECTION 1: Próximos (Fixtures)                                      */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeSection === "fixtures" && (
          <>
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
                    onClick={() => setActiveCatTab(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      activeCatTab === cat.id
                        ? "text-white"
                        : "text-gray-500 bg-white hover:bg-gray-100"
                    }`}
                    style={activeCatTab === cat.id ? { backgroundColor: "#6B2D2D" } : {}}
                  >
                    {cat.name}
                  </button>
                ))}
                {allPendingCategories.map(name => (
                  <span
                    key={name}
                    className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap text-gray-300 bg-white/60 border border-dashed border-gray-200"
                  >
                    {name}
                  </span>
                ))}
              </div>

              {fixturesHidden && (
                <p className="text-sm text-gray-400 text-center py-4">
                  Los fixtures se van a ir cargando a medida que estén confirmados.
                </p>
              )}

              {activeCat && (
                <>
                  <div className="rounded-xl overflow-hidden mb-3" style={{ backgroundColor: "#6B2D2D" }}>
                    <div className="px-4 py-2 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-white">{activeCat.name}</span>
                        <span className="text-xs text-white/60 ml-2">{activeCat.division}</span>
                      </div>
                      <span className="text-[10px] text-white/50 uppercase tracking-wider">{activeCat.round}</span>
                    </div>
                  </div>

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
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* SECTION 2: Tablas (Posiciones, Goleadores, Goleros)                 */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeSection === "tablas" && (
          <>
            <div className="px-5 py-3" style={{ backgroundColor: "#D4A843" }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "#3A1A1A" }}>
                Tablas
              </p>
            </div>

            <div className="px-5 py-10 sm:px-8 flex flex-col items-center justify-center" style={{ backgroundColor: "#FDFAF6" }}>
              <Trophy size={32} strokeWidth={1.2} style={{ color: "#D4A843" }} />
              <p className="text-sm font-semibold mt-3" style={{ color: "#6B2D2D" }}>
                Todavía no arrancó el campeonato
              </p>
              <p className="text-xs text-gray-400 mt-1.5 text-center max-w-xs leading-relaxed">
                Cuando se jueguen las primeras fechas, acá vas a ver las tablas de posiciones, goleadores y goleros de cada divisional, con los datos de CLT.
              </p>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* SECTION 3: Últimos Resultados                                       */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {activeSection === "resultados" && (
          <>
            <div className="px-5 py-3" style={{ backgroundColor: "#D4A843" }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "#3A1A1A" }}>
                Últimos resultados
              </p>
            </div>

            <div className="px-4 py-4 sm:px-5" style={{ backgroundColor: "#FDFAF6" }}>
              {latestMatches.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center">
                  <Clock size={32} strokeWidth={1.2} style={{ color: "#D4A843" }} />
                  <p className="text-sm font-semibold mt-3" style={{ color: "#6B2D2D" }}>
                    Sin resultados todavía
                  </p>
                  <p className="text-xs text-gray-400 mt-1.5 text-center">
                    Los resultados van a aparecer cuando se jueguen los primeros partidos de la temporada.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {latestMatches.map(m => {
                    const opp = rival(m)
                    const isHome = m.clt_side === "home"
                    return (
                      <button
                        key={m.id}
                        onClick={() => openMatchModal(m)}
                        className="w-full rounded-xl border px-4 py-3 flex items-center gap-3 text-left hover:shadow-sm transition-shadow group"
                        style={{ borderColor: "#F0E8DF", backgroundColor: "white" }}
                      >
                        <ResultBadge result={m.result} />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold truncate" style={{ color: "#3A1A1A" }}>
                              {isHome ? "CLT" : toProperCase(opp)}
                            </span>
                            <span className="text-xs font-bold" style={{ color: "#6B2D2D" }}>
                              {m.score_home ?? "?"} - {m.score_away ?? "?"}
                            </span>
                            <span className="text-sm font-semibold truncate" style={{ color: "#3A1A1A" }}>
                              {isHome ? toProperCase(opp) : "CLT"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-gray-400 flex items-center gap-1">
                              <Calendar size={10} />
                              {formatDate(m.datetime)}
                            </span>
                            <span
                              className="text-[10px] font-medium flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: isHome ? "#E8F5E9" : "#FFF3E0",
                                color: isHome ? "#2E7D32" : "#E65100",
                              }}
                            >
                              {isHome ? <Home size={9} /> : <Plane size={9} />}
                              {isHome ? "Local" : "Visitante"}
                            </span>
                            <span className="text-[10px] text-gray-300 truncate">
                              {toProperCase(m.tournament)}
                            </span>
                          </div>
                        </div>

                        <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Match Modal ── */}
      {modalMatch && modalDetail && (
        <MatchModal
          match={modalMatch}
          detail={modalDetail}
          onClose={() => { setModalMatch(null); setModalDetail(null) }}
          allMatches={latestMatches}
        />
      )}
    </div>
  )
}
