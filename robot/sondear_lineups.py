"""Sondeo de alineaciones en Highlightly (NO toca la base de datos).

Objetivo: confirmar las 3 incognitas que tienen en stand-by la feature de
Formaciones+Avatares antes de cablear nada:

  1. ¿Highlightly devuelve LINEUPS / FORMATION (4-3-3, el 11 inicial)?
  2. ¿Trae FOTO del jugador (URL)?  -> decide fotos reales vs Avatar fallback.
  3. ¿Trae STATS por jugador (no solo topPlayers)?

Uso (en tu PC, con la key en el entorno):

    # opcion A: ya sabes el id del partido en Highlightly
    set HIGHLIGHTLY_KEY=tu_key   (Windows)   /   export ... (mac/linux)
    python robot/sondear_lineups.py 123456

    # opcion B: no sabes el id -> pasa una FECHA (YYYY-MM-DD) y toma el 1ro
    python robot/sondear_lineups.py 2026-06-11

Gasta 1-2 requests de los 100 diarios. Solo imprime; no escribe nada.
"""
from __future__ import annotations

import json
import os
import sys

import requests

HL_BASE = "https://soccer.highlightly.net"
LEAGUE_ID = 1635
SEASON = 2026

KEY = os.environ.get("HIGHLIGHTLY_KEY")
if not KEY:
    sys.exit("Falta HIGHLIGHTLY_KEY en el entorno. Setéala y reintenta.")


def hl_get(path: str, params: dict | None = None) -> dict:
    r = requests.get(
        f"{HL_BASE}{path}",
        headers={"x-rapidapi-key": KEY},
        params=params or {},
        timeout=25,
    )
    print(f"  [GET {path}] -> HTTP {r.status_code}")
    r.raise_for_status()
    return r.json()


def desempacar(d):
    """Devuelve el objeto-partido sin importar el wrapper de Highlightly."""
    if isinstance(d, list):
        return d[0] if d else None
    if isinstance(d, dict):
        if "data" in d and "events" not in d and "statistics" not in d:
            return desempacar(d["data"])
        return d
    return None


def buscar_clave(obj, objetivo: str, ruta: str = "") -> list[str]:
    """Busca recursivamente claves que contengan 'objetivo' (case-insensitive).
    Devuelve las rutas donde aparece (para no perdernos en JSON anidado)."""
    hits = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            rk = f"{ruta}.{k}" if ruta else k
            if objetivo.lower() in str(k).lower():
                hits.append(rk)
            hits += buscar_clave(v, objetivo, rk)
    elif isinstance(obj, list) and obj:
        # solo el primer elemento, para no inundar
        hits += buscar_clave(obj[0], objetivo, f"{ruta}[0]")
    return hits


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("Uso: python robot/sondear_lineups.py <match_id | YYYY-MM-DD>")

    arg = sys.argv[1].strip()

    # Si parece fecha, primero listamos y tomamos el primer partido.
    if "-" in arg and len(arg) == 10:
        print(f"Listando partidos del {arg}...")
        data = hl_get("/matches", {"leagueId": LEAGUE_ID, "season": SEASON, "date": arg})
        partidos = data.get("data", []) if isinstance(data, dict) else (data or [])
        if not partidos:
            sys.exit("No hubo partidos esa fecha. Probá otra (un día con partidos jugados).")
        match_id = partidos[0].get("id") or partidos[0].get("matchId")
        print(f"  Tomando el primero: id={match_id}")
    else:
        match_id = arg

    print(f"\n=== Detalle del partido {match_id} ===")
    detalle = desempacar(hl_get(f"/matches/{match_id}"))
    if not isinstance(detalle, dict):
        sys.exit("Respuesta inesperada del detalle.")

    print("\nClaves de nivel superior del partido:")
    print("  " + ", ".join(detalle.keys()))

    # --- Incognita 1: lineups / formation ---
    print("\n[1] ¿LINEUPS / FORMATION?")
    rutas_lineup = buscar_clave(detalle, "lineup") + buscar_clave(detalle, "formation")
    rutas_lineup += buscar_clave(detalle, "starting") + buscar_clave(detalle, "squad")
    if rutas_lineup:
        print("  SÍ aparece en:", ", ".join(sorted(set(rutas_lineup))))
    else:
        print("  No se vio en /matches/{id}. Probando endpoint dedicado /lineups...")
        try:
            ln = hl_get("/lineups", {"matchId": match_id})
            print("  /lineups respondió. Claves:",
                  ", ".join(ln.keys()) if isinstance(ln, dict) else type(ln).__name__)
            print(json.dumps(ln, ensure_ascii=False, indent=2)[:1500])
        except Exception as e:  # noqa: BLE001
            print("  /lineups falló:", e)

    # --- Incognita 2: foto del jugador ---
    print("\n[2] ¿FOTO del jugador (URL)?")
    rutas_foto = (buscar_clave(detalle, "photo") + buscar_clave(detalle, "image")
                  + buscar_clave(detalle, "logo") + buscar_clave(detalle, "avatar"))
    print("  " + ("SÍ: " + ", ".join(sorted(set(rutas_foto))) if rutas_foto
                  else "No se vieron campos de foto en el detalle."))

    # --- Incognita 3: stats por jugador ---
    print("\n[3] ¿STATS por jugador?")
    rutas_players = buscar_clave(detalle, "player") + buscar_clave(detalle, "rating")
    rutas_players += buscar_clave(detalle, "statistics")
    print("  " + ("Campos relacionados: " + ", ".join(sorted(set(rutas_players)))
                  if rutas_players else "No se vieron stats por jugador."))

    # Volcado parcial para inspección manual.
    print("\n=== JSON crudo (primeros 2500 chars) ===")
    print(json.dumps(detalle, ensure_ascii=False, indent=2)[:2500])


if __name__ == "__main__":
    main()
