"use client"
import Link from "next/link"
import { Calendar, TrendingUp, LayoutList, Users } from "lucide-react"

const items = [
  { Icon: Calendar,     label: "Resultados del fin de semana" },
  { Icon: TrendingUp,   label: "Goleadores de la temporada"   },
  { Icon: LayoutList,   label: "Tabla de posiciones"          },
  { Icon: Users,        label: "Fichas de los jugadores"      },
]

export default function ActualidadPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-10 sm:py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#6B2D2D" }}>Actualidad</h1>
        <p className="text-sm text-gray-500 mt-1">Temporada 2026</p>
      </div>

      <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "#D4A843" }}>
        {/* Header */}
        <div className="px-5 py-3" style={{ backgroundColor: "#D4A843" }}>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: "#3A1A1A" }}>
            Próximamente
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-7 sm:px-8 sm:py-10" style={{ backgroundColor: "#FDFAF6" }}>
          <h2 className="text-lg sm:text-xl font-bold mb-2" style={{ color: "#6B2D2D" }}>
            El campeonato está por comenzar
          </h2>
          <p className="text-sm text-gray-500 mb-7 leading-relaxed">
            Cuando arranque la temporada, vas a poder seguir todo desde acá.
          </p>

          <div className="space-y-3">
            {items.map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-3 py-2.5 px-3 rounded-lg" style={{ backgroundColor: "white", border: "1px solid #F0E8DF" }}>
                <Icon size={15} strokeWidth={1.8} style={{ color: "#D4A843", flexShrink: 0 }} />
                <span className="text-sm" style={{ color: "#3A1A1A" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 sm:px-8 border-t text-xs text-gray-400" style={{ borderColor: "#F0E8DF", backgroundColor: "#FAF6F1" }}>
          Mientras tanto, explorá la historia completa en{" "}
          <Link href="/historia" className="font-medium underline" style={{ color: "#6B2D2D" }}>Historia</Link>.
        </div>
      </div>
    </div>
  )
}
