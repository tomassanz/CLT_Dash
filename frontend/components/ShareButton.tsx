"use client"
import { useState } from "react"
import { Share2, Check, Copy, MessageCircle } from "lucide-react"
import type { Match } from "@/lib/types"
import { rival, toProperCase } from "@/lib/data"

function buildShareText(match: Match): { title: string; text: string; url: string } {
  const opp = toProperCase(rival(match))
  const score = match.clt_side === "home"
    ? `${match.score_home}-${match.score_away}`
    : `${match.score_away}-${match.score_home}`
  const url = `https://www.cltfutbol.com.uy/partido/${match.id}`
  const title = `CLT ${score} ${opp}`
  const text = `${title} · ${match.series}\n${url}`
  return { title, text, url }
}

export default function ShareButton({ match }: { match: Match }) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const { title, text, url } = buildShareText(match)

  async function handleShare() {
    // Mobile: native share sheet
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: `CLT ${match.clt_side === "home" ? match.score_home + "-" + match.score_away : match.score_away + "-" + match.score_home} ${toProperCase(rival(match))} · ${match.series}`, url })
      } catch {
        // user cancelled — do nothing
      }
      return
    }
    // Desktop: toggle dropdown
    setOpen(o => !o)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    setOpen(false)
  }

  function openWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank")
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
        style={{ backgroundColor: "#F0E8DF", color: "#6B2D2D" }}
        aria-label="Compartir partido"
      >
        <Share2 size={13} />
        <span className="hidden sm:inline">Compartir</span>
      </button>

      {/* Desktop dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border py-1 min-w-[180px]"
            style={{ borderColor: "#F0E8DF" }}
          >
            <button
              onClick={openWhatsApp}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[#FAF6F1] transition-colors"
            >
              <MessageCircle size={15} className="text-green-600" />
              <span>WhatsApp</span>
            </button>
            <button
              onClick={copyLink}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[#FAF6F1] transition-colors"
            >
              {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} className="text-gray-500" />}
              <span>{copied ? "¡Copiado!" : "Copiar link"}</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
