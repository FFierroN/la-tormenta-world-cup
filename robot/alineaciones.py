"""Robot de ALINEACIONES: Highlightly /lineups/{id}  ->  partidos.alineaciones.

Highlightly publica las alineaciones (formacion + 11 inicial + banca) ~1 hora
antes del pitazo en el endpoint GET /lineups/{matchId} (path param). Este robot
las baja y las guarda normalizadas en la columna JSONB partidos.alineaciones.

OJO con la arquitectura: el marcador/eventos EN VIVO los maneja el Cloudflare
Worker (worker-vivo/). Las alineaciones NO las toca el worker, asi que este
robot es una pieza NUEVA y aislada (no pisa nada). Reusa las funciones de
enriquecer.py (resolucion de match_id, hl_get) para no duplicar logica.

MODO:
  'auto'  (default) -> partidos sin alineaciones cuya hora ya entro en la
                       ventana (desde VENTANA_MIN antes del inicio en adelante,
                       incluye en vivo y finalizados). Si HL aun no publico el
                       lineup, queda null y se reintenta en la proxima corrida.
  'todos'           -> re-carga las alineaciones de todos los partidos ya
                       relevantes (fecha <= ahora + VENTANA_MIN). Util para test.

Variables de entorno:
  SUPABASE_URL, SUPABASE_SERVICE_KEY  (ver comun.py)
  HIGHLIGHTLY_KEY                      (header x-rapidapi-key)
  MODO         (auto|todos, default auto)
  VENTANA_MIN  (minutos antes del inicio para empezar a buscar, default 90)

Presupuesto: 1 GET /lineups por partido en ventana, +1 GET /matches?date si hay
que resolver el id (cacheado por fecha). En un dia cargado, ~10-20 de los 100.
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone

from comun import sb_get, sb_patch
# Reuso de enriquecer.py (DRY): mismo cliente HL y misma resolucion de id.
from enriquecer import LimiteDiario, buscar_match_id, hl_get

MODO = os.getenv("MODO", "auto").strip().lower()
VENTANA_MIN = int(os.getenv("VENTANA_MIN", "90"))
# Cuantos minutos DESPUES del inicio seguir intentando (piso de la ventana).
# Cubre el partido completo + margen; luego ya no se reintenta (evita fuga).
VENTANA_POST = int(os.getenv("VENTANA_POST", "180"))


def _jugador(j: dict) -> dict:
    """Normaliza un jugador de HL a nuestra forma compacta."""
    return {
        "nombre": (j.get("name") or "").strip(),
        "numero": j.get("number"),
        "posicion": j.get("position"),
        "id": j.get("id"),
    }


def _lineas(initial) -> list[list[dict]]:
    """initialLineup viene como lista de lineas (lista de listas de jugadores).
    Lo dejamos asi (cada linea = una fila en la cancha). Tolera la forma plana.
    """
    if not isinstance(initial, list):
        return []
    # Forma esperada: [[gk], [def...], [mid...], [fwd...]]
    if initial and isinstance(initial[0], list):
        return [[_jugador(j) for j in linea] for linea in initial]
    # Forma plana (por las dudas): una sola linea con todos.
    return [[_jugador(j) for j in initial]]


def _equipo(eq: dict | None) -> dict | None:
    if not isinstance(eq, dict):
        return None
    return {
        "formacion": eq.get("formation"),
        "titulares": _lineas(eq.get("initialLineup")),
        "suplentes": [_jugador(j) for j in (eq.get("substitutes") or [])],
    }


def alineaciones_desde_hl(match_id: int) -> dict | None:
    """GET /lineups/{id} -> {local, visita} normalizado, o None si no hay aun."""
    data = hl_get(f"/lineups/{match_id}")
    # Tolerar wrapper {"data": {...}}.
    if isinstance(data, dict) and "homeTeam" not in data and "data" in data:
        data = data["data"]
    if not isinstance(data, dict):
        return None
    local = _equipo(data.get("homeTeam"))
    visita = _equipo(data.get("awayTeam"))
    if not local and not visita:
        return None
    # Si no hay ni titulares ni suplentes en ninguno, HL todavia no lo publico.
    def vacio(e):
        return not e or (not e["titulares"] and not e["suplentes"])
    if vacio(local) and vacio(visita):
        return None
    return {"local": local, "visita": visita}


def _en_ventana(p: dict, ahora: datetime) -> bool:
    """True si AHORA cae dentro de la ventana de carga del partido:
    desde VENTANA_MIN antes del inicio hasta VENTANA_POST despues.

    Tener PISO (no solo techo) es clave: sin el, el cron reintentaba TODOS los
    partidos viejos sin alineacion en cada corrida -> fuga de cuota de HL. Con
    el piso, un partido que termino hace rato ya no se vuelve a consultar.
    """
    try:
        f = datetime.fromisoformat(str(p.get("fecha")).replace("Z", "+00:00"))
        if f.tzinfo is None:
            f = f.replace(tzinfo=timezone.utc)
    except (ValueError, TypeError):
        return False  # sin fecha valida: NO lo intentamos (evita fuga)
    desde = f - timedelta(minutes=VENTANA_MIN)
    hasta = f + timedelta(minutes=VENTANA_POST)
    return desde <= ahora <= hasta


def candidatos() -> list[dict]:
    """Partidos a los que toca (re)cargar alineaciones."""
    ahora = datetime.now(timezone.utc)
    if MODO == "todos":
        # Backfill manual: todos (sin ventana). El tope MAX_HL evita desbordes.
        return sb_get("partidos", {"select": "*", "order": "fecha"})
    # auto: solo los sin alineaciones que esten DENTRO de la ventana acotada.
    sin = sb_get("partidos", {
        "alineaciones": "is.null", "select": "*", "order": "fecha",
    })
    return [p for p in sin if _en_ventana(p, ahora)]


def main() -> None:
    pendientes = candidatos()
    if not pendientes:
        print("Alineaciones: nada que hacer (ningun partido en ventana).")
        return

    print(f"Alineaciones: {len(pendientes)} partido(s) candidato(s) (modo {MODO}).")
    cache_fecha: dict = {}
    hechos = 0
    for p in pendientes:
        etiqueta = f"{p.get('equipo_local')} vs {p.get('equipo_visita')}"
        try:
            mid = buscar_match_id(p, cache_fecha)
            if mid is None:
                continue
            al = alineaciones_desde_hl(mid)
            if al is None:
                print(f"  [{etiqueta}] HL aun no publica alineacion. Reintentar luego.")
                continue
            sb_patch("partidos", {"id": f"eq.{p['id']}"}, {"alineaciones": al})
            hechos += 1
            fl = (al.get("local") or {}).get("formacion")
            fv = (al.get("visita") or {}).get("formacion")
            print(f"  [{etiqueta}] OK  local {fl} / visita {fv}")
        except LimiteDiario:
            print("  Limite diario de Highlightly alcanzado. Sigo en la proxima corrida.")
            break
        except Exception as e:  # noqa: BLE001
            print(f"  [{etiqueta}] ERROR: {e}", file=sys.stderr)

    print(f"Alineaciones: {hechos} cargada(s).")


if __name__ == "__main__":
    main()
