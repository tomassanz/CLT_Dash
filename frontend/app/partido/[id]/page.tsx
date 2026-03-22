import { readdirSync } from "fs"
import { join } from "path"
import PartidoClient from "./PartidoClient"

export function generateStaticParams() {
  const matchDir = join(process.cwd(), "public", "data", "match")
  const files = readdirSync(matchDir).filter(f => f.endsWith(".json"))
  return files.map(f => ({ id: f.replace(".json", "") }))
}

export default function PartidoPage({ params }: { params: Promise<{ id: string }> }) {
  return <PartidoClient paramsPromise={params} />
}
