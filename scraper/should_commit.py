"""
Decide si los cambios generados por el scraper valen un commit.

Cada corrida de `json_generator.py` reescribe dos timestamps
(`last_updated.json → updated_at` y `fixtures_live.json → generated`) aunque
no haya novedades, y SQLite reescribe bytes internos de `clt.db` sin cambiar
los datos. Sin este filtro el workflow horario commiteaba ~24 veces por día,
disparando un build de Vercel y otro de GitHub Pages cada vez.

Este script compara el árbol de trabajo contra HEAD ignorando ese ruido:

  - JSONs: se comparan con los campos volátiles removidos.
  - clt.db: se compara el dump lógico de SQLite, no los bytes del archivo.

Si no hubo cambios reales, revierte los archivos para dejar el árbol limpio y
escribe `changed=false` en $GITHUB_OUTPUT. Si los hubo, no toca nada y escribe
`changed=true` (el commit incluye los timestamps nuevos).

Uso: python should_commit.py   (desde la raíz del repo)
"""

import hashlib
import json
import os
import sqlite3
import subprocess
import sys
import tempfile
from pathlib import Path

DATA_DIR = "frontend/public/data"
DB_PATH = "scraper/clt.db"

# Campos que cambian en cada corrida sin que haya datos nuevos.
VOLATILE_FIELDS = {
    f"{DATA_DIR}/last_updated.json": ("updated_at",),
    f"{DATA_DIR}/fixtures_live.json": ("generated",),
}


def git(*args: str) -> str:
    return subprocess.run(["git", *args], capture_output=True, text=True,
                          check=True).stdout


def changed_paths() -> tuple[list[str], list[str]]:
    """(archivos modificados o borrados, archivos nuevos sin trackear)."""
    tracked = [p for p in git("diff", "--name-only", "HEAD", "--",
                              DATA_DIR, DB_PATH).splitlines() if p]
    untracked = [p for p in git("ls-files", "--others", "--exclude-standard",
                                "--", DATA_DIR, DB_PATH).splitlines() if p]
    return tracked, untracked


def head_blob(path: str) -> bytes | None:
    """Contenido de `path` en HEAD, o None si ahí no existía."""
    r = subprocess.run(["git", "show", f"HEAD:{path}"], capture_output=True)
    return r.stdout if r.returncode == 0 else None


def json_without_volatile(raw: bytes, path: str):
    data = json.loads(raw)
    if isinstance(data, dict):
        for field in VOLATILE_FIELDS.get(path, ()):
            data.pop(field, None)
    return data


def db_fingerprint(raw: bytes) -> str:
    """Hash del dump lógico de la base, ignorando el layout binario."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        tmp.write(raw)
        tmp_path = tmp.name
    try:
        conn = sqlite3.connect(f"file:{tmp_path}?mode=ro", uri=True)
        try:
            h = hashlib.sha256()
            for line in conn.iterdump():
                h.update(line.encode("utf-8"))
            return h.hexdigest()
        finally:
            conn.close()
    finally:
        os.unlink(tmp_path)


def file_changed_for_real(path: str) -> bool:
    """True si `path` cambió más allá del ruido conocido."""
    old = head_blob(path)
    if old is None:
        return True  # archivo nuevo

    p = Path(path)
    if not p.exists():
        return True  # archivo borrado

    new = p.read_bytes()
    if old == new:
        return False

    if path == DB_PATH:
        try:
            return db_fingerprint(old) != db_fingerprint(new)
        except sqlite3.Error as e:
            print(f"  WARN: no se pudo comparar {path} ({e}) — se asume cambio",
                  file=sys.stderr)
            return True

    if path.endswith(".json"):
        try:
            return json_without_volatile(old, path) != json_without_volatile(new, path)
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            print(f"  WARN: no se pudo parsear {path} ({e}) — se asume cambio",
                  file=sys.stderr)
            return True

    return True


def emit(changed: bool) -> None:
    out = os.environ.get("GITHUB_OUTPUT")
    if out:
        with open(out, "a", encoding="utf-8") as f:
            f.write(f"changed={'true' if changed else 'false'}\n")


def main() -> None:
    tracked, untracked = changed_paths()

    if untracked:
        print(f"Cambios reales: {len(untracked)} archivo(s) nuevo(s), "
              f"ej. {untracked[0]}")
        emit(True)
        return

    if not tracked:
        print("Sin cambios en los datos.")
        emit(False)
        return

    real = [p for p in tracked if file_changed_for_real(p)]

    if real:
        print(f"Cambios reales en {len(real)} archivo(s): "
              f"{', '.join(real[:5])}{' …' if len(real) > 5 else ''}")
        emit(True)
        return

    # Solo timestamps y churn binario de SQLite: revertir y no commitear.
    print(f"Solo cambiaron timestamps en {len(tracked)} archivo(s) — "
          f"no se commitea.")
    subprocess.run(["git", "checkout", "--", DATA_DIR, DB_PATH], check=True)
    emit(False)


if __name__ == "__main__":
    main()
