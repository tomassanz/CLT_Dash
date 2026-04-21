"use client"
import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Calendar, Home, Plane, Trophy, Clock, ChevronRight } from "lucide-react"
import type { Match, MatchDetail, LeagueContext, SeriesLeagueContext, FixturesLive, FixtureCategoryLive } from "@/lib/types"
import { loadMatches, loadMatchDetail, loadLeagueContext, loadFixturesLive, rival, formatDate, toProperCase } from "@/lib/data"
import ResultBadge from "@/components/ResultBadge"
import MatchModal from "@/components/MatchModal"

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ORDER = ["mayores", "reserva", "presenior", "mas40", "sub20", "sub18", "sub16", "sub14"]
const PENDING_CATEGORIES: string[] = []
const CURRENT_SEASON = 113

// IDs de categorías cubiertas por fixtures_live.json (para no mostrarlas como pendientes)
const LIVE_CATEGORY_IDS = new Set(["mayores", "reserva", "sub20", "sub18", "sub16", "sub14", "presenior", "mas40"])

type Section = "fixtures" | "tablas" | "resultados"

// Mapeo de tournament (Sistema A) → label (Sistema B) para la temporada actual
const TOURNAMENT_TO_LABEL: Record<string, string> = {
  "Mayores Masculino": "T2/A",
  "RESERVA":           "T2B/RS1",
  "Sub - 20":          "T20/20A",
  "SUB 18":            "T18/18-3-",
  "SUB 16":            "T16/16-3-",
  "SUB14":             "T14/S14S1",
  "PRE SENIOR":        "T32/PSB",
  "MÁS 40":            "T40/M40S2",
}

// Nombre legible y orden de display para cada label de liga
const LABEL_META: Record<string, { name: string; order: number }> = {
  "T2/A":       { name: "Mayores",   order: 0 },
  "T2/AT":      { name: "Mayores",   order: 0 },
  "T2B/RS1":    { name: "Reserva",   order: 1 },
  "T20/20A":    { name: "Sub-20",    order: 2 },
  "T18/18-3-":  { name: "Sub-18",   order: 3 },
  "T16/16-3-":  { name: "Sub-16",   order: 4 },
  "T14/S14S1":  { name: "Sub-14",   order: 5 },
  "T32/PSB":    { name: "Presenior", order: 6 },
  "T40/M40S2":  { name: "Más 40",   order: 7 },
}

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

function findNextMatchForCategory(cat: FixtureCategoryLive): number | null {
  // fixtures_live.json siempre tiene el campo played definido
  const next = cat.matches.find(m => !m.played)
  return next?.fecha ?? null
}

function labelName(label: string): string {
  return LABEL_META[label]?.name ?? label
}

// ── Section tabs config ──────────────────────────────────────────────────────

const SECTIONS: { id: Section; label: string; icon: typeof Calendar }[] = [
  { id: "resultados", label: "Resultados",  icon: Clock },
  { id: "tablas",     label: "Tablas",      icon: Trophy },
  { id: "fixtures",   label: "Próximos",    icon: Calendar },
]

// ── Result card (mobile-friendly) ────────────────────────────────────────────

function ResultCard({
  match,
  categoryLabel,
  onClick,
}: {
  match: Match
  categoryLabel: string
  onClick: () => void
}) {
  const opp = rival(match)
  const isHome = match.clt_side === "home"
  const homeName = isHome ? "CLT" : toProperCase(opp)
  const awayName = isHome ? toProperCase(opp) : "CLT"

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border px-3 py-3 sm:px-4 text-left hover:shadow-sm transition-shadow group block"
      style={{ borderColor: "#F0E8DF", backgroundColor: "white" }}
    >
      {/* Top meta row: category | result + home/away + chevron */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span
          className="text-[10px] font-bold uppercase tracking-wide truncate"
          style={{ color: "#6B2D2D" }}
        >
          {categoryLabel}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="text-[10px] font-medium flex items-center gap-0.5 px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: isHome ? "#E8F5E9" : "#FFF3E0",
              color: isHome ? "#2E7D32" : "#E65100",
            }}
          >
            {isHome ? <Home size={9} /> : <Plane size={9} />}
            {isHome ? "Local" : "Visit."}
          </span>
          <ResultBadge result={match.result} size="sm" />
          <ChevronRight
            size={14}
            className="text-gray-300 group-hover:text-gray-500 transition-colors"
          />
        </div>
      </div>

      {/* Teams + score — each team gets its own column so long names can wrap */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <span
          className="text-sm font-semibold text-right leading-tight break-words"
          style={{ color: "#3A1A1A" }}
        >
          {homeName}
        </span>
        <span
          className="text-base font-bold tabular-nums whitespace-nowrap px-2"
          style={{ color: "#6B2D2D" }}
        >
          {match.score_home ?? "?"}-{match.score_away ?? "?"}
        </span>
        <span
          className="text-sm font-semibold text-left leading-tight break-words"
          style={{ color: "#3A1A1A" }}
        >
          {awayName}
        </span>
      </div>

      {/* Date row */}
      <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-1">
        <Calendar size={10} />
        {formatDate(match.datetime)}
      </div>
    </button>
  )
}

