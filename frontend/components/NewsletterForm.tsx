"use client"
import { useState } from "react"

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyaiac7v3g21NgLZ9cZK7xISffYOIhuJHW7xIA0Rrju2IjMBmh7dVThsabM2MNuyO7o1g/exec"

type Rol = "Jugador" | "Técnico" | "Familiar" | "Hincha"
type Status = "idle" | "loading" | "ok" | "error"

export default function NewsletterForm() {
  const [email, setEmail]       = useState("")
  const [nombre, setNombre]     = useState("")
  const [apellido, setApellido] = useState("")
  const [rol, setRol]           = useState<Rol | "">("")
  const [status, setStatus]     = useState<Status>("idle")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !nombre || !apellido || !rol) return
    setStatus("loading")

    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, nombre, apellido, rol }),
      })
      setStatus("ok")
    } catch {
      setStatus("error")
    }
  }

  if (status === "ok") {
    return (
      <div className="text-center py-4">
        <div className="text-2xl mb-1">⚽</div>
        <p className="font-bold text-sm" style={{ color: "#D4A843" }}>¡Listo, {nombre}!</p>
        <p className="text-xs text-white/60 mt-0.5">Te avisamos cuando haya novedades del CLT.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 w-full max-w-sm mx-auto">
      <p className="text-xs font-semibold uppercase tracking-widest text-center" style={{ color: "#D4A843" }}>
        Seguí al CLT
      </p>
      <p className="text-xs text-white/50 text-center -mt-1">
        Resultados y novedades directo a tu email.
      </p>

      {/* Nombre + Apellido */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          required
          className="flex-1 px-3 py-2 rounded-lg text-sm bg-white/10 text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-[#D4A843] transition-colors"
        />
        <input
          type="text"
          placeholder="Apellido"
          value={apellido}
          onChange={e => setApellido(e.target.value)}
          required
          className="flex-1 px-3 py-2 rounded-lg text-sm bg-white/10 text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-[#D4A843] transition-colors"
        />
      </div>

      {/* Email */}
      <input
        type="email"
        placeholder="Tu email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="w-full px-3 py-2 rounded-lg text-sm bg-white/10 text-white placeholder-white/30 border border-white/10 focus:outline-none focus:border-[#D4A843] transition-colors"
      />

      {/* Rol */}
      <div className="flex gap-2 flex-wrap justify-center">
        {(["Jugador", "Técnico", "Familiar", "Hincha"] as Rol[]).map(r => (
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
    </form>
  )
}
