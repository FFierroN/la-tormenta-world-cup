"""Robot de sincronizacion: football-data.org  ->  Supabase.

Cambio del 2026-06-11: API-Football quito acceso al Mundial 2026 del plan
free. Migramos a football-data.org (free, incluye Copa Mundial, 10 req/min).

Que hace, en orden:
  1. Pregunta GRATIS a Supabase si hay partidos en vivo o por empezar.
     Si no hay, sale sin tocar la API (cero requests).
  2. Pide los partidos del Mundial 2026 de HOY (1 request).
  3. Empareja cada partido de la API con el nuestro (por api_fixture_id ya
     aprendido o por nombres+fecha la primera vez) y actualiza marcador,
     minuto, estado y penales en Supabase.
  4. Para los partidos EN VIVO o RECIEN finalizados, baja los eventos
     (goles/amarillas/rojas con minuto, goleador y asistencia). 1 req c/u.

NUNCA corre en el navegador de los amigos. Corre en GitHub Actions con el
token de football-data.org y la service-role key guardadas como SECRETOS.

Variables de entorno requeridas:
  FOOTBALL_DATA_TOKEN    -> tu token de football-data.org (free)
  SUPABASE_URL           -> https://TUPROYECTO.supabase.co
  SUPABASE_SERVICE_KEY   -> service_role key (NO la anon; bypassea RLS)

Opcional:
  COMPETICION (default WC = World Cup)
"""
from __future__ import annotations

import os
import sys
import time
from datetime import date, datetime, timedelta, timezone

import requests

API_BASE = "https://api.football-data.org/v4"
COMPETICION = os.getenv("COMPETICION", "WC")  # WC = Copa Mundial

FOOTBALL_DATA_TOKEN = os.environ["FOOTBALL_DATA_TOKEN"]
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# Pequena pausa entre llamadas para no chocar contra el limite (10 req/min)
PAUSA_ENTRE_REQ = float(os.getenv("PAUSA_REQ", "1.5"))

# Estado de football-data.org (status)  ->  nuestro estado
ESTADO_MAP = {
    "SCHEDULED": "programado", "TIMED": "programado",
    "IN_PLAY": "en_vivo", "PAUSED": "entretiempo",
    "EXTRA_TIME": "alargue", "PENALTY_SHOOTOUT": "penales",
    "FINISHED": "final", "AWARDED": "final",
    "SUSPENDED": "suspendido", "POSTPONED": "suspendido",
    "CANCELLED": "suspendido",
}
ESTADOS_VIVOS = {"IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"}
ESTADOS_FINAL = {"FINISHED", "AWARDED"}

# Traduccion nombre API (ingles) -> nombre nuestro (espanol). Ajusta si
# football-data.org devuelve un nombre que no esta aca (queda en el log
# como "SIN MAPEAR").
EQUIPOS = {
    "Mexico": "México", "South Africa": "Sudáfrica",
    "South Korea": "República de Corea", "Korea Republic": "República de Corea",
    "Czech Republic": "Chequia", "Czechia": "Chequia",
    "Canada": "Canadá", "Bosnia and Herzegovina": "Bosnia y Herzegovina",
    "Bosnia-Herzegovina": "Bosnia y Herzegovina",
    "USA": "Estados Unidos", "United States": "Estados Unidos",
    "Paraguay": "Paraguay", "Qatar": "Catar", "Switzerland": "Suiza",
    "Brazil": "Brasil", "Morocco": "Marruecos", "Haiti": "Haití",
    "Scotland": "Escocia", "Australia": "Australia",
    "Turkey": "Turquía", "Türkiye": "Turquía",
    "Germany": "Alemania", "Curacao": "Curazao", "Curaçao": "Curazao",
    "Netherlands": "Países Bajos", "Japan": "Japón",
    "Ivory Coast": "Costa de Marfil", "Cote d'Ivoire": "Costa de Marfil",
    "Ecuador": "Ecuador", "Sweden": "Suecia", "Tunisia": "Túnez",
    "Spain": "España", "Cape Verde": "Cabo Verde", "Cabo Verde": "Cabo Verde",
    "Belgium": "Bélgica", "Egypt": "Egipto",
    "Saudi Arabia": "Arabia Saudí", "Uruguay": "Uruguay",
    "Iran": "RI de Irán", "IR Iran": "RI de Irán",
    "New Zealand": "Nueva Zelanda", "France": "Francia", "Senegal": "Senegal",
    "Iraq": "Irak", "Norway": "Noruega", "Argentina": "Argentina",
    "Algeria": "Argelia", "Austria": "Austria", "Jordan": "Jordania",
    "Portugal": "Portugal", "DR Congo": "RD Congo",
    "Congo DR": "RD Congo", "Democratic Republic of Congo": "RD Congo",
    "England": "Inglaterra", "Croatia": "Croacia", "Ghana": "Ghana",
    "Panama": "Panamá", "Uzbekistan": "Uzbekistán", "Colombia": "Colombia",
}