// ── Standings table ───────────────────────────────────────────────────────────

function StandingsTable({ ctx }: { ctx: SeriesLeagueContext }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr style={{ backgroundColor: "#6B2D2D", color: "white" }}>
            <th className="text-left pl-3 pr-1 py-2 font-semibold w-7">#</th>
            <th className="text-left px-1 py-2 font-semibold">Institución</th>
            <th className="text-center px-1 py-2 font-semibold w-8">PJ</th>
            <th className="text-center px-1 py-2 font-semibold w-8">PG</th>
            <th className="text-center px-1 py-2 font-semibold w-8">PE</th>
            <th className="text-center px-1 py-2 font-semibold w-8">PP</th>
            <th className="text-center px-1 py-2 font-semibold w-8">GF</th>
            <th className="text-center px-1 py-2 font-semibold w-8">GC</th>
            <th className="text-center px-1 py-2 font-bold w-9">Pts</th>
          </tr>
        </thead>
        <tbody>
          {ctx.standings.map((row, i) => {
            const isClt = row.institution.toUpperCase().includes("CARRASCO LAWN TENNIS")
            return (
              <tr
                key={i}
                style={{
                  backgroundColor: isClt ? "#D4A84322" : i % 2 === 0 ? "#FDFAF6" : "white",
                  fontWeight: isClt ? 700 : 400,
                }}
              >
                <td className="pl-3 pr-1 py-2 text-center" style={{ color: "#9B8B7A" }}>{row.rank}</td>
                <td className="px-1 py-2 max-w-[140px] truncate" style={{ color: isClt ? "#6B2D2D" : "#3A1A1A" }}>
                  {isClt ? "CLT" : toProperCase(row.institution)}
                </td>
                <td className="px-1 py-2 text-center text-gray-500">{row.pj}</td>
                <td className="px-1 py-2 text-center text-gray-500">{row.pg}</td>
                <td className="px-1 py-2 text-center text-gray-500">{row.pe}</td>
                <td className="px-1 py-2 text-center text-gray-500">{row.pp}</td>
                <td className="px-1 py-2 text-center text-gray-500">{row.gf}</td>
                <td className="px-1 py-2 text-center text-gray-500">{row.gc}</td>
                <td className="px-1 py-2 text-center font-bold" style={{ color: "#6B2D2D" }}>{row.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ActualidadPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const tabParam = searchParams.get("tab") as Section | null
  const validSections: Section[] = ["resultados", "tablas", "fixtures"]
  const initialSection = tabParam && validSections.includes(tabParam) ? tabParam : "resultados"

  const [fixturesLive, setFixturesLive] = useState<FixturesLive | null>(null)
  const [staticCategories, setStaticCategories] = useState<FixtureCategoryLive[]>([])
  const [activeSection, setActiveSection] = useState<Section>(initialSection)
  const [activeCatTab, setActiveCatTab] = useState<string>("")

  // Resultados state
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [leagueContext, setLeagueContext] = useState<LeagueContext>({})
  const [modalMatch, setModalMatch] = useState<Match | null>(null)
  const [modalDetail, setModalDetail] = useState<MatchDetail | null>(null)

  // Tablas state
  const [activeLeagueTab, setActiveLeagueTab] = useState<string>("")

  useEffect(() => {
    // Cargar fixtures_live.json (categorías con API)
    loadFixturesLive()
      .then(data => {
        setFixturesLive(data)
        const first = [...data.categories]
          .sort((a: FixtureCategoryLive, b: FixtureCategoryLive) => CATEGORY_ORDER.indexOf(a.id) - CATEGORY_ORDER.indexOf(b.id))[0]
        if (first) setActiveCatTab(first.id)
      })
      .catch(() => {})

    // Cargar fixtures.json estático para categorías sin API (Más 40, etc.)
    fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/data/fixtures.json`)
      .then(r => r.json())
      .then((d: { hidden?: boolean; categories: FixtureCategoryLive[] }) => {
        if (!d.hidden) {
          setStaticCategories(d.categories.filter(c => !LIVE_CATEGORY_IDS.has(c.id)))
        }
      })
      .catch(() => {})

    loadMatches().then(m => setAllMatches(m)).catch(() => {})
    loadLeagueContext().then(lc => {
      setLeagueContext(lc)
      const season113 = lc[String(CURRENT_SEASON)] ?? []
      const sorted = [...season113].sort((a, b) => (LABEL_META[a.label]?.order ?? 99) - (LABEL_META[b.label]?.order ?? 99))
      if (sorted.length > 0) setActiveLeagueTab(sorted[0].label)
    }).catch(() => {})
  }, [])

  // Season 113 matches
  const season113Matches = allMatches
    .filter(m => m.season === CURRENT_SEASON && m.result !== null)
    .sort((a, b) => {
      if (!a.datetime || !b.datetime) return 0
      return new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
    })

  // Per-category last match (for Resultados cards)
  const leagueSeries = [...(leagueContext[String(CURRENT_SEASON)] ?? [])].sort(
    (a, b) => (LABEL_META[a.label]?.order ?? 99) - (LABEL_META[b.label]?.order ?? 99)
  )

  function lastMatchForLabel(label: string): Match | null {
    const tournament = Object.entries(TOURNAMENT_TO_LABEL).find(([, l]) => l === label)?.[0]
    if (!tournament) return null
    return season113Matches.find(m => m.tournament === tournament) ?? null
  }

  async function openMatchModal(m: Match) {
    const detail = await loadMatchDetail(m.id)
    setModalMatch(m)
    setModalDetail(detail)
  }

  // Combinar categorías live + estáticas, ordenadas
  const allCategories: FixtureCategoryLive[] = [
    ...(fixturesLive?.categories ?? []),
    ...staticCategories,
  ].sort((a, b) => CATEGORY_ORDER.indexOf(a.id) - CATEGORY_ORDER.indexOf(b.id))

  const loading = fixturesLive === null
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

  const activeCat = allCategories.find(c => c.id === activeCatTab)
  const nextFechaForActive = activeCat ? findNextMatchForCategory(activeCat) : null
  const activeLeagueCtx: SeriesLeagueContext | undefined = leagueSeries.find(s => s.label === activeLeagueTab)

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
                {allCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCatTab(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      activeCatTab === cat.id ? "text-white" : "text-gray-500 bg-white hover:bg-gray-100"
                    }`}
                    style={activeCatTab === cat.id ? { backgroundColor: "#6B2D2D" } : {}}
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
                      // Para categorías live (fixtures_live.json) usamos played directamente
                      // Para categorías estáticas (fixtures.json) usamos la fecha
                      const isPlayed = m.played !== undefined ? m.played : matchStatus(m.date) === "past"
                      const isNext = m.fecha === nextFechaForActive

                      const hasScore = isPlayed && m.score_home !== undefined && m.score_away !== undefined
                      const cltScore = m.home ? m.score_home : m.score_away
                      const oppScore = m.home ? m.score_away : m.score_home
                      const resultColor = hasScore
                        ? cltScore! > oppScore! ? "#16a34a"
                          : cltScore! < oppScore! ? "#dc2626"
                          : "#ca8a04"
                        : undefined

                      const isTentative = m.tentative === true

                      return (
                        <div
                          key={m.fecha}
                          className={`rounded-xl border px-3 py-3 sm:px-4 transition-all ${
                            isTentative ? "opacity-40 border-dashed" : isNext ? "ring-2 shadow-sm" : isPlayed ? "opacity-60" : ""
                          }`}
                          style={{
                            borderColor: isNext ? "#D4A843" : "#F0E8DF",
                            backgroundColor: isNext ? "#FFFCF5" : "white",
                          }}
                        >
                          {/* Top row: fecha number + home/away + badges */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                                style={{
                                  backgroundColor: isNext ? "#D4A843" : "#F5F0E8",
                                  color: isNext ? "white" : "#6B2D2D",
                                }}
                              >
                                {m.fecha}
                              </div>
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
                            </div>
                            {isNext && (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                                style={{ backgroundColor: "#D4A843", color: "white" }}
                              >
                                PRÓXIMO
                              </span>
                            )}
                          </div>

                          {/* Teams + score — full-width grid so long names wrap */}
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                            <span
                              className="text-sm font-semibold text-right leading-tight break-words"
                              style={{ color: "#3A1A1A" }}
                            >
                              {m.home ? "CLT" : toProperCase(m.opponent)}
                            </span>
                            {hasScore ? (
                              <span
                                className="text-sm font-bold tabular-nums whitespace-nowrap px-2 py-0.5 rounded"
                                style={{ color: resultColor, backgroundColor: resultColor + "22" }}
                              >
                                {m.score_home}-{m.score_away}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 px-2">vs</span>
                            )}
                            <span
                              className="text-sm font-semibold text-left leading-tight break-words"
                              style={{ color: "#3A1A1A" }}
                            >
                              {m.home ? toProperCase(m.opponent) : "CLT"}
                            </span>
                          </div>

                          {/* Date / time / venue */}
                          <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-1 flex-wrap">
                            <Calendar size={10} />
                            {isTentative ? (
                              <span className="italic">2ª Rueda (fecha a confirmar)</span>
                            ) : (
                              <>
                                <span>{formatDateLong(m.date)}</span>
                                {m.time && <span>· {m.time}</span>}
                                {!isPlayed && m.venue && m.venue.toUpperCase() !== "CANCHA A FIJAR" && (
                                  <span className="truncate">· {toProperCase(m.venue)}</span>
                                )}
                              </>
                            )}
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
                Tablas de posiciones
              </p>
            </div>

            {leagueSeries.length === 0 ? (
              <div className="px-5 py-10 sm:px-8 flex flex-col items-center justify-center" style={{ backgroundColor: "#FDFAF6" }}>
                <Trophy size={32} strokeWidth={1.2} style={{ color: "#D4A843" }} />
                <p className="text-sm font-semibold mt-3" style={{ color: "#6B2D2D" }}>
                  Todavía no hay tablas disponibles
                </p>
                <p className="text-xs text-gray-400 mt-1.5 text-center max-w-xs leading-relaxed">
                  Cuando se jueguen las primeras fechas, acá vas a ver las tablas de posiciones de cada divisional.
                </p>
              </div>
            ) : (
              <div className="px-4 py-4 sm:px-5" style={{ backgroundColor: "#FDFAF6" }}>
                {/* Category tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide">
                  {leagueSeries.map(s => (
                    <button
                      key={s.label}
                      onClick={() => setActiveLeagueTab(s.label)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                        activeLeagueTab === s.label ? "text-white" : "text-gray-500 bg-white hover:bg-gray-100"
                      }`}
                      style={activeLeagueTab === s.label ? { backgroundColor: "#6B2D2D" } : {}}
                    >
                      {labelName(s.label)}
                    </button>
                  ))}
                </div>

                {activeLeagueCtx && (
                  <>

                    <div className="rounded-xl overflow-hidden border mb-4" style={{ borderColor: "#E8DDD0" }}>
                      <StandingsTable ctx={activeLeagueCtx} />
                    </div>

                    {activeLeagueCtx.scorers.length > 0 && (
                      <div className="rounded-xl overflow-hidden border mb-4" style={{ borderColor: "#E8DDD0" }}>
                        <div className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.15em]"
                          style={{ backgroundColor: "#6B2D2D", color: "white" }}>
                          Goleadores
                        </div>
                        <div className="divide-y divide-[#F0E8DF]">
                          {activeLeagueCtx.scorers.slice(0, 8).map((s, i) => {
                            const isClt = s.institution.toUpperCase().includes("CARRASCO LAWN TENNIS")
                            return (
                              <div key={i} className="px-4 py-2.5 flex items-center justify-between"
                                style={{ backgroundColor: isClt ? "#D4A84322" : i % 2 === 0 ? "#FDFAF6" : "white" }}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xs w-5 text-center shrink-0" style={{ color: "#9B8B7A" }}>{i + 1}</span>
                                  <span className="text-xs font-semibold truncate" style={{ color: isClt ? "#6B2D2D" : "#3A1A1A", fontWeight: isClt ? 700 : 600 }}>
                                    {toProperCase(s.player)}
                                  </span>
                                  <span className="text-[10px] text-gray-400 truncate hidden sm:block">
                                    {isClt ? "CLT" : toProperCase(s.institution)}
                                  </span>
                                </div>
                                <span className="text-sm font-bold shrink-0 ml-2" style={{ color: "#6B2D2D" }}>{s.goals}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
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
              {season113Matches.length === 0 ? (
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
                <div className="space-y-3">
                  {/* Per-category result cards, ordenados por fecha del último partido */}
                  {leagueSeries
                    .map(ctx => ({ ctx, lastMatch: lastMatchForLabel(ctx.label) }))
                    .filter((x): x is { ctx: SeriesLeagueContext; lastMatch: Match } => x.lastMatch !== null)
                    .sort((a, b) => {
                      const da = a.lastMatch.datetime ?? ""
                      const db = b.lastMatch.datetime ?? ""
                      return db.localeCompare(da)
                    })
                    .map(({ ctx, lastMatch }) => (
                      <ResultCard
                        key={ctx.label}
                        match={lastMatch}
                        categoryLabel={labelName(ctx.label)}
                        onClick={() => openMatchModal(lastMatch)}
                      />
                    ))}
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
          allMatches={season113Matches}
        />
      )}
    </div>
  )
}
