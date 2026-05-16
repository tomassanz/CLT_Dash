"use client"
import { useEffect, useState } from "react"
import { X } from "lucide-react"

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby-BSwDW-HVyXb6wVHXlwjY99nSsWI7lAE-d0bmJgJOBtRji1NKJwtDAG9UQu72pgMqmA/exec"
const STORAGE_KEY = "clt_newsletter_dismissed"

type Rol = "Jugador" | "Técnico" | "Familiar" | "Hincha" | "Otro"
type Status = "idle" | "loading" | "ok" | "error"

export default function NewsletterPopup() {
  const [visible, setVisible] = useState(false)
  const [email, setEmail]       = useState("")
  const [nombre, setNombre]     = useState("")
  const [apellido, setApellido] = useState("")
  const [rol, setRol]           = useState<Rol | "">("")
  const [status, setStatus]     = useState<Status>("idle")

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return
    const t = setTimeout(() => setVisible(true), 5000)
    return () => clearTimeout(t)
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1")
    setVisible(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !nombre || !apellido || !rol) return

    // Fire and forget — no esperamos respuesta, Google Apps Script tarda 6-7s
    fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, nombre, apellido, rol }),
    }).catch(() => {})

    setStatus("ok")
    setTimeout(dismiss, 2500)
  }

  if (!visible) return (
    <button
      onClick={() => setVisible(true)}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold shadow-lg transition-opacity hover:opacity-90"
      style={{ backgroundColor: "#6B2D2D", color: "#D4A843", border: "1px solid #D4A84344" }}
    >
      <span>✉</span> Suscribirme
    </button>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={e => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div
        className="w-full sm:max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: "#6B2D2D", border: "1px solid #D4A84344" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="font-bold text-base" style={{ color: "#D4A843" }}>¡Seguí al CLT y enterate de todo!</p>
            <p className="text-sm mt-0.5" style={{ color: "#ffffff70" }}>
              Próximos partidos, resultados, novedades y mucho más.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-full transition-colors hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X size={16} style={{ color: "#ffffff70" }} />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px" style={{ backgroundColor: "#ffffff15" }} />

        {/* Content */}
        <div className="px-5 py-4">
          {status === "ok" ? (
            <div className="text-center py-3">
              <div className="text-3xl mb-2">⚽</div>
              <p className="font-bold text-sm" style={{ color: "#D4A843" }}>¡Listo, {nombre}!</p>
              <p className="text-xs mt-1" style={{ color: "#ffffff60" }}>Te avisamos cuando haya novedades.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg text-sm bg-white/10 text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-[#D4A843] transition-colors"
                />
                <input
                  type="text"
                  placeholder="Apellido"
                  value={apellido}
                  onChange={e => setApellido(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-lg text-sm bg-white/10 text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-[#D4A843] transition-colors"
                />
              </div>

              <input
                type="email"
                placeholder="Tu email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg text-sm bg-white/10 text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-[#D4A843] transition-colors"
              />

              <div className="flex gap-2 flex-wrap">
                {(["Jugador", "Técnico", "Familiar", "Hincha", "Otro"] as Rol[]).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRol(r)}
                    className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                    style={rol === r
                      ? { backgroundColor: "#D4A843", borderColor: "#D4A843", color: "#3A1A1A" }
                      : { backgroundColor: "transparent", borderColor: "#ffffff30", color: "#ffffff70" }
                    }
                  >
                    {r}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={status === "loading" || !email || !nombre || !apellido || !rol}
                className="w-full py-2 rounded-lg text-sm font-bold transition-opacity disabled:opacity-40"
                style={{ backgroundColor: "#D4A843", color: "#3A1A1A" }}
              >
                {status === "loading" ? "Enviando…" : "Suscribirme"}
              </button>

              {status === "error" && (
                <p className="text-xs text-red-400 text-center">Algo falló. Intentá de nuevo.</p>
              )}

              <p className="text-[10px] text-center" style={{ color: "#ffffff30" }}>
                Sin spam. Podés darte de baja cuando quieras.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