# ---------------------------------------------------------------- football-data
_reqs = 0


def api_get(path: str, params: dict | None = None) -> dict:
    """GET a football-data.org con throttle conservador."""
    global _reqs
    if _reqs > 0:
        time.sleep(PAUSA_ENTRE_REQ)
    _reqs += 1
    r = requests.get(
        f"{API_BASE}/{path}",
        headers={"X-Auth-Token": FOOTBALL_DATA_TOKEN},
        params=params or {},
        timeout=20,
    )
    if r.status_code == 429:
        # Rate limit: esperar 1 minuto completo y reintentar 1 vez
        print("  [API 429] Rate limit. Esperando 60s.", file=sys.stderr)
        time.sleep(60)
        r = requests.get(
            f"{API_BASE}/{path}",
            headers={"X-Auth-Token": FOOTBALL_DATA_TOKEN},
            params=params or {},
            timeout=20,
        )
    r.raise_for_status()
    return r.json()


# ------------------------------------------------------------------- Supabase
def sb_headers(extra: dict | None = None) -> dict:
    h = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    if extra:
        h.update(extra)
    return h


def sb_get(tabla: str, params: dict) -> list:
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/{tabla}",
        headers=sb_headers(),
        params=params,
        timeout=20,
    )
    if not r.ok:
        print(f"  [Supabase {r.status_code}] GET {tabla} -> {r.text}",
              file=sys.stderr)
    r.raise_for_status()
    return r.json()


def sb_patch(tabla: str, filtro: dict, body: dict) -> None:
    r = requests.patch(
        f"{SUPABASE_URL}/rest/v1/{tabla}",
        headers=sb_headers({"Prefer": "return=minimal"}),
        params=filtro,
        json=body,
        timeout=20,
    )
    r.raise_for_status()


def sb_delete(tabla: str, filtro: dict) -> None:
    r = requests.delete(
        f"{SUPABASE_URL}/rest/v1/{tabla}",
        headers=sb_headers({"Prefer": "return=minimal"}),
        params=filtro,
        timeout=20,
    )
    r.raise_for_status()


def sb_insert(tabla: str, filas: list[dict]) -> None:
    if not filas:
        return
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/{tabla}",
        headers=sb_headers({"Prefer": "return=minimal"}),
        json=filas,
        timeout=20,
    )
    r.raise_for_status()


# ------------------------------------------------------ auto-gatillo (ventana)
def hay_trabajo() -> bool:
    """Si no hay partidos en vivo ni por empezar, salimos sin tocar la API."""
    vivos = sb_get("partidos", {
        "estado": "in.(en_vivo,entretiempo,alargue,penales)",
        "select": "id", "limit": "1",
    })
    if vivos:
        return True
    ahora = datetime.now(timezone.utc)
    lo = (ahora - timedelta(hours=3)).isoformat()
    hi = (ahora + timedelta(minutes=20)).isoformat()
    proximos = sb_get("partidos", {
        "estado": "eq.programado",
        "and": f"(fecha.gte.{lo},fecha.lte.{hi})",
        "select": "id", "limit": "1",
    })
    return bool(proximos)


