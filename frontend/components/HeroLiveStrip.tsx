"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { loadFixturesLive } from "@/lib/data"
import type { FixturesLive, FixtureMatchLive } from "@/lib/types"

// ── Types ─────────────────────────────────────────────────────────────────────

interface MatchWithCategory extends FixtureMatchLive {
  categoryId: string
  categoryName: string
}

type Result = "W" | "D" | "L"

interface PastResult {
  opponent: string
  scoreClt: number
  scoreOpp: number
  result: Result
  categoryName: string
  daysAgo: number
}

interface NextMatch {
  opponent: string
  home: boolean
  date: string
  time: string | null
  venue: string | null
  categoryName: string
  daysAway: number
  isWeekend: boolean
  weekendMatchCount: number // how many CLT matches are this weekend
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toProper(s: string): string {
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

function daysFromToday(iso: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(iso + "T12:00:00")
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

function isWeekendDate(iso: string): boolean {
  const d = new Date(iso + "T12:00:00")
  const day = d.getDay()
  return day === 0 || day === 6
}

function getMatchResult(m: FixtureMatchLive): { scoreClt: number; scoreOpp: number; result: Result } | null {
  if (!m.played || m.score_home == null || m.score_away == null) return null
  const clt = m.home ? m.score_home : m.score_away
  const opp = m.home ? m.score_away : m.score_home
  const result: Result = clt > opp ? "W" : clt === opp ? "D" : "L"
  return { scoreClt: clt, scoreOpp: opp, result }
}

// Priority score for past results: wins > draws > losses, then goals, then category
const CATEGORY_PRIORITY: Record<string, number> = {
  mayores: 2, reserva: 1,
}

function pastScore(m: MatchWithCategory, res: { scoreClt: number; scoreOpp: number; result: Result }): number {
  const resultPts = res.result === "W" ? 1000 : res.result === "D" ? 100 : 0
  const goalPts = res.result === "W" ? res.scoreClt * 10 : 0
  const catPts = CATEGORY_PRIORITY[m.categoryId] ?? 0
  return resultPts + goalPts + catPts
}

function pickPastResult(categories: FixturesLive["categories"]): PastResult | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Look back window: if today is Monday (1), extend to 6 days back to include last Tuesday
  // Otherwise 6 days. If nothing found, extend to 20 days.
  const windows = [6, 20]

  for (const windowDays of windows) {
    const candidates: { match: MatchWithCategory; res: ReturnType<typeof getMatchResult> & {} }[] = []

    for (const cat of categories) {
      for (const m of cat.matches) {
        if (!m.played) continue
        const days = -daysFromToday(m.date) // positive = in the past
        if (days < 0 || days > windowDays) continue
        const res = getMatchResult(m)
        if (!res) continue
        candidates.push({ match: { ...m, categoryId: cat.id, categoryName: cat.name }, res })
      }
    }

    if (candidates.length === 0) continue

    // Sort by priority descending
    candidates.sort((a, b) => pastScore(b.match, b.res) - pastScore(a.match, a.res))
    const best = candidates[0]
    const days = -daysFromToday(best.match.date)

    return {
      opponent: toProper(best.match.opponent),
      scoreClt: best.res.scoreClt,
      scoreOpp: best.res.scoreOpp,
      result: best.res.result,
      categoryName: best.match.categoryName,
      daysAgo: days,
    }
  }

  return null
}

function pickNextMatch(categories: FixturesLive["categories"]): NextMatch | null {
  const upcoming: MatchWithCategory[] = []
  for (const cat of categories) {
    for (const m of cat.matches) {
      if (m.played || (m as { tentative?: boolean }).tentative) continue
      upcoming.push({ ...m, categoryId: cat.id, categoryName: cat.name })
    }
  }
  if (upcoming.length === 0) return null

  // Count matches this weekend (Sat/Sun)
  const weekendMatches = upcoming.filter(m => isWeekendDate(m.date))
  const weekendMatchCount = weekendMatches.length

  // Priority 1: matches tomorrow
  const tomorrow = upcoming.filter(m => daysFromToday(m.date) === 1)
  if (tomorrow.length > 0) {
    const pick = tomorrow[Math.floor(Math.random() * tomorrow.length)]
    return buildNext(pick, weekendMatchCount)
  }

  // Priority 2: matches this weekend (within next 5 days)
  if (weekendMatches.length > 0) {
    const nearWeekend = weekendMatches.filter(m => daysFromToday(m.date) <= 5)
    if (nearWeekend.length > 0) {
      const pick = nearWeekend[Math.floor(Math.random() * nearWeekend.length)]
      return buildNext(pick, weekendMatchCount)
    }
  }

  // Priority 3: any upcoming
  const sorted = [...upcoming].sort((a, b) => a.date.localeCompare(b.date))
  const soonest = sorted[0]
  const soonestDay = daysFromToday(soonest.date)
  const sameDayMatches = upcoming.filter(m => m.date === soonest.date)
  const pick = sameDayMatches[Math.floor(Math.random() * sameDayMatches.length)]
  return buildNext(pick, weekendMatchCount)
}

function buildNext(m: MatchWithCategory, weekendMatchCount: number): NextMatch {
  const venue = m.venue && !/CANCHA A FIJAR/i.test(m.venue) ? toProper(m.venue) : null
  return {
    opponent: toProper(m.opponent),
    home: m.home,
    date: m.date,
    time: m.time ?? null,
    venue,
    categoryName: m.categoryName,
    daysAway: daysFromToday(m.date),
    isWeekend: isWeekendDate(m.date),
    weekendMatchCount,
  }
}

function formatStripDate(iso: string): string {
  const d = new Date(iso + "T12:00:00")
  return d.toLocaleDateString("es-UY", { weekday: "long", day: "numeric", month: "long" })
}

// ── Result badge ──────────────────────────────────────────────────────────────

const RESULT_STYLES: Record<Result, { label: string; color: string; bg: string }> = {
  W: { label: "Victoria", color: "#16a34a", bg: "#16a34a22" },
  D: { label: "Empate",   color: "#ca8a04", bg: "#ca8a0422" },
  L: { label: "Derrota",  color: "#dc2626", bg: "#dc262622" },
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HeroLiveStrip() {
  const [past, setPast] = useState<PastResult | null | "loading">("loading")
  const [next, setNext] = useState<NextMatch | null | "loading">("loading")

  useEffect(() => {
    loadFixturesLive()
      .then(data => {
        setPast(pickPastResult(data.categories))
        setNext(pickNextMatch(data.categories))
      })
      .catch(() => {
        setPast(null)
        setNext(null)
      })
  }, [])

  const hasPast = past !== "loading" && past !== null
  const hasNext = next !== "loading" && next !== null

  if (past === "loading" && next === "loading") return null
  if (!hasPast && !hasNext) return null

  return (
    <div
      className="mt-10 w-full max-w-xl mx-auto rounded-xl overflow-hidden border"
      style={{ borderColor: "#D4A84333", backgroundColor: "#FFFFFF0A" }}
    >

      {/* ── Past result block ── */}
      {hasPast && (() => {
        const rs = RESULT_STYLES[(past as PastResult).result]
        const p = past as PastResult
        const daysLabel = p.daysAgo === 0 ? "hoy" : p.daysAgo === 1 ? "ayer" : `hace ${p.daysAgo} días`
        return (
          <Link
            href="/actualidad?tab=resultados"
            className="block px-4 py-3 hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-start gap-3">
              {/* Left: icon + result label */}
              <div className="shrink-0 mt-0.5">
                <span
                  className="inline-block text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                  style={{ color: rs.color, backgroundColor: rs.bg }}
                >
                  {rs.label}
                </span>
              </div>

              {/* Center: match info */}
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-widest font-semibold mb-0.5" style={{ color: "#D4A84399" }}>
                  Último resultado · {p.categoryName} · {daysLabel}
                </div>
                <div className="text-base font-bold text-white truncate">
                  CLT {p.scoreClt} – {p.scoreOpp} {p.opponent}
                </div>
                <div className="text-xs mt-1 group-hover:underline" style={{ color: "#D4A843BB" }}>
                  Ver todos los resultados recientes →
                </div>
              </div>
            </div>
          </Link>
        )
      })()}

      {/* ── Separator label ── */}
      {hasPast && hasNext && (
        <div
          className="flex items-center gap-2 px-4 py-1.5"
          style={{ backgroundColor: "#FFFFFF08", borderColor: "#D4A84322" }}
        >
          <div className="flex-1 h-px" style={{ backgroundColor: "#D4A84322" }} />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: "#D4A84366" }}>
            Próximos
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: "#D4A84322" }} />
        </div>
      )}

