import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import type { Metadata } from "next"
import type { Match } from "@/lib/types"
import PartidoClient from "./PartidoClient"

export function generateStaticParams() {
  const matchDir = join(process.cwd(), "public", "data", "match")
  const files = readdirSync(matchDir).filter(f => f.endsWith(".json"))
  return files.map(f => ({ id: f.replace(".json", "") }))
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params

  try {
    const matchesPath = join(process.cwd(), "public", "data", "matches.json")
    const matches: Match[] = JSON.parse(readFileSync(matchesPath, "utf-8"))
    const m = matches.find(m => m.id === id)

    if (!m) return { title: "Partido — CLT Fútbol" }

    const rival = m.clt_side === "home" ? m.away : m.home
    const rivalClean = rival.replace(/^CARRASCO LAWN TENNIS$/i, "CLT")
    const score = m.clt_side === "home"
      ? `${m.score_home}-${m.score_away}`
      : `${m.score_away}-${m.score_home}`
    const resultLabel = m.result === "W" ? "Victoria" : m.result === "D" ? "Empate" : "Derrota"
    const dateStr = m.datetime
      ? new Date(m.datetime).toLocaleDateString("es-UY", { day: "2-digit", month: "short", year: "numeric" })
      : ""

    const title = `CLT ${score} ${rivalClean} · ${m.series}`
    const description = `${resultLabel} · ${m.tournament} · ${dateStr}${m.venue ? ` · ${m.venue}` : ""}`

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://www.cltfutbol.com.uy/partido/${id}`,
        siteName: "CLT Fútbol",
        type: "website",
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    }
  } catch {
    return { title: "Partido — CLT Fútbol" }
  }
}

export default function PartidoPage({ params }: { params: Promise<{ id: string }> }) {
  return <PartidoClient paramsPromise={params} />
}
