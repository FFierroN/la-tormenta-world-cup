"""Robot de enriquecimiento: Highlightly  ->  Supabase (eventos + stats).

worldcup26.ir nos da el marcador y los goles EN VIVO, pero NO trae
asistencias ni tarjetas ni estadisticas. Highlightly si (plan free, 100
req/dia). Este robot corre DESPUES de que un partido termina y rellena:
  - partido_eventos: goles (con asistidor), amarillas y rojas.
  - partidos.estadisticas (JSONB): posesion, xG, tiros, corners, etc.
Todo con UNA sola llamada GET /matches/{id} (trae events + statistics).

Decision de diseno (confirmada con Felipe):
  - Highlightly es la FUENTE DE VERDAD de los eventos en partidos FINALIZADOS.
    Reemplaza (borra+reinserta) los eventos de ese partido.
  - El campo 'detalle' (penal/autogol) que Highlightly NO provee se PRESERVA
    por (equipo, minuto): si lo marcaste a mano, no se pierde por gusto.
  - worldcup26.ir (actualizar.py) sigue intacto para el marcador en vivo.

Presupuesto de requests: 1 GET /matches/{id} por partido finalizado, UNA vez.
Si no conocemos el id todavia, +1 GET /matches?date=... (cacheado por fecha).
En el dia mas cargado del Mundial gastamos ~10-15 de los 100 diarios.

MODO:
  'auto'  (default) -> enriquece los finalizados que aun no enriquecimos,
                       dando ~20 min de gracia tras el pitazo (HL termina de
                       cargar stats/eventos). Si no hay candidatos, 0 requests.
  'todos'           -> re-enriquece TODOS los partidos finalizados. Util para
                       rehacer un dia. Si choca el limite diario, corta y sigue
                       en la proxima corrida (los ya hechos quedan marcados).

Variables de entorno:
  SUPABASE_URL, SUPABASE_SERVICE_KEY  -> (ver comun.py)
  HIGHLIGHTLY_KEY                     -> tu api key (header x-rapidapi-key)
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone

import requests

from comun import (
    como_int,
    nuestro_nombre,
    sb_delete,
    sb_get,
    sb_insert,
    sb_patch,
)

HL_BASE = "https://soccer.highlightly.net"
HL_KEY = os.environ["HIGHLIGHTLY_KEY"]
LEAGUE_ID = 1635
SEASON = 2026

MODO = os.getenv("MODO", "auto").strip().lower()
# Minutos de gracia tras el pitazo antes de enriquecer (HL tarda en cerrar).
MIN_GRACIA = int(os.getenv("MIN_GRACIA", "20"))

# type de Highlightly -> nuestro tipo de evento. 'Substitution' = cambio:
# guardamos jugador=quien entra (player), asistencia=quien sale (substituted).
TIPO_HL = {
    "Goal": "gol",
    "Yellow Card": "amarilla",
    "Red Card": "roja",
    "Substitution": "cambio",
}


class LimiteDiario(Exception):
    """Highlightly devolvio 429: se acabaron los requests del dia."""


# ------------------------------------------------------------------ Highlightly
def hl_get(path: str, params: dict | None = None) -> dict:
    r = requests.get(
        f"{HL_BASE}{path}",
        headers={"x-rapidapi-key": HL_KEY},
        params=params or {},
        timeout=25,
    )
    if r.status_code == 429:
        raise LimiteDiario()
    if not r.ok:
        print(f"  [Highlightly {r.status_code}] GET {path} -> {r.text[:200]}",
              file=sys.stderr)
    r.raise_for_status()
    return r.json()


def hl_listar_por_fecha(fecha_iso: str) -> list[dict]:
    """Lista los partidos del Mundial en una fecha YYYY-MM-DD."""
    data = hl_get("/matches", {
        "leagueId": LEAGUE_ID, "season": SEASON, "date": fecha_iso,
    })
    return data.get("data", []) if isinstance(data, dict) else (data or [])


def _desempacar(d):
    """Devuelve el objeto-partido sin importar como lo envuelva Highlightly.
    Soporta: dict directo, {"data": {...}}, {"data": [...]}, o [...].
    """
    if isinstance(d, list):
        return d[0] if d else None
    if isinstance(d, dict):
        # wrapper tipo {"data": ...} sin events/statistics en la raiz
        if "data" in d and "events" not in d and "statistics" not in d:
            return _desempacar(d["data"])
        return d
    return None


def hl_detalle(match_id: int) -> dict | None:
    """Trae el objeto completo de un partido (events, statistics, ...)."""
    d = hl_get(f"/matches/{match_id}")
    obj = _desempacar(d)
    if not isinstance(obj, dict):
        forma = (list(d.keys()) if isinstance(d, dict)
                 else f"list(len={len(d)})" if isinstance(d, list)
                 else type(d).__name__)
        print(f"  [debug] forma inesperada de /matches/{match_id}: {forma}")
        return None
    return obj


# ----------------------------------------------------------------- candidatos
def fecha_utc(partido: dict) -> str:
    """Fecha (YYYY-MM-DD, en UTC) del partido nuestro, para consultar a HL."""
    iso = str(partido.get("fecha") or "").replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(iso)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).date().isoformat()
    except ValueError:
        return str(iso)[:10]


def candidatos() -> list[dict]:
    """Partidos finalizados que toca enriquecer."""
    if MODO == "todos":
        return sb_get("partidos", {"estado": "eq.final", "select": "*",
                                    "order": "fecha"})
    # auto: finalizados, aun no enriquecidos, con la gracia ya cumplida.
    finales = sb_get("partidos", {
        "estado": "eq.final",
        "enriquecido_at": "is.null",
        "select": "*", "order": "fecha",
    })
    corte = datetime.now(timezone.utc) - timedelta(minutes=MIN_GRACIA)
    listos = []
    for p in finales:
        fin = p.get("finalizado_at")
        if not fin:
            listos.append(p)  # final viejo sin marca de tiempo: dale
            continue
        try:
            t = datetime.fromisoformat(str(fin).replace("Z", "+00:00"))
            if t.tzinfo is None:
                t = t.replace(tzinfo=timezone.utc)
            if t <= corte:
                listos.append(p)
        except ValueError:
            listos.append(p)
    return listos


# ------------------------------------------------------------------- matching
def buscar_match_id(p: dict, cache_fecha: dict) -> int | None:
    """Devuelve el id de Highlightly para nuestro partido (y lo cachea en DB)."""
    if p.get("highlightly_id"):
        return como_int(p["highlightly_id"])

    f = fecha_utc(p)
    if f not in cache_fecha:
        cache_fecha[f] = hl_listar_por_fecha(f)
    candidatos_hl = cache_fecha[f]

    for m in candidatos_hl:
        home = nuestro_nombre((m.get("homeTeam") or {}).get("name"))
        away = nuestro_nombre((m.get("awayTeam") or {}).get("name"))
        if home == p["equipo_local"] and away == p["equipo_visita"]:
            mid = como_int(m.get("id"))
            if mid is not None:
                sb_patch("partidos", {"id": f"eq.{p['id']}"},
                         {"highlightly_id": mid})
            return mid

    sin = [(m.get("homeTeam") or {}).get("name") + " vs "
           + (m.get("awayTeam") or {}).get("name") for m in candidatos_hl]
    print(f"  SIN MATCH en HL ({f}) para {p['equipo_local']} vs "
          f"{p['equipo_visita']}. HL trae: {sin or 'nada'}")
    return None


# ----------------------------------------------------------------- enriquecer
def eventos_desde_hl(detalle: dict, p: dict) -> list[dict]:
    """Convierte los events[] de Highlightly a filas de partido_eventos."""
    home_id = como_int((detalle.get("homeTeam") or {}).get("id"))

    def lado(ev: dict) -> str:
        """local | visita. Primero por nombre (robusto), luego por id."""
        nombre = nuestro_nombre((ev.get("team") or {}).get("name"))
        if nombre and nombre == p["equipo_local"]:
            return "local"
        if nombre and nombre == p["equipo_visita"]:
            return "visita"
        tid = como_int((ev.get("team") or {}).get("id"))
        return "local" if (home_id is not None and tid == home_id) else "visita"

    # Preservar 'detalle' (penal/autogol) manual por (equipo, minuto): HL no lo trae.
    previos = sb_get("partido_eventos", {
        "partido_id": f"eq.{p['id']}",
        "tipo": "eq.gol",
        "select": "equipo,minuto,detalle",
    })
    detalle_manual = {
        (e["equipo"], e["minuto"]): (e.get("detalle") or "normal")
        for e in previos
    }

    filas = []
    for ev in detalle.get("events", []):
        tipo = TIPO_HL.get(ev.get("type"))
        if not tipo:
            continue  # otros tipos no soportados
        minuto = como_int(str(ev.get("time", "")).split("+")[0]) or 0
        equipo = lado(ev)
        jugador = (ev.get("player") or "").strip() or None
        if tipo == "gol":
            asistencia = (ev.get("assist") or "").strip() or None
            det = detalle_manual.get((equipo, minuto), "normal")
        elif tipo == "cambio":
            # En sustituciones: player=entra (ya en 'jugador'),
            # substituted=quien sale (lo guardamos en 'asistencia').
            asistencia = (ev.get("substituted") or "").strip() or None
            det = None
        else:
            asistencia = None
            det = None
        filas.append({
            "partido_id": p["id"],
            "tipo": tipo,
            "equipo": equipo,
            "minuto": minuto,
            "jugador": jugador,
            "asistencia": asistencia,
            "detalle": det,
        })
    return filas


def stats_desde_hl(detalle: dict, p: dict) -> dict | None:
    """Convierte statistics[] de Highlightly a {local:{...}, visita:{...}}.

    Cada bloque trae team{id,name} + statistics[{value, displayName}].
    Guardamos TODAS las stats crudas (displayName -> value); el front elige
    cuales mostrar y como. Tambien adjuntamos topPlayers crudo para una fase
    futura, sin romper nada si no viene.
    """
    bloques = detalle.get("statistics") or []
    if not bloques:
        return None

    home_id = como_int((detalle.get("homeTeam") or {}).get("id"))

    def lado(team: dict) -> str:
        nombre = nuestro_nombre((team or {}).get("name"))
        if nombre and nombre == p["equipo_local"]:
            return "local"
        if nombre and nombre == p["equipo_visita"]:
            return "visita"
        tid = como_int((team or {}).get("id"))
        return "local" if (home_id is not None and tid == home_id) else "visita"

    salida: dict = {}
    for bloque in bloques:
        equipo = lado(bloque.get("team") or {})
        valores = {}
        for s in bloque.get("statistics") or []:
            nombre = s.get("displayName")
            if nombre is not None:
                valores[nombre] = s.get("value")
        salida[equipo] = valores

    if not salida:
        return None

    top = detalle.get("topPlayers")
    if top:
        salida["top_players"] = top
    return salida


def enriquecer_partido(p: dict, cache_fecha: dict) -> bool:
    """Enriquece un partido. Devuelve True si lo proceso (para marcar la fecha)."""
    mid = buscar_match_id(p, cache_fecha)
    if mid is None:
        return False

    detalle = hl_detalle(mid)
    if not detalle:
        print(f"  HL sin detalle para match {mid} "
              f"({p['equipo_local']} vs {p['equipo_visita']})")
        return False

    hizo_algo = False

    # --- Eventos (asistencias + tarjetas) ---
    filas = eventos_desde_hl(detalle, p)
    if filas:
        # Highlightly manda: borra+reinserta TODOS los eventos del partido.
        sb_delete("partido_eventos", {"partido_id": f"eq.{p['id']}"})
        sb_insert("partido_eventos", filas)
        hizo_algo = True
        goles = sum(1 for f in filas if f["tipo"] == "gol")
        amar = sum(1 for f in filas if f["tipo"] == "amarilla")
        rojas = sum(1 for f in filas if f["tipo"] == "roja")
        cambios = sum(1 for f in filas if f["tipo"] == "cambio")
        asist = sum(1 for f in filas if f["tipo"] == "gol" and f["asistencia"])
        print(f"  OK eventos {p['equipo_local']} vs {p['equipo_visita']}: "
              f"{goles} gol(es) ({asist} con asist.), {amar} amarilla(s), "
              f"{rojas} roja(s), {cambios} cambio(s)")
    else:
        print(f"  HL sin eventos para {p['equipo_local']} vs "
              f"{p['equipo_visita']} (no se tocan eventos)")

    # --- Estadisticas (panel del detalle) ---
    stats = stats_desde_hl(detalle, p)
    if stats:
        sb_patch("partidos", {"id": f"eq.{p['id']}"}, {"estadisticas": stats})
        hizo_algo = True
        n = len(stats.get("local", {}))
        print(f"  OK stats {p['equipo_local']} vs {p['equipo_visita']}: "
              f"{n} metricas por equipo")
    else:
        print(f"  HL sin stats para {p['equipo_local']} vs {p['equipo_visita']}")

    return hizo_algo


# ------------------------------------------------------------------------ main
def main() -> None:
    lista = candidatos()
    if not lista:
        print("No hay partidos finalizados pendientes de enriquecer. "
              "Sin requests a Highlightly.")
        return

    etiqueta = "todos" if MODO == "todos" else "auto"
    print(f"MODO={etiqueta} -> {len(lista)} partido(s) a enriquecer.")

    cache_fecha: dict = {}
    hechos = 0
    for p in lista:
        try:
            if enriquecer_partido(p, cache_fecha):
                sb_patch("partidos", {"id": f"eq.{p['id']}"},
                         {"enriquecido_at": datetime.now(timezone.utc).isoformat()})
                hechos += 1
        except LimiteDiario:
            print("  Limite diario de Highlightly alcanzado (100/dia). "
                  f"Corto aca; sigo en la proxima corrida. Hechos: {hechos}")
            break
        except Exception as exc:  # noqa: BLE001
            print(f"  fallo {p['equipo_local']} vs {p['equipo_visita']}: {exc}")

    print(f"Listo. Enriquecidos: {hechos}.")


if __name__ == "__main__":
    main()
