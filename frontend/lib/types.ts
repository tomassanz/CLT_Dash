export interface Match {
  id: string
  season: number
  year: number
  tournament: string
  series: string
  round: string
  datetime: string | null
  venue: string | null
  home: string
  away: string
  score_home: number | null
  score_away: number | null
  clt_side: "home" | "away"
  gf: number | null
  ga: number | null
  result: "W" | "D" | "L" | null
}

export interface TournamentMeta {
  name: string
  series: string[]
}

export interface SeasonMeta {
  season: number
  year: number
  tournaments: TournamentMeta[]
}

export interface SeasonsData {
  seasons: SeasonMeta[]
}

export interface Starter {
  carne: string
  name: string
  shirt: string
  captain: boolean
}

export interface Sub {
  out_carne: string
  out_name: string
  in_carne: string
  in_name: string
  shirt: string
  minute: string
}

export interface Goal {
  carne: string
  name: string
  minute: string
  own_goal: boolean
}

export interface Yellow {
  name: string
}

export interface Red {
  name: string
  obs: string
}

export interface MatchDetail {
  match_id: string
  starters: Starter[]
  subs: Sub[]
  goals: Goal[]
  yellows: Yellow[]
  reds: Red[]
}

export interface ScorerStat {
  carne: string
  name: string
  goals: number
  bySeason: { year: number; goals: number }[]
}

export interface AppearanceStat {
  carne: string
  name: string
  starters: number
  subs_in: number
  total: number
}

export interface PlayersStats {
  scorers: ScorerStat[]
  appearances: AppearanceStat[]
}

export interface LastUpdated {
  updated_at: string
  latest_season: number
}

export interface Filters {
  seasons:     string[]   // años seleccionados (ej: ["2024","2025"])
  tournaments: string[]
  series:      string[]
  sides:       string[]   // "home" | "away"
  results:     string[]   // "W" | "D" | "L"
  player:      string     // carne del jugador, o ""
}

// ─── Contexto de liga ───────────────────────────────────────────────────────

export interface LeagueStanding {
  rank: number
  institution: string
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  points: number
}

export interface LeagueScorer {
  player: string
  institution: string
  goals: number
}

export interface LeagueGoalkeeper {
  player: string
  institution: string
  gr: number
  matches: number
  ppp: number
}

export interface SeriesLeagueContext {
  label: string            // ej: "T2/AT"
  standings: LeagueStanding[]
  clt_rank: number | null
  clt_points: number | null
  scorers: LeagueScorer[]
  goalkeepers: LeagueGoalkeeper[]
}

// league_context.json: { [season_number]: SeriesLeagueContext[] }
export type LeagueContext = Record<string, SeriesLeagueContext[]>

// player_index.json: { carne: match_id[] }
export type PlayerIndex = Record<string, string[]>