# ----------------------------------------------------------------- matching
def nuestro_nombre(api_nombre: str) -> str | None:
    return EQUIPOS.get(api_nombre)


def buscar_partido(m: dict) -> dict | None:
    """Devuelve nuestro registro de partido para un match de la API."""
    api_id = m["id"]
    filas = sb_get("partidos", {"api_fixture_id": f"eq.{api_id}", "select": "*"})
    if filas:
        return filas[0]

    home = (m.get("homeTeam") or {}).get("name") or ""
    away = (m.get("awayTeam") or {}).get("name") or ""
    local = nuestro_nombre(home)
    visita = nuestro_nombre(away)
    if not local or not visita:
        faltan = []
        if not local:  faltan.append(f"'{home}'")
        if not visita: faltan.append(f"'{away}'")
        print(f"  SIN MAPEAR ({', '.join(faltan)}): {home} vs {away}"
              f" -- agregar a EQUIPOS")
        return None

    fecha_api = (m.get("utcDate") or "")[:10]  # YYYY-MM-DD
    filas = sb_get("partidos", {
        "equipo_local": f"eq.{local}",
        "equipo_visita": f"eq.{visita}",
        "select": "*",
    })
    for p in filas:
        if str(p["fecha"])[:10] == fecha_api:
            sb_patch("partidos", {"id": f"eq.{p['id']}"},
                     {"api_fixture_id": api_id})
            return p
    return None


# ------------------------------------------------------------- actualizaciones
# Prioridad de estado: nunca degradar un partido (proteccion contra retrasos
# del feed y contra pisar ediciones manuales).
PRIORIDAD_ESTADO = {
    "programado": 0, "suspendido": 0,
    "en_vivo": 1, "entretiempo": 1,
    "alargue": 2, "penales": 3,
    "final": 4,
}


def actualizar_partido(p: dict, m: dict) -> str | None:
    status = m.get("status") or "SCHEDULED"
    nuevo_estado = ESTADO_MAP.get(status, "programado")

    # Salvaguarda 1: no degradar el estado. Si la DB ya dice en_vivo/final/etc
    # y la API trae algo "menos avanzado", ignoramos la actualizacion. Esto
    # cubre dos casos: (a) feed con delay, (b) edicion manual del admin.
    prio_db = PRIORIDAD_ESTADO.get(p.get("estado") or "", 0)
    prio_api = PRIORIDAD_ESTADO.get(nuevo_estado, 0)
    if prio_api < prio_db:
        print(f"  saltado (API={status} retrocederia '{p.get('estado')}'): "
              f"{p['equipo_local']} vs {p['equipo_visita']}")
        return None

    score = m.get("score") or {}
    ft = score.get("fullTime") or {}
    pen = score.get("penalties") or {}

    body: dict = {"estado": nuevo_estado}

    # Salvaguarda 2: no escribir null encima de un valor real. Si la API trae
    # None (porque todavia no carga el dato o se reseteo el feed), respetamos
    # lo que ya esta en DB (sea del robot anterior o del admin).
    if ft.get("home") is not None:
        body["goles_local"] = ft.get("home")
    if ft.get("away") is not None:
        body["goles_visita"] = ft.get("away")
    if m.get("minute") is not None:
        body["minuto"] = m.get("minute")

    if pen.get("home") is not None or pen.get("away") is not None:
        body["penales_local"] = pen.get("home")
        body["penales_visita"] = pen.get("away")
        if pen.get("home") is not None and pen.get("away") is not None:
            body["ganador_penales"] = (
                "local" if pen["home"] > pen["away"] else "visita"
            )
    if status in ESTADOS_FINAL:
        body["minuto"] = None
        body["finalizado_at"] = datetime.now(timezone.utc).isoformat()

    sb_patch("partidos", {"id": f"eq.{p['id']}"}, body)
    return status


