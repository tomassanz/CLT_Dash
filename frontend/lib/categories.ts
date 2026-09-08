// Clasificación de categorías de CLT.
//
// La liga renombra los torneos a mitad de temporada ("Mayores Masculino" →
// "MAYORES", "Sub - 20" → "SUB 20", "MÁS 40" → "MAS 40") y en la segunda fase
// crea series nuevas ("SUB18 SERIE 3 RUEDA 2", "SUB14 COPA DE ORO"). Por eso
// las categorías se detectan por patrón y no por nombre exacto. Es el espejo de
// `classify_category` en scraper/json_generator.py.

export const CATEGORY_ORDER = [
  "mayores", "reserva", "presenior", "mas40", "mas48", "sub20", "sub18", "sub16", "sub14",
] as const

export type CategoryId = (typeof CATEGORY_ORDER)[number]

export const CATEGORY_NAMES: Record<CategoryId, string> = {
  mayores:   "Mayores",
  reserva:   "Reserva",
  presenior: "Presenior",
  mas40:     "Más 40",
  mas48:     "Más 48",
  sub20:     "Sub-20",
  sub18:     "Sub-18",
  sub16:     "Sub-16",
  sub14:     "Sub-14",
}

const PATTERNS: [CategoryId, RegExp][] = [
  ["sub20",     /SUB\s*-?\s*20/],
  ["sub18",     /SUB\s*-?\s*18/],
  ["sub16",     /SUB\s*-?\s*16/],
  ["sub14",     /SUB\s*-?\s*14/],
  ["mas48",     /MAS\s*-?\s*48/],
  ["mas40",     /MAS\s*-?\s*40/],
  ["presenior", /PRE\s*-?\s*SENIOR|PRESR|\bPRES\b/],
  ["reserva",   /RESERVA/],
  ["mayores",   /MAYORES/],
]

function norm(s: string | null | undefined): string {
  return (s ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
}

/** Id de categoría a partir del torneo y la serie del Sistema A, o null. */
export function classifyCategory(tournament: string | null | undefined, series: string | null | undefined): CategoryId | null {
  for (const text of [norm(tournament), norm(series)]) {
    for (const [id, re] of PATTERNS) {
      if (re.test(text)) return id
    }
  }
  return null
}

// Prefijo del label del Sistema B ("T18/18-3-" → "T18") → categoría
const LABEL_PREFIX: Record<string, CategoryId> = {
  T2: "mayores", T2B: "reserva", T20: "sub20", T18: "sub18",
  T16: "sub16", T14: "sub14", T32: "presenior", T40: "mas40", T48: "mas48",
}

/** Categoría de una tabla de liga a partir de su label ("T2/A", "T18/18-3-"...). */
export function categoryFromLabel(label: string): CategoryId | null {
  return LABEL_PREFIX[label.split("/")[0]] ?? null
}

/** Posición de una categoría en el orden de display (desconocidas al final). */
export function categoryOrder(id: string | null | undefined): number {
  const i = CATEGORY_ORDER.indexOf(id as CategoryId)
  return i === -1 ? 99 : i
}

export function categoryName(id: string | null | undefined, fallback = ""): string {
  return id && id in CATEGORY_NAMES ? CATEGORY_NAMES[id as CategoryId] : fallback
}
