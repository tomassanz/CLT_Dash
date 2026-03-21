"use client"
import { useEffect, useState } from "react"
import type { Match, MatchDetail } from "@/lib/types"
import { loadMatchDetail, formatDate, toProperCase } from "@/lib/data"
import ResultBadge from "@/components/ResultBadge"
import { Home, Plane, X, ChevronLeft, ChevronRight } from "lucide-react"

interface Props {
  match: Match
  detail: MatchDetail
  onClose: () => void
  // Optional: list of all matches in the current filtered view for prev/next navigation
  allMatches?: Match[]
}

export default function MatchModal({ match: initialMatch, detail: initialDetail, onClose, allMatches }: Props) {
  const [match, setMatch] = useState(initialMatch)
  const [detail, setDetail] = useState(initialDetail)
  const [navLoading, setNavLoading] = useState(false)

  const idx = allMatches?.findIndex(m => m.id === match.id) ?? -1
  const hasPrev = allMatches && idx > 0
  const hasNext = allMatches && idx < allMatches.length - 1

  function navigate(targetMatch: Match) {
    setNavLoading(true)
    loadMatchDetail(targetMatch.id).then(d => {
      setMatch(targetMatch)
      setDetail(d)
      setNavLoading(false)
    })
  }

  // Keyboard: Escape closes, arrow keys navigate
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return }
      if (e.key === "ArrowLeft"  && hasPrev && allMatches) navigate(allMatches[idx - 1])
      if (e.key === "ArrowRight" && hasNext && allMatches) navigate(allMatches[idx + 1])
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, hasPrev, hasNext, idx, allMatches])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [])

  const cltGoals = detail.goals.filter(g => !g.own_goal)
  const ownGoals = detail.goals.filter(g => g.own_goal)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-[#FAF6F1] w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92dvh] flex flex-col"
        style={{ borderTop: "3px solid #6B2D2D" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0" style={{ borderColor: "#F0E8DF" }}>
          {/* Prev arrow */}
          <button
            onClick={() => hasPrev && allMatches && navigate(allMatches[idx - 1])}
            disabled={!hasPrev || navLoading}
            className="shrink-0 p-1 rounded-full transition-colors disabled:opacity-20"
            style={{ color: "#6B2D2D" }}
            aria-label="Partido anterior"
          >
            <ChevronLeft size={20} />
          </button>

          {/* Meta info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1 text-xs text-gray-400">
              <span className="font-semibold" style={{ color: "#6B2D2D" }}>{match.tournament}</span>
              <span>·</span><span>{match.series}</span>
              <span>·</span><span>Fecha {match.round}</span>
              <span>·</span><span>{formatDate(match.datetime)}</span>
              {match.venue && <><span>·</span><span className="truncate">{match.venue}</span></>}
            </div>
            {allMatches && idx >= 0 && (
              <div className="text-[10px] text-gray-400 mt-0.5">{idx + 1} de {allMatches.length}</div>
            )}
          </div>

          {/* Next arrow */}
          <button
            onClick={() => hasNext && allMatches && navigate(allMatches[idx + 1])}
            disabled={!hasNext || navLoading}
            className="shrink-0 p-1 rounded-full transition-colors disabled:opacity-20"
            style={{ color: "#6B2D2D" }}
            aria-label="Partido siguiente"
          >
            <ChevronRight size={20} />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-full hover:bg-gray-200 transition-colors"
            style={{ backgroundColor: "#F0E8DF" }}
            aria-label="Cerrar"
          >
            <X size={18} style={{ color: "#6B2D2D" }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {navLoading && (
            <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>
          )}

          {!navLoading && <>
            {/* Scoreboard */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: "#F0E8DF" }}>
              <div className="h-1 flex">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="flex-1" style={{ backgroundColor: i % 2 === 0 ? "#6B2D2D" : "white" }} />
                ))}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  <TeamName name={match.home} isClt={match.clt_side === "home"} align="left" side={match.clt_side === "home" ? "home" : undefined} />
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: "#3A1A1A" }}>
                      {match.score_home} <span className="text-gray-300 mx-0.5">-</span> {match.score_away}
                    </div>
                    <ResultBadge result={match.result} size="md" />
                  </div>
                  <TeamName name={match.away} isClt={match.clt_side === "away"} align="right" side={match.clt_side === "away" ? "away" : undefined} />
                </div>
                <div className="mt-2 text-center text-sm text-gray-400">
                  CLT: {match.gf} a favor · {match.ga} en contra
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
              <Section title="Titulares" icon="👕">
                {detail.starters.length === 0 ? <Empty /> :
                  <div className="space-y-1">
                    {detail.starters.map(p => (
                      <div key={p.carne || p.name} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#FAF6F1] transition-colors">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: "#6B2D2D" }}>
                          {p.shirt}
                        </span>
                        <span className="flex-1 text-sm font-medium">{toProperCase(p.name)}</span>
                        {p.captain && (
                          <span title="Capitán" className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold border" style={{ color: "#D4A843", borderColor: "#D4A843" }}>C</span>
                        )}
                      </div>
                    ))}
                  </div>}
              </Section>

              <Section title="Cambios" icon="🔄">
                {detail.subs.length === 0 ? <Empty text="Sin cambios" /> :
                  <div className="space-y-2">
                    {detail.subs.map((s, i) => (
                      <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded bg-[#FAF6F1]/50">
                        <span className="text-[10px] font-mono font-bold mt-0.5 px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: "#6B2D2D", color: "white" }}>
                          {s.minute}&apos;
                        </span>
                        <div className="flex-1 text-sm">
                          <div className="flex items-center gap-1">
                            <span className="text-red-400 text-xs">↓</span>
                            <span className="text-gray-500">{toProperCase(s.out_name)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-green-500 text-xs">↑</span>
                            <span className="font-medium">{toProperCase(s.in_name)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>}
              </Section>

              <Section title="Goles CLT" icon="⚽">
                {detail.goals.length === 0 ? <Empty text="Sin goles" /> :
                  <div className="space-y-1.5">
                    {cltGoals.map((g, i) => (
                      <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-[#FAF6F1] transition-colors">
                        <span className="text-lg shrink-0">⚽</span>
                        <span className="flex-1 text-sm font-medium">{toProperCase(g.name)}</span>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "#16a34a15", color: "#16a34a" }}>{g.minute}&apos;</span>
                      </div>
                    ))}
                    {ownGoals.map((g, i) => (
                      <div key={`og-${i}`} className="flex items-center gap-2 py-1.5 px-2 rounded bg-red-50/50">
                        <span className="text-lg shrink-0">⚽</span>
                        <span className="flex-1 text-sm text-gray-400 line-through">{toProperCase(g.name)}</span>
                        <span className="text-[10px] text-red-400 font-medium">en contra · {g.minute}&apos;</span>
                      </div>
                    ))}
                  </div>}
              </Section>

              <Section title="Disciplina" icon="📋">
                {detail.yellows.length === 0 && detail.reds.length === 0 ? <Empty text="Sin tarjetas" /> :
                  <div className="space-y-1.5">
                    {detail.yellows.map((y, i) => (
                      <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-[#FAF6F1] transition-colors">
                        <span className="w-4 h-5 rounded-sm shrink-0" style={{ backgroundColor: "#facc15" }} />
                        <span className="flex-1 text-sm">{toProperCase(y.name)}</span>
                      </div>
                    ))}
                    {detail.reds.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-[#FAF6F1] transition-colors">
                        <span className="w-4 h-5 rounded-sm shrink-0" style={{ backgroundColor: "#dc2626" }} />
                        <span className="flex-1 text-sm">{toProperCase(r.name)}</span>
                        {r.obs && <span className="text-[10px] text-gray-400 max-w-[120px] truncate">{r.obs}</span>}
                      </div>
                    ))}
                  </div>}
              </Section>
            </div>
          </>}
        </div>
      </div>
    </div>
  )
}

function TeamName({ name, isClt, align, side }: { name: string; isClt: boolean; align: "left" | "right"; side?: "home" | "away" }) {
  return (
    <div className={`flex-1 min-w-0 ${align === "right" ? "text-right" : "text-left"}`}>
      <div className={`text-sm sm:text-base font-bold leading-tight truncate ${isClt ? "" : "text-gray-600"}`} style={isClt ? { color: "#6B2D2D" } : {}}>
        {name}
      </div>
      {isClt && (
        <div className="flex items-center gap-1 mt-0.5" style={align === "right" ? { justifyContent: "flex-end" } : {}}>
          <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#D4A843" }}>CLT</span>
          {side && (
            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
              · {side === "home" ? <><Home size={9} /> Local</> : <><Plane size={9} /> Visita</>}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden" style={{ borderColor: "#F0E8DF" }}>
      <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: "#F0E8DF", backgroundColor: "#FDFAF7" }}>
        <span className="text-sm">{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6B2D2D" }}>{title}</h3>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

function Empty({ text = "Sin datos" }: { text?: string }) {
  return <p className="text-xs text-gray-400 italic py-2 text-center">{text}</p>
}