def sincronizar_eventos(p: dict, m: dict) -> None:
    """Reemplaza los eventos del partido (idempotente: borrar + insertar)."""
    # Detalle del partido = goles + amonestaciones
    data = api_get(f"matches/{m['id']}")
    home_name = (m.get("homeTeam") or {}).get("name") or ""
    eventos = []

    for g in data.get("goals") or []:
        tequipo = (g.get("team") or {}).get("name") or ""
        equipo = "local" if tequipo == home_name else "visita"
        minuto = (g.get("minute") or 0) + (g.get("injuryTime") or 0)
        eventos.append({
            "partido_id": p["id"],
            "tipo": "gol",
            "equipo": equipo,
            "minuto": minuto,
            "jugador": (g.get("scorer") or {}).get("name"),
            "asistencia": (g.get("assist") or {}).get("name"),
            "detalle": detalle_gol(g.get("type")),
        })

    for b in data.get("bookings") or []:
        carta = (b.get("card") or "").upper()
        if carta not in ("YELLOW", "YELLOW_RED", "RED"):
            continue
        tipo = "amarilla" if carta == "YELLOW" else "roja"
        tequipo = (b.get("team") or {}).get("name") or ""
        equipo = "local" if tequipo == home_name else "visita"
        minuto = (b.get("minute") or 0) + (b.get("injuryTime") or 0)
        eventos.append({
            "partido_id": p["id"],
            "tipo": tipo,
            "equipo": equipo,
            "minuto": minuto,
            "jugador": (b.get("player") or {}).get("name"),
            "asistencia": None,
            "detalle": None,
        })

    sb_delete("partido_eventos", {"partido_id": f"eq.{p['id']}"})
    sb_insert("partido_eventos", eventos)


def detalle_gol(tipo: str | None) -> str:
    t = (tipo or "").upper()
    if "PENALTY" in t:
        return "penal"
    if "OWN" in t:
        return "autogol"
    return "normal"


def necesita_eventos(p: dict, status: str) -> bool:
    """En vivo: siempre. Final: solo si aun no guardamos sus eventos."""
    if status in ESTADOS_VIVOS:
        return True
    if status in ESTADOS_FINAL:
        ya = sb_get("partido_eventos",
                    {"partido_id": f"eq.{p['id']}", "select": "id", "limit": "1"})
        return len(ya) == 0
    return False


# ------------------------------------------------------------------------ main
def main() -> None:
    if not hay_trabajo():
        print("No hay partidos en vivo ni por empezar. Sin requests a la API.")
        return

    hoy = date.today().isoformat()
    manana = (date.today() + timedelta(days=1)).isoformat()
    data = api_get(f"competitions/{COMPETICION}/matches",
                   {"dateFrom": hoy, "dateTo": manana})
    matches = data.get("matches") or []
    print(f"Matches recibidos: {len(matches)} (competicion={COMPETICION})")

    for m in matches:
        p = buscar_partido(m)
        if not p:
            continue
        try:
            status = actualizar_partido(p, m)
            if status is None:
                continue  # saltado por salvaguarda; no tocar eventos tampoco
            if necesita_eventos(p, status):
                try:
                    sincronizar_eventos(p, m)
                except Exception as exc:
                    print(f"  eventos fallaron para partido {p['id']}: {exc}")
            print(f"  OK {p['equipo_local']} vs {p['equipo_visita']} -> {status}")
        except Exception as exc:
            print(f"  fallo {p['equipo_local']} vs {p['equipo_visita']}: {exc}")

    print(f"Listo. Requests hechos: {_reqs}")


if __name__ == "__main__":
    main()
