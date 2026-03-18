"use client"
import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import type { Match, MatchDetail } from "@/lib/types"
import { loadMatches, loadMatchDetail, rival, formatDate, scoreDisplay, toProperCase } from "@/lib/data"
import ResultBadge from "@/components/ResultBadge"

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
      <div className="bg-white rounded-xl border shadow-sm p-6 mb-6" style={{ borderColor: "#F0E8DF" }}>
        {/* Meta */}
        <div className="text-xs text-gray-400 mb-3 flex flex-wrap gap-2">
          <span>{match.year}</span>
          <span>·</span>
          <span>{match.tournament}</span>
          <span>·</span>
          <span>{match.series}</span>
          <span>·</span>
          <span>Fecha {match.round}</span>
          <span>·</span>
          <span>{formatDate(match.datetime)}</span>
          {match.venue && <><span>·</span><span>{match.venue}</span></>}
        </div>

        {/* Marcador */}
        <div className="flex items-center justify-between gap-4">
          <TeamName name={match.home} isClt={match.clt_side === "home"} align="left" />
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div className="text-4xl font-bold tracking-tight" style={{ color: "#3A1A1A" }}>
              {match.score_home} <span className="text-gray-300 mx-1">-</span> {match.score_away}
            </div>
            <ResultBadge result={match.result} size="md" />
          </div>
          <TeamName name={match.away} isClt={match.clt_side === "away"} align="right" />
        </div>

        {/* GF / GA */}
        <div className="mt-3 text-center text-sm text-gray-400">
          CLT: {match.gf} a favor · {match.ga} en contra
        </div>
      </div>

      {/* Detalles */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Titulares */}
        <Section title="Titulares">
          {detail.starters.length === 0
            ? <Empty />
            : detail.starters.map(p => (
                <PlayerRow key={p.carne || p.name}>
                  <span className="text-gray-400 w-6 text-right text-xs shrink-0">{p.shirt}</span>
                  <span className="flex-1">{toProperCase(p.name)}</span>
                  {p.captain && <span title="Capitán" className="text-xs" style={{ color: "#D4A843" }}>★</span>}
                </PlayerRow>
              ))}
        </Section>

        {/* Cambios */}
        <Section title="Cambios">
          {detail.subs.length === 0
            ? <Empty text="Sin cambios" />
            : detail.subs.map((s, i) => (
                <PlayerRow key={i}>
                  <span className="text-gray-400 text-xs w-8 shrink-0">min {s.minute}</span>
                  <div className="flex-1 text-xs">
                    <div><span className="text-red-500">↓</span> {toProperCase(s.out_name)}</div>
                    <div><span className="text-green-600">↑</span> {toProperCase(s.in_name)}</div>
                  </div>
                </PlayerRow>
              ))}
        </Section>

        {/* Goles */}
        <Section title="Goles CLT">
          {detail.goals.length === 0
            ? <Empty text="Sin goles" />
            : <>
                {cltGoals.map((g, i) => (
                  <PlayerRow key={i}>
                    <span className="text-lg shrink-0">⚽</span>
                    <span className="flex-1">{toProperCase(g.name)}</span>
                    <span className="text-gray-400 text-xs">min {g.minute}</span>
                  </PlayerRow>
                ))}
                {ownGoals.map((g, i) => (
                  <PlayerRow key={`og-${i}`}>
                    <span className="text-lg shrink-0">⚽</span>
                    <span className="flex-1 line-through text-gray-400">{toProperCase(g.name)}</span>
                    <span className="text-xs text-red-400">en contra · min {g.minute}</span>
                  </PlayerRow>
                ))}
              </>}
        </Section>

        {/* Disciplina */}
        <Section title="Disciplina">
          {detail.yellows.length === 0 && detail.reds.length === 0
            ? <Empty text="Sin tarjetas" />
            : <>
                {detail.yellows.map((y, i) => (
                  <PlayerRow key={i}>
                    <span className="text-base shrink-0">🟨</span>
                    <span className="flex-1">{toProperCase(y.name)}</span>
                  </PlayerRow>
                ))}
                {detail.reds.map((r, i) => (
                  <PlayerRow key={i}>
                    <span className="text-base shrink-0">🟥</span>
                    <span className="flex-1">{toProperCase(r.name)}</span>
                    {r.obs && <span className="text-xs text-gray-400">{r.obs}</span>}
                  </PlayerRow>
                ))}
              </>}
        </Section>
      </div>
    </div>
  )
}

function TeamName({ name, isClt, align }: { name: string; isClt: boolean; align: "left" | "right" }) {
  return (
    <div className={`flex-1 ${align === "right" ? "text-right" : "text-left"}`}>
      <div
        className={`text-base font-bold leading-tight ${isClt ? "" : "text-gray-600"}`}
        style={isClt ? { color: "#6B2D2D" } : {}}
      >
        {name}
      </div>
      {isClt && (
        <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "#D4A843" }}>
          CLT
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4" style={{ borderColor: "#F0E8DF" }}>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#6B2D2D" }}>
        {title}
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function PlayerRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm py-0.5">{children}</div>
  )
}

function Empty({ text = "Sin datos" }: { text?: string }) {
  return <p className="text-xs text-gray-400 italic">{text}</p>
}
