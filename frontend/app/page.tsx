"use client"
import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { loadMatches, loadPlayersStats } from "@/lib/data"

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
      loadMatches(),
      loadPlayersStats(),
    ]).then(([matches, ps]) => {
      const seasonSet = new Set<number>()
      for (const m of matches) seasonSet.add(m.season)
      const playerSet = new Set<string>()
      for (const p of ps.appearances) playerSet.add(p.carne)
      for (const p of ps.scorers) playerSet.add(p.carne)

      setStats({
        matches: matches.length,
        seasons: seasonSet.size,
        players: playerSet.size,
        categories: 9,
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
          const duration = 1800
          const steps = 50
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
    <div ref={ref} className="font-display text-5xl sm:text-6xl md:text-7xl font-black uppercase" style={{ color: "#D4A843" }}>
      {count.toLocaleString("es-UY")}{suffix}
    </div>
  )
}

/* ── Feature card ───────────────────────────────────────────────────────────── */
function FeatureCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="border-l-3 pl-4 py-1" style={{ borderColor: "#D4A843" }}>
      <h3 className="font-display text-base sm:text-lg font-bold uppercase tracking-wide" style={{ color: "#3A1A1A" }}>{title}</h3>
      <p className="text-sm text-gray-500 mt-1 leading-relaxed">{desc}</p>
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
    <div>
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
          <div className={`transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <span className="inline-block text-[10px] sm:text-xs tracking-[0.25em] uppercase px-3 py-1 rounded-sm border font-medium"
              style={{ color: "#D4A843", borderColor: "#D4A84355" }}>
              NUEVA PLATAFORMA &middot; 2026
            </span>
          </div>

          {/* Club icon */}
          <div className={`mt-8 transition-all duration-500 delay-100 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <Image
              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/icon.jpg`}
              alt="CLT"
              width={72}
              height={72}
              className="rounded-full border-2 mx-auto"
              style={{ borderColor: "#D4A843" }}
            />
          </div>

          {/* Title */}
          <h1 className={`font-display text-5xl sm:text-6xl md:text-8xl font-black mt-6 uppercase leading-[0.9] tracking-tight transition-all duration-500 delay-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ color: "#FFFFFF" }}>
            CARRASCO<br />LAWN TENNIS
          </h1>

          {/* Subtitle */}
          <p className={`text-base sm:text-lg md:text-xl mt-5 uppercase tracking-widest font-semibold transition-all duration-500 delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ color: "#D4A843" }}>
            Toda la historia del futbol en un solo lugar
          </p>

          {/* Description */}
          <p className={`text-sm sm:text-base mt-5 leading-relaxed max-w-lg mx-auto transition-all duration-500 delay-400 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ color: "#FFFFFF88" }}>
            Por primera vez, todos los detalles del CLT en la Liga Universitaria
            — desde los primeros registros hasta el ultimo fin de semana.
          </p>

          {/* CTA */}
          <div className={`mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 transition-all duration-500 delay-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <Link
              href="/actualidad"
              className="inline-flex flex-col items-center px-7 py-3 rounded text-sm sm:text-base font-bold uppercase tracking-wider transition-colors duration-200 hover:bg-[#c99b38]"
              style={{ backgroundColor: "#D4A843", color: "#2A1010" }}
            >
              <span>Ver actualidad</span>
              <span className="text-[10px] sm:text-xs font-normal normal-case tracking-normal mt-0.5" style={{ color: "#2A101099" }}>
                Fixtures, tablas y resultados
              </span>
            </Link>
            <Link
              href="/historia"
              className="inline-block px-7 py-3 rounded text-sm sm:text-base font-bold uppercase tracking-wider transition-colors duration-200 hover:bg-[#c99b38]"
              style={{ backgroundColor: "#D4A843", color: "#2A1010" }}
            >
              Explorar la historia
            </Link>
            <Link
              href="/jugador"
              className="inline-block px-7 py-3 rounded text-sm sm:text-base font-bold uppercase tracking-wider transition-colors duration-200 hover:bg-[#c99b38]"
              style={{ backgroundColor: "#D4A843", color: "#2A1010" }}
            >
              Buscar jugadores
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4A843" strokeWidth="2" opacity="0.6">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          STATS
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-14 sm:py-18" style={{ backgroundColor: "#6B2D2D" }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <AnimatedNumber target={stats.matches} />
              <div className="text-xs uppercase tracking-[0.2em] mt-2 font-medium" style={{ color: "#FFFFFF77" }}>Partidos</div>
            </div>
            <div>
              <AnimatedNumber target={stats.seasons} />
              <div className="text-xs uppercase tracking-[0.2em] mt-2 font-medium" style={{ color: "#FFFFFF77" }}>Temporadas</div>
            </div>
            <div>
              <AnimatedNumber target={stats.players} suffix="+" />
              <div className="text-xs uppercase tracking-[0.2em] mt-2 font-medium" style={{ color: "#FFFFFF77" }}>Jugadores</div>
            </div>
            <div>
              <AnimatedNumber target={stats.categories} />
              <div className="text-xs uppercase tracking-[0.2em] mt-2 font-medium" style={{ color: "#FFFFFF77" }}>Categorias</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          FEATURES
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-14 sm:py-18" style={{ backgroundColor: "#FAF6F1" }}>
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-wide text-center mb-10" style={{ color: "#3A1A1A" }}>
            ¿QUE VAS A ENCONTRAR?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FeatureCard
              title="Todos los resultados"
              desc="Cada partido, cada gol, cada fecha. La historia completa del futbol de CLT en la Liga Universitaria."
            />
            <FeatureCard
              title="Fichas de jugadores"
              desc="Busca cualquier jugador y encontra sus estadisticas: partidos, goles, tarjetas y mas."
            />
            <FeatureCard
              title="Todas las categorias"
              desc="Desde Plantel Superior hasta Sub 14, pasando por +32 y +40. Todo en un mismo lugar."
            />
            <FeatureCard
              title="Actualidad"
              desc="Los resultados del ultimo fin de semana, actualizados automaticamente cada semana."
            />
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          NUEVA CAMISETA 2026
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="py-14 sm:py-18" style={{ backgroundColor: "#1A0A0A" }}>
        <div className="max-w-4xl mx-auto px-6">
          <a
            href="https://www.instagram.com/p/DWmuTDlibJZ/"
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-xl overflow-hidden transition-transform duration-300 hover:-translate-y-1"
            style={{ backgroundColor: "#2A1010" }}
          >
            <div className="flex flex-col sm:flex-row">
              {/* Image */}
              <div className="sm:w-2/5 flex-shrink-0 flex items-center justify-center p-6 sm:p-8"
                style={{ backgroundColor: "#3A1515" }}>
                <Image
                  src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/camiseta-2026.jpg`}
                  alt="Nueva camiseta CLT 2026"
                  width={280}
                  height={320}
                  className="object-contain max-h-64 sm:max-h-72 w-auto drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
                />
              </div>

              {/* Text */}
              <div className="flex-1 flex flex-col justify-center p-7 sm:p-10">
                <span className="inline-block self-start text-[10px] tracking-[0.25em] uppercase px-2.5 py-1 rounded-sm border font-semibold mb-4"
                  style={{ color: "#D4A843", borderColor: "#D4A84355" }}>
                  Nueva camiseta &middot; 2026
                </span>

                <h2 className="font-display text-2xl sm:text-3xl font-black uppercase leading-tight"
                  style={{ color: "#FFFFFF" }}>
                  La nueva piel<br />ya está acá
                </h2>

                <div className="mt-6 flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-colors duration-200"
                  style={{ color: "#D4A843" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  Ver en Instagram
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform duration-200 group-hover:translate-x-1">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </div>
          </a>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
          CTA FINAL
      ═══════════════════════════════════════════════════════════════════════ */}
      <section className="relative py-16 sm:py-20 overflow-hidden" style={{ backgroundColor: "#2A1010" }}>
        <div className="absolute inset-0 landing-stripes" />
        <div className="absolute inset-0 landing-grain" />

        <div className="relative z-10 text-center px-6 max-w-2xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-wide" style={{ color: "#FFFFFF" }}>
            LA HISTORIA SE ESCRIBE CADA FIN DE SEMANA
          </h2>
          <p className="text-sm sm:text-base mt-4" style={{ color: "#FFFFFF77" }}>
            Partidos, goles y estadisticas al dia. Siempre.
          </p>
          <div className="mt-8">
            <Link
              href="/actualidad"
              className="inline-block px-7 py-3 rounded text-sm sm:text-base font-bold uppercase tracking-wider transition-colors duration-200 hover:bg-[#c99b38]"
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
