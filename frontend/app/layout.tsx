"use client"
import { Barlow_Condensed, Barlow } from "next/font/google"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { Suspense } from "react"
import { Instagram } from "lucide-react"
import "./globals.css"

const barlow = Barlow({ variable: "--font-barlow", subsets: ["latin"], weight: ["400", "500", "600", "700"] })
const barlowCond = Barlow_Condensed({ variable: "--font-barlow-cond", subsets: ["latin"], weight: ["700", "800", "900"] })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <title>CLT Fútbol</title>
        <meta name="description" content="Toda la historia del fútbol del Carrasco Lawn Tennis Club en la Liga Universitaria de Deportes" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="shortcut icon" href="/favicon-32x32.png" />
        <meta property="og:title" content="CLT Fútbol" />
        <meta property="og:description" content="Toda la historia del fútbol del Carrasco Lawn Tennis Club en la Liga Universitaria de Deportes" />
        <meta property="og:image" content="/icon.jpg" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="CLT Fútbol" />
        <meta name="twitter:description" content="Toda la historia del fútbol del Carrasco Lawn Tennis Club en la Liga Universitaria" />
        <meta name="twitter:image" content="/icon.jpg" />
      </head>
      <body className={`${barlow.variable} ${barlowCond.variable} antialiased`}>
        <Suspense>
          <Header />
        </Suspense>

        <main>
          <Suspense fallback={
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
              <div className="h-8 w-48 rounded bg-gray-200 animate-pulse" />
              <div className="h-4 w-72 rounded bg-gray-100 animate-pulse" />
              <div className="space-y-3 mt-6">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
                ))}
              </div>
            </div>
          }>
            {children}
          </Suspense>
        </main>

        <footer className="mt-12 border-t py-6" style={{ borderColor: "#D4A843" }}>
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-gray-400">
              Carrasco Lawn Tennis
            </span>
            <div className="flex items-center gap-4">
              <a
                href="https://www.instagram.com/clt_futbol/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#6B2D2D] transition-colors"
              >
                <Instagram size={14} />
                <span>@clt_futbol</span>
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}

function Header() {
  const pathname = usePathname()

  return (
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
          <NavLink href="/actualidad" active={pathname === "/actualidad"}>Actualidad</NavLink>
          <NavLink href="/historia" active={pathname === "/historia"}>Historia</NavLink>
          <NavLink href="/jugador" active={pathname.startsWith("/jugador")}>Jugadores</NavLink>
        </nav>
      </div>

      <div className="h-0.5 w-full" style={{ backgroundColor: "#D4A843" }} />
    </header>
  )
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
        active
          ? "text-white bg-white/15"
          : "text-white/70 hover:text-white hover:bg-white/10"
      }`}
      style={active ? { color: "#D4A843" } : {}}
    >
      {children}
    </Link>
  )
}
