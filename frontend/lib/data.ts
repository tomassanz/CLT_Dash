import type { Match, SeasonsData, MatchDetail, PlayersStats, LastUpdated, LeagueContext, PlayerIndex } from "./types"

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

async function loadJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`)
  return res.json() as Promise<T>
}

export function loadMatches(): Promise<Match[]> {
  return loadJSON<Match[]>("/data/matches.json")
}

export function loadSeasons(): Promise<SeasonsData> {
  return loadJSON<SeasonsData>("/data/seasons.json")
}

export function loadMatchDetail(id: string): Promise<MatchDetail> {
  return loadJSON<MatchDetail>(`/data/match/${id}.json`)
}

export function loadPlayersStats(): Promise<PlayersStats> {
  return loadJSON<PlayersStats>("/data/players_stats.json")
}

export function loadLastUpdated(): Promise<LastUpdated> {
  return loadJSON<LastUpdated>("/data/last_updated.json")
}

export function loadLeagueContext(): Promise<LeagueContext> {
  return loadJSON<LeagueContext>("/data/league_context.json")
}

export function loadPlayerIndex(): Promise<PlayerIndex> {
  return loadJSON<PlayerIndex>("/data/player_index.json")
}

// ── Helpers ──────────────────────────────────────────────────────────────────

export function rival(m: Match): string {
  return m.clt_side === "home" ? m.away : m.home
}

export function formatDate(dt: string | null): string {
  if (!dt) return "—"
  const d = new Date(dt)
  return d.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export function formatDateShort(dt: string | null): string {
  if (!dt) return "—"
  const d = new Date(dt)
  return d.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" })
}

export function resultLabel(r: string | null): string {
  if (r === "W") return "Victoria"
  if (r === "D") return "Empate"
  if (r === "L") return "Derrota"
  return "—"
}

export function scoreDisplay(m: Match): string {
  if (m.score_home === null || m.score_away === null) return "- vs -"
  return `${m.score_home} - ${m.score_away}`
}

export function toProperCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}
