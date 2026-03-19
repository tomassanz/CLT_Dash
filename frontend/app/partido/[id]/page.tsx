"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import type { Match, MatchDetail } from "@/lib/types"
import { loadMatches, loadMatchDetail, rival, formatDate, toProperCase } from "@/lib/data"
import ResultBadge from "@/components/ResultBadge"
import { Home, Plane } from "lucide-react"

export default function PartidoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [match, setMatch] = useState<Match | null>(null)
  const [detail, setDetail] = useState<MatchDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([loadMatches(), loadMatchDetail(id)])
      .then(([matches, d]) => {
        setMatch(matches.find(m => m.id === id) ?? null)
        setDetail(d)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="text-center py-20 text-gray-400">Cargando...</div>
  }

  if (!match || !detail) {
    return <div className="text-center py-20 text-gray-400">Partido no encontrado.</div>
  }

  const cltGoals = detail.goals.filter(g => !g.own_goal)
  const ownGoals = detail.goals.filter(g => g.own_goal)

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="text-sm mb-4 flex items-center gap-1 hover:underline"
        style={{ color: "#6B2D2D" }}
      >
        ← Volver
      </button>

      {/* Cabecera del partido */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden mb-6" style={{ borderColor: "#F0E8DF" }}>
        {/* Stripe decorativa bordo/blanco */}
        <div className="h-1 flex">
          <div className="flex-1" style={{ backgroundColor: "#6B2D2D" }} />
          <div className="flex-1 bg-white" />
          <div className="flex-1" style={{ backgroundColor: "#6B2D2D" }} />
          <div className="flex-1 bg-white" />
          <div className="flex-1" style={{ backgroundColor: "#6B2D2D" }} />
        </div>

        <div className="p-4 sm:p-6">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400 mb-4">
            <span className="font-semibold" style={{ color: "#6B2D2D" }}>{match.tournament}</span>
            <span>·</span>
            <span>{match.series}</span>
            <span>·</span>
            <span>Fecha {match.round}</span>
            <span>·</span>
            <span>{formatDate(match.datetime)}</span>
            {match.venue && <><span>·</span><span>{match.venue}</span></>}
          </div>

          {/* Marcador */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <TeamName name={match.home} isClt={match.clt_side === "home"} align="left" side={match.clt_side === "home" ? "home" : undefined} />
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: "#3A1A1A" }}>
                {match.score_home} <span className="text-gray-300 mx-0.5 sm:mx-1">-</span> {match.score_away}
              </div>
              <ResultBadge result={match.result} size="md" />
            </div>
            <TeamName name={match.away} isClt={match.clt_side === "away"} align="right" side={match.clt_side === "away" ? "away" : undefined} />
          </div>

          {/* GF / GA */}
          <div className="mt-3 text-center text-sm text-gray-400">
            CLT: {match.gf} a favor · {match.ga} en contra
          </div>
        </div>
      </div>

      {/* Detalles — cards apiladas en mobile, 2-col en desktop */}
      <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
        {/* Titulares */}
        <Section title="Titulares" icon="👕">
          {detail.starters.length === 0
            ? <Empty />
            : <div className="space-y-1">
                {detail.starters.map(p => (
                  <div key={p.carne || p.name} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#FAF6F1] transition-colors">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: "#6B2D2D" }}>
                      {p.shirt}
                    </span>
                    <span className="flex-1 text-sm font-medium">{toProperCase(p.name)}</span>
                    {p.captain && (
                      <span title="Capitán"
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold border"
                        style={{ color: "#D4A843", borderColor: "#D4A843" }}>C</span>
                    )}
                  </div>
                ))}
              </div>}
        </Section>

        {/* Cambios */}
        <Section title="Cambios" icon="🔄">
          {detail.subs.length === 0
            ? <Empty text="Sin cambios" />
            : <div className="space-y-2">
                {detail.subs.map((s, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded bg-[#FAF6F1]/50">
                    <span className="text-[10px] font-mono font-bold mt-0.5 px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: "#6B2D2D", color: "white" }}>
                      {s.minute}&apos;
                    </span>
                    <div className="flex-1 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded-full bg-red-500/20 text-red-600 text-[8px] flex items-center justify-center">↓</span>
                        <span className="text-gray-500">{toProperCase(s.out_name)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded-full bg-green-500/20 text-green-600 text-[8px] flex items-center justify-center">↑</span>
                        <span className="font-medium">{toProperCase(s.in_name)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>}
        </Section>

        {/* Goles */}
        <Section title="Goles CLT" icon="⚽">
          {detail.goals.length === 0
            ? <Empty text="Sin goles" />
            : <div className="space-y-1.5">
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

        {/* Disciplina */}
        <Section title="Disciplina" icon="📋">
          {detail.yellows.length === 0 && detail.reds.length === 0
            ? <Empty text="Sin tarjetas" />
            : <div className="space-y-1.5">
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
    </div>
  )
}

function TeamName({ name, isClt, align, side }: { name: string; isClt: boolean; align: "left" | "right"; side?: "home" | "away" }) {
  return (
    <div className={`flex-1 min-w-0 ${align === "right" ? "text-right" : "text-left"}`}>
      <div
        className={`text-sm sm:text-base font-bold leading-tight truncate ${isClt ? "" : "text-gray-600"}`}
        style={isClt ? { color: "#6B2D2D" } : {}}
      >
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
        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: "#6B2D2D" }}>
          {title}
        </h3>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

function Empty({ text = "Sin datos" }: { text?: string }) {
  return <p className="text-xs text-gray-400 italic py-2 text-center">{text}</p>
}
