import Link from "next/link"

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <p className="text-7xl font-black text-[#6B2D2D]" style={{ fontFamily: "var(--font-barlow-cond)" }}>
        404
      </p>
      <div className="mx-auto my-4 h-1 w-16 rounded bg-[#D4A843]" />
      <h1 className="mb-2 text-xl font-bold text-[#3A1A1A]">Esta página no existe</h1>
      <p className="mb-8 text-sm text-[#3A1A1A]/70">
        Puede que el link esté mal escrito o que la página se haya movido.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-[#6B2D2D] px-6 py-3 text-sm font-bold text-[#D4A843] transition hover:opacity-90"
        >
          Ir al inicio
        </Link>
        <Link
          href="/actualidad"
          className="rounded-lg border border-[#6B2D2D]/30 px-6 py-3 text-sm font-bold text-[#6B2D2D] transition hover:bg-[#6B2D2D]/5"
        >
          Ver la actualidad
        </Link>
      </div>
    </div>
  )
}
