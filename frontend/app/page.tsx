"use client"
import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"

/* ── Stats from data ────────────────────────────────────────────────────────── */
interface LandingStats {
  matches: number
  seasons: number
  players: number
  categories: number
}

function useStats(): LandingStats {
  const [stats, setStats] = useState<LandingStats>({ matches: 0, seasons: 0, players: 0, categories: 0 })

  useEffect(() => {
    Promise.all([
      fetch("/data/matches.json").then(r => r.json()),
      fetch("/data/players_stats.json").then(r => r.json()),
    ]).then(([matches, ps]) => {
      const seasonSet = new Set<number>()
      const catSet = new Set<string>()
      for (const m of matches) {
        seasonSet.add(m.season)
        catSet.add(m.tournament)
      }
      const playerSet = new Set<string>()
      for (const p of ps.appearances) playerSet.add(p.carne)
      for (const p of ps.scorers) playerSet.add(p.carne)

      setStats({
        matches: matches.length,
        seasons: seasonSet.size,
        players: playerSet.size,
        categories: catSet.size,
      })
    }).catch(() => {})
  }, [])

  return stats
}

/* ── Animated counter ───────────────────────────────────────────────────────── */
function AnimatedNumber({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (!ref.current || target === 0) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const duration = 2000
          const steps = 60
          const increment = target / steps
          let current = 0
          const interval = setInterval(() => {
            current += increment
            if (current >= target) {
              setCount(target)
              clearInterval(interval)
            } else {
              setCount(Math.floor(current))
            }
          }, duration / steps)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return (
    <div ref={ref} className="font-playfair text-4xl sm:text-5xl md:text-6xl font-black" style={{ color: "#D4A843" }}>
      {count.toLocaleString("es-UY")}{suffix}
    </div>
  )
}

/* ── Feature card ───────────────────────────────────────────────────────────── */
function FeatureCard({ emoji, title, desc }: { emoji: string; title: string; desc: string }) {
  return (
    <div className="group bg-white rounded-xl p-6 border transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
      style={{ borderColor: "#F0E8DF" }}>
      <div className="flex items-start gap-4">
        <div className="w-1 self-stretch rounded-full transition-colors duration-300 bg-transparent group-hover:bg-[#D4A843]" />
        <div>
          <span className="text-2xl">{emoji}</span>
          <h3 className="font-playfair text-lg font-bold mt-2" style={{ color: "#3A1A1A" }}>{title}</h3>
          <p className="text-sm text-gray-600 mt-1 leading-relaxed">{desc}</p>
        </div>
      </div>
    </div>
  )
}

/* ── Landing page ───────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const stats = useStats()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="landing-page">
      {/* ═══════════════════════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: "#2A1010" }}>

        {/* Stripe texture */}
        <div className="absolute inset-0 landing-stripes" />

        {/* Grain overlay */}
        <div className="absolute inset-0 landing-grain" />

        {/* Content */}
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          {/* Badge */}
          <div className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <span className="inline-block text-[10px] sm:text-xs tracking-[0.3em] uppercase px-4 py-1.5 rounded-full border"
              style={{ color: "#D4A843", borderColor: "#D4A84366" }}>
              Nueva plataforma &middot; 2026
            </span>
          </div>

          {/* Club icon */}
          <div className={`mt-8 transition-all duration-700 delay-150 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <Image
              src="/icon.jpg"
              alt="CLT"
              width={80}
              height={80}
              className="rounded-full border-2 mx-auto"
              style={{ borderColor: "#D4A843" }}
            />
          </div>

          {/* Title */}
          <h1 className={`font-playfair text-4xl sm:text-5xl md:text-7xl font-black mt-6 tracking-tight transition-all duration-700 delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{ color: "#FFFFFF" }}>
            CARRASCO<br />LAWN TENNIS
          </h1>

          {/* Subtitle */}
          <p className={`font-playfair text-lg sm:text-xl md:text-2xl italic mt-4 transition-all duration-700 delay-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{ color: "#D4A843" }}>
            Toda la historia del futbol, en un solo lugar
          </p>

          {/* Description */}
          <p className={`text-sm sm:text-base mt-6 leading-relaxed max-w-xl mx-auto transition-all duration-700 delay-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{ color: "#FFFFFF99" }}>
            Por primera vez, todos los partidos, todos los goles, todos los jugadores del futbol de CLT
            en la Liga Universitaria &mdash; desde los primeros registros hasta el ultimo fin de semana.
          </p>

          {/* CTA */}
          <div className={`mt-10 transition-all duration-700 delay-900 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <Link
              href="/historia"
              className="inline-block px-8 py-3 rounded-lg text-sm sm:text-base font-bold tracking-wide transition-all duration-300 hover:scale-105 hover:shadow-xl"
              style={{ backgroundColor: "#D4A843", color: "#2A1010" }}
            >
              Explorar la historia
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4A84366" strokeWidth="2">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          STATS
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20" style={{ backgroundColor: "#6B2D2D" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <AnimatedNumber target={stats.matches} />
              <div className="text-xs sm:text-sm uppercase tracking-widest mt-2" style={{ color: "#FFFFFF99" }}>Partidos</div>
            </div>
            <div>
              <AnimatedNumber target={stats.seasons} />
              <div className="text-xs sm:text-sm uppercase tracking-widest mt-2" style={{ color: "#FFFFFF99" }}>Temporadas</div>
            </div>
            <div>
              <AnimatedNumber target={stats.players} suffix="+" />
              <div className="text-xs sm:text-sm uppercase tracking-widest mt-2" style={{ color: "#FFFFFF99" }}>Jugadores</div>
            </div>
            <div>
              <AnimatedNumber target={stats.categories} />
              <div className="text-xs sm:text-sm uppercase tracking-widest mt-2" style={{ color: "#FFFFFF99" }}>Categorias</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          FEATURES
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 sm:py-20" style={{ backgroundColor: "#FAF6F1" }}>
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="font-playfair text-2xl sm:text-3xl font-bold text-center mb-12" style={{ color: "#3A1A1A" }}>
            ¿Que vas a encontrar?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FeatureCard
              emoji="📊"
              title="Todos los resultados"
              desc="Cada partido, cada gol, cada fecha. La historia completa del futbol de CLT en la Liga Universitaria."
            />
            <FeatureCard
              emoji="👤"
              title="Fichas de jugadores"
              desc="Busca cualquier jugador y encontra sus estadisticas: partidos, goles, tarjetas y mas."
            />
            <FeatureCard
              emoji="🏆"
              title="Todas las categorias"
              desc="Desde Plantel Superior hasta Sub 14, pasando por +32, +40 y femenino. Todo en un mismo lugar."
            />
            <FeatureCard
              emoji="📅"
              title="Actualidad en vivo"
              desc="Los resultados del ultimo fin de semana, actualizados automaticamente cada semana."
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          CTA FINAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-20 sm:py-24 overflow-hidden" style={{ backgroundColor: "#2A1010" }}>
        <div className="absolute inset-0 landing-stripes" />
        <div className="absolute inset-0 landing-grain" />

        <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
          <h2 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-bold" style={{ color: "#FFFFFF" }}>
            La historia se escribe cada fin de semana
          </h2>
          <p className="text-sm sm:text-base mt-4" style={{ color: "#FFFFFF99" }}>
            Resultados actualizados automaticamente despues de cada fecha.
          </p>
          <div className="mt-10">
            <Link
              href="/actualidad"
              className="landing-cta-pulse inline-block px-8 py-3 rounded-lg text-sm sm:text-base font-bold tracking-wide transition-all duration-300 hover:scale-105"
              style={{ backgroundColor: "#D4A843", color: "#2A1010" }}
            >
              Ver resultados recientes
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
