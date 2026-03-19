"use client"
import { useState, useRef, useEffect } from "react"
import type { SeasonsData, Filters, AppearanceStat } from "@/lib/types"
import { toProperCase } from "@/lib/data"
import { SlidersHorizontal } from "lucide-react"

interface Props {
  data: SeasonsData
  filters: Filters
  players: AppearanceStat[]
  onChange: (f: Filters) => void
}

function toggle(arr: string[], val: string): string[] {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: "#6B2D2D", color: "white" }}
    >
      {label}
      <button onClick={onRemove} className="hover:opacity-70 leading-none">&times;</button>
    </span>
  )
}

function MultiSelect({
  label, options, selected, onToggle, disabled, placeholder = "Todos",
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (v: string) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const summary = selected.length === 0
    ? placeholder
    : selected.length === 1
    ? options.find(o => o.value === selected[0])?.label ?? selected[0]
    : `${selected.length} seleccionados`

  return (
    <div className="flex flex-col gap-1 flex-1 min-w-[120px] sm:flex-none sm:min-w-[130px]" ref={ref}>
      <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(o => !o)}
          className="w-full text-left text-sm border rounded px-2 py-1.5 bg-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between gap-1"
          style={{ borderColor: "#D4A843", color: "#3A1A1A" }}
        >
          <span className="truncate">{summary}</span>
          <span className="text-gray-400 shrink-0">{open ? "▲" : "▼"}</span>
        </button>

        {open && !disabled && (
          <div
            className="absolute z-50 mt-1 w-full bg-white border rounded shadow-lg max-h-56 overflow-y-auto"
            style={{ borderColor: "#D4A843", minWidth: "160px", maxWidth: "min(280px, 90vw)" }}
          >
            {options.map(opt => (
              <label
                key={opt.value}
                className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-[#FAF6F1]"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => onToggle(opt.value)}
                  className="accent-[#6B2D2D]"
                />
                {opt.label}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SearchSelect({
  label, options, selected, onToggle, placeholder = "Buscar...",
}: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onToggle: (v: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtered = query.length < 1
    ? options
    : options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))

  const summary = selected.length === 0
    ? "Todos"
    : selected.length === 1
    ? options.find(o => o.value === selected[0])?.label ?? selected[0]
    : `${selected.length} seleccionados`

  return (
    <div className="flex flex-col gap-1 flex-1 min-w-[140px] sm:flex-none sm:min-w-[170px]" ref={ref}>
      <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => { setOpen(o => !o); setTimeout(() => inputRef.current?.focus(), 50) }}
          className="w-full text-left text-sm border rounded px-2 py-1.5 bg-white flex items-center justify-between gap-1"
          style={{ borderColor: "#D4A843", color: "#3A1A1A" }}
        >
          <span className="truncate">{summary}</span>
          <span className="text-gray-400 shrink-0">{open ? "▲" : "▼"}</span>
        </button>

        {open && (
          <div
            className="absolute z-50 mt-1 bg-white border rounded shadow-lg"
            style={{ borderColor: "#D4A843", minWidth: "200px", maxWidth: "min(300px, 90vw)" }}
          >
            <div className="p-2 border-b" style={{ borderColor: "#F0E8DF" }}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1"
                style={{ borderColor: "#D4A843" }}
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0
                ? <p className="text-xs text-gray-400 italic px-3 py-2">Sin resultados</p>
                : filtered.map(opt => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-[#FAF6F1]"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(opt.value)}
                      onChange={() => onToggle(opt.value)}
                      className="accent-[#6B2D2D]"
                    />
                    {opt.label}
                  </label>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function FiltersPanel({ data, filters, players, onChange }: Props) {
  const [collapsed, setCollapsed] = useState(true)

  const set = <K extends keyof Filters>(key: K, val: Filters[K]) => {
    const next = { ...filters, [key]: val }
    if (key === "seasons")     { next.tournaments = []; next.series = [] }
    if (key === "tournaments") { next.series = [] }
    onChange(next)
  }

  const relevantSeasons = filters.seasons.length === 0
    ? data.seasons
    : data.seasons.filter(s => filters.seasons.includes(String(s.year)))

  const allTournaments = [...new Set(relevantSeasons.flatMap(s => s.tournaments.map(t => t.name)))]

  const relevantTournaments = relevantSeasons.flatMap(s =>
    s.tournaments.filter(t => filters.tournaments.length === 0 || filters.tournaments.includes(t.name))
  )
  const allSeries = [...new Set(relevantTournaments.flatMap(t => t.series))]

  const seasonOpts  = data.seasons.map(s => ({ value: String(s.year), label: String(s.year) }))
  const tourneyOpts = allTournaments.map(t => ({ value: t, label: t }))
  const seriesOpts  = allSeries.map(s => ({ value: s, label: s }))
  const playerOpts  = players.map(p => ({ value: p.carne, label: toProperCase(p.name) }))

  const hasFilters = filters.seasons.length > 0 || filters.tournaments.length > 0 ||
    filters.series.length > 0 ||
    filters.sides.length > 0 || filters.results.length > 0 || filters.player !== ""

  const activeCount = filters.seasons.length + filters.tournaments.length +
    filters.series.length +
    filters.sides.length + filters.results.length + (filters.player ? 1 : 0)

  const clearAll = () => onChange({
    seasons: [], tournaments: [], series: [], sides: [], results: [], player: ""
  })

  const chips: { label: string; onRemove: () => void }[] = [
    ...filters.seasons.map(y => ({
      label: y, onRemove: () => set("seasons", filters.seasons.filter(x => x !== y))
    })),
    ...filters.tournaments.map(t => ({
      label: t, onRemove: () => set("tournaments", filters.tournaments.filter(x => x !== t))
    })),
    ...filters.series.map(s => ({
      label: s, onRemove: () => set("series", filters.series.filter(x => x !== s))
    })),
    ...filters.sides.map(s => ({
      label: s === "home" ? "Local" : "Visitante",
      onRemove: () => set("sides", filters.sides.filter(x => x !== s))
    })),
    ...filters.results.map(r => ({
      label: r === "W" ? "Victoria" : r === "D" ? "Empate" : "Derrota",
      onRemove: () => set("results", filters.results.filter(x => x !== r))
    })),
    ...(filters.player ? [{
      label: toProperCase(players.find(p => p.carne === filters.player)?.name ?? filters.player),
      onRemove: () => set("player", "")
    }] : []),
  ]

  return (
    <div className="bg-white rounded-lg border p-3 sm:p-4 mb-4 shadow-sm" style={{ borderColor: "#F0E8DF" }}>
      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="sm:hidden flex items-center justify-between w-full text-sm font-semibold"
        style={{ color: "#6B2D2D" }}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={16} />
          Filtros
          {activeCount > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: "#6B2D2D" }}>
              {activeCount}
            </span>
          )}
        </span>
        <span className="text-gray-400">{collapsed ? "▼" : "▲"}</span>
      </button>

      {/* Dropdowns — always visible on sm+, collapsible on mobile */}
      <div className={`${collapsed ? "hidden" : "mt-3"} sm:block`}>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 items-end">
          <MultiSelect
            label="Temporada"
            options={seasonOpts}
            selected={filters.seasons}
            onToggle={v => set("seasons", toggle(filters.seasons, v))}
          />
          <MultiSelect
            label="Torneo"
            options={tourneyOpts}
            selected={filters.tournaments}
            onToggle={v => set("tournaments", toggle(filters.tournaments, v))}
            disabled={allTournaments.length === 0}
          />
          <MultiSelect
            label="Serie / Divisional"
            options={seriesOpts}
            selected={filters.series}
            onToggle={v => set("series", toggle(filters.series, v))}
            disabled={allSeries.length === 0}
          />
          <MultiSelect
            label="Condición"
            options={[{ value: "home", label: "Local" }, { value: "away", label: "Visitante" }]}
            selected={filters.sides}
            onToggle={v => set("sides", toggle(filters.sides, v))}
          />
          <MultiSelect
            label="Resultado"
            options={[
              { value: "W", label: "Victoria" },
              { value: "D", label: "Empate" },
              { value: "L", label: "Derrota" },
            ]}
            selected={filters.results}
            onToggle={v => set("results", toggle(filters.results, v))}
          />
          <SearchSelect
            label="Jugador"
            options={playerOpts}
            selected={filters.player ? [filters.player] : []}
            onToggle={v => set("player", filters.player === v ? "" : v)}
            placeholder="Buscar jugador..."
          />

          {hasFilters && (
            <div className="flex flex-col justify-end col-span-2 sm:col-span-1">
              <button
                onClick={clearAll}
                className="text-xs px-3 py-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chips — always visible (even when collapsed) */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t" style={{ borderColor: "#F0E8DF" }}>
          {chips.map((c, i) => (
            <Chip key={i} label={c.label} onRemove={c.onRemove} />
          ))}
        </div>
      )}
    </div>
  )
}