      {/* ── Next match block ── */}
      {hasNext && (() => {
        const n = next as NextMatch
        const days = n.daysAway
        const daysLabel = days === 0 ? "¡Hoy!" : days === 1 ? "Mañana" : `${formatStripDate(n.date)}`
        const ctaLabel = n.isWeekend || (n.weekendMatchCount > 1 && n.daysAway <= 5)
          ? "Ver todos los partidos del finde →"
          : "Ver próximos partidos →"

        return (
          <Link
            href="/actualidad?tab=fixtures"
            className="block px-4 py-3 hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-start gap-3">
              {/* Left: days pill */}
              <div className="shrink-0 mt-0.5">
                <span
                  className="inline-block text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                  style={{ color: "#D4A843", backgroundColor: "#D4A84322" }}
                >
                  {days <= 1 ? daysLabel : days === 0 ? "Hoy" : `En ${days}d`}
                </span>
              </div>

              {/* Center: match info */}
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-widest font-semibold mb-0.5" style={{ color: "#D4A84399" }}>
                  Próximo · {n.categoryName} · {n.home ? "Local" : "Visita"}
                </div>
                <div className="text-base font-bold text-white truncate">
                  vs {n.opponent}
                </div>
                <div className="text-xs mt-0.5 truncate" style={{ color: "#FFFFFF77" }}>
                  {daysLabel}{n.time ? ` · ${n.time}` : ""}{n.venue ? ` · ${n.venue}` : ""}
                </div>
                <div className="text-xs mt-1 group-hover:underline" style={{ color: "#D4A843BB" }}>
                  {ctaLabel}
                </div>
              </div>
            </div>
          </Link>
        )
      })()}

    </div>
  )
}
