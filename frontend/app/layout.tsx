import type { Metadata } from "next"
import { Barlow_Condensed, Barlow } from "next/font/google"
import Link from "next/link"
import Image from "next/image"
import { Suspense } from "react"
import "./globals.css"

const barlow = Barlow({ variable: "--font-barlow", subsets: ["latin"], weight: ["400", "500", "600", "700"] })
const barlowCond = Barlow_Condensed({ variable: "--font-barlow-cond", subsets: ["latin"], weight: ["700", "800", "900"] })

export const metadata: Metadata = {
  title: "CLT Fútbol",
  description: "Dashboard histórico de fútbol del Carrasco Lawn Tennis Club en la Liga Universitaria",
  icons: {
    icon: "/favicon-32x32.png",
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${barlow.variable} ${barlowCond.variable} antialiased`}>
        {/* ── Header ── */}
        <header style={{ backgroundColor: "#6B2D2D" }} className="text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <Image
                src="/icon.jpg"
                alt="CLT"
                width={40}
                height={40}
                className="rounded-full border-2 hidden sm:block"
                style={{ borderColor: "#D4A843" }}
              />
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-base sm:text-lg tracking-wide" style={{ color: "#D4A843" }}>
                  CARRASCO LAWN TENNIS
                </span>
                <span className="text-[10px] sm:text-xs tracking-widest text-white/70 uppercase">
                  Fútbol · Liga Universitaria
                </span>
              </div>
            </Link>

            <nav className="flex items-center gap-1">
              <NavLink href="/actualidad">Actualidad</NavLink>
              <NavLink href="/historia">Historia</NavLink>
              <NavLink href="/jugador">Jugadores</NavLink>
            </nav>
          </div>

          {/* Línea dorada decorativa */}
          <div className="h-0.5 w-full" style={{ backgroundColor: "#D4A843" }} />
        </header>

        {/* ── Content ── */}
        <main>
          <Suspense fallback={<div className="flex items-center justify-center h-40 text-gray-400">Cargando...</div>}>
            {children}
          </Suspense>
        </main>

        {/* ── Footer ── */}
        <footer className="mt-12 border-t py-4 text-center text-xs opacity-40"
          style={{ borderColor: "#D4A843" }}>
          Carrasco Lawn Tennis · Datos: Liga Universitaria de Deportes
        </footer>
      </body>
    </html>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors"
    >
      {children}
    </Link>
  )
}
