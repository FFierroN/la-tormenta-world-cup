"""Robot de sincronizacion: API-Football  ->  Supabase.

Que hace (en orden, cuidando la cuota de 100 req/dia):
  1. Revisa la guardia de cuota; si ya gastamos demasiado hoy, no hace nada.
  2. Pide los partidos del Mundial 2026 de HOY (1 request).
  3. Empareja cada partido de la API con el nuestro (por api_fixture_id ya
     aprendido, o por nombres+fecha la primera vez) y actualiza marcador,
     minuto, estado y penales en Supabase.
  4. Para los partidos EN VIVO o RECIEN finalizados, baja los eventos
     (goles/amarillas/rojas con minuto, goleador y asistencia) -> 1 req c/u.
  5. Actualiza el contador de cuota del dia.

NUNCA corre en el navegador de los amigos. Corre en un GitHub Action con la
API key y la service-role key guardadas como SECRETOS del repo.

Variables de entorno requeridas:
  APIFOOTBALL_KEY        -> tu key de dashboard.api-football.com
  SUPABASE_URL           -> https://TUPROYECTO.supabase.co
  SUPABASE_SERVICE_KEY   -> service_role key (NO la anon; esta salta el RLS)

Opcionales:
  LEAGUE_ID (default 1)  SEASON (default 2026)
  MAX_CUOTA (default 95) MODO ('hoy' | 'vivo', default 'hoy')
"""
from __future__ import annotations

import os
import sys
from datetime import date, datetime, timezone

import requests

API_BASE = "https://v3.football.api-sports.io"
LEAGUE_ID = int(os.getenv("LEAGUE_ID", "1"))
SEASON = int(os.getenv("SEASON", "2026"))
MAX_CUOTA = int(os.getenv("MAX_CUOTA", "95"))
MODO = os.getenv("MODO", "hoy")  # 'hoy' = todo el dia | 'vivo' = solo en vivo

APIFOOTBALL_KEY = os.environ["APIFOOTBALL_KEY"]
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# Estado de API-Football (status.short)  ->  nuestro estado
ESTADO_MAP = {
    "TBD": "programado", "NS": "programado",
    "1H": "en_vivo", "2H": "en_vivo", "LIVE": "en_vivo",
    "HT": "entretiempo",
    "ET": "alargue", "BT": "alargue",
    "P": "penales",
    "FT": "final", "AET": "final", "PEN": "final",
    "SUSP": "suspendido", "INT": "suspendido", "PST": "suspendido",
    "CANC": "suspendido", "ABD": "suspendido", "AWD": "final", "WO": "final",
}
ESTADOS_VIVOS = {"1H", "2H", "LIVE", "HT", "ET", "BT", "P"}
ESTADOS_FINAL = {"FT", "AET", "PEN", "AWD", "WO"}

# Traduccion nombre API (ingles) -> nombre nuestro (espanol).
# Best-effort para los equipos conocidos del fixture. Si la API usa otro
# nombre, el robot lo logea como "SIN MAPEAR" para que lo agregues aca.
EQUIPOS = {
    "Mexico": "México", "South Africa": "Sudáfrica",
    "South Korea": "República de Corea", "Korea Republic": "República de Corea",
    "Czech Republic": "Chequia", "Czechia": "Chequia",
    "Canada": "Canadá", "Bosnia and Herzegovina": "Bosnia y Herzegovina",
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


# ---------------------------------------------------------------- API-Football
class CuotaAgotada(Exception):
    pass


_requests_hechos = 0


def api_get(path: str, params: dict) -> dict:
    """GET a API-Football contando cada llamada para la guardia de cuota."""
    global _requests_hechos
    _requests_hechos += 1
    r = requests.get(
        f"{API_BASE}/{path}",
        headers={"x-apisports-key": APIFOOTBALL_KEY},
        params=params,
        timeout=20,
    )
    r.raise_for_status()
    data = r.json()
    if data.get("errors"):
        print("  [API errors]", data["errors"], file=sys.stderr)
    return data


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


# ------------------------------------------------------------ guardia de cuota
def leer_cuota_hoy() -> int:
    hoy = date.today().isoformat()
    filas = sb_get("api_cuota", {"fecha": f"eq.{hoy}", "select": "usados"})
    return filas[0]["usados"] if filas else 0


def guardar_cuota(total: int) -> None:
    hoy = date.today().isoformat()
    # upsert manual: intentar patch, si no existe insert
    existentes = sb_get("api_cuota", {"fecha": f"eq.{hoy}", "select": "fecha"})
    if existentes:
        sb_patch("api_cuota", {"fecha": f"eq.{hoy}"}, {"usados": total})
    else:
        sb_insert("api_cuota", [{"fecha": hoy, "usados": total}])


# ----------------------------------------------------------------- matching
def nuestro_nombre(api_nombre: str) -> str | None:
    return EQUIPOS.get(api_nombre)


def buscar_partido(fx: dict) -> dict | None:
    """Devuelve nuestro registro de partido para un fixture de la API."""
    api_id = fx["fixture"]["id"]
    # 1) ya aprendido
    filas = sb_get("partidos", {"api_fixture_id": f"eq.{api_id}", "select": "*"})
    if filas:
        return filas[0]

    # 2) por nombres + fecha (primera vez)
    local = nuestro_nombre(fx["teams"]["home"]["name"])
    visita = nuestro_nombre(fx["teams"]["away"]["name"])
    if not local or not visita:
        print(f"  SIN MAPEAR: '{fx['teams']['home']['name']}' vs "
              f"'{fx['teams']['away']['name']}' (agregar a EQUIPOS)")
        return None

    fecha_api = fx["fixture"]["date"][:10]  # YYYY-MM-DD
    filas = sb_get("partidos", {
        "equipo_local": f"eq.{local}",
        "equipo_visita": f"eq.{visita}",
        "select": "*",
    })
    for p in filas:
        if str(p["fecha"])[:10] == fecha_api:
            # aprender el id para la proxima
            sb_patch("partidos", {"id": f"eq.{p['id']}"},
                     {"api_fixture_id": api_id})
            return p
    return None


# ------------------------------------------------------------- actualizaciones
def actualizar_partido(p: dict, fx: dict) -> str:
    short = fx["fixture"]["status"]["short"]
    estado = ESTADO_MAP.get(short, "programado")
    goles = fx["goals"]
    score = fx.get("score", {})
    pen = (score.get("penalty") or {})

    body: dict = {
        "estado": estado,
        "goles_local": goles.get("home"),
        "goles_visita": goles.get("away"),
        "minuto": fx["fixture"]["status"].get("elapsed"),
    }
    if pen.get("home") is not None or pen.get("away") is not None:
        body["penales_local"] = pen.get("home")
        body["penales_visita"] = pen.get("away")
        if pen.get("home") is not None and pen.get("away") is not None:
            body["ganador_penales"] = (
                "local" if pen["home"] > pen["away"] else "visita"
            )
    if short in ESTADOS_FINAL:
        body["minuto"] = None
        body["finalizado_at"] = datetime.now(timezone.utc).isoformat()

    sb_patch("partidos", {"id": f"eq.{p['id']}"}, body)
    return short


def sincronizar_eventos(p: dict, fx: dict) -> None:
    """Reemplaza los eventos del partido (idempotente: borrar + insertar)."""
    data = api_get("fixtures/events", {"fixture": fx["fixture"]["id"]})
    eventos = []
    home_name = fx["teams"]["home"]["name"]
    for e in data.get("response", []):
        tipo = clasificar_evento(e)
        if tipo is None:
            continue
        equipo = "local" if e["team"]["name"] == home_name else "visita"
        minuto = (e["time"].get("elapsed") or 0) + (e["time"].get("extra") or 0)
        eventos.append({
            "partido_id": p["id"],
            "tipo": tipo,
            "equipo": equipo,
            "minuto": minuto,
            "jugador": (e.get("player") or {}).get("name"),
            "asistencia": (e.get("assist") or {}).get("name") if tipo == "gol" else None,
            "detalle": detalle_gol(e) if tipo == "gol" else None,
        })
    sb_delete("partido_eventos", {"partido_id": f"eq.{p['id']}"})
    sb_insert("partido_eventos", eventos)


def clasificar_evento(e: dict) -> str | None:
    t = (e.get("type") or "").lower()
    d = (e.get("detail") or "").lower()
    if t == "goal":
        return "gol"
    if t == "card":
        if "yellow" in d:
            return "amarilla"
        if "red" in d:
            return "roja"
    return None  # ignoramos cambios, VAR, etc (Fase 1)


def detalle_gol(e: dict) -> str:
    d = (e.get("detail") or "").lower()
    if "penalty" in d:
        return "penal"
    if "own" in d:
        return "autogol"
    return "normal"


def necesita_eventos(p: dict, short: str) -> bool:
    """En vivo: siempre. Final: solo si aun no guardamos sus eventos
    (evita gastar cuota re-bajando partidos ya cerrados)."""
    if short in ESTADOS_VIVOS:
        return True
    if short in ESTADOS_FINAL:
        ya = sb_get("partido_eventos",
                    {"partido_id": f"eq.{p['id']}", "select": "id", "limit": "1"})
        return len(ya) == 0
    return False


# ------------------------------------------------------------------------ main
def main() -> None:
    usados_previos = leer_cuota_hoy()
    if usados_previos >= MAX_CUOTA:
        print(f"Cuota del dia ya alcanzada ({usados_previos}/{MAX_CUOTA}). Salgo.")
        return

    if MODO == "vivo":
        data = api_get("fixtures", {"league": LEAGUE_ID, "season": SEASON, "live": "all"})
    else:
        hoy = date.today().isoformat()
        data = api_get("fixtures",
                       {"league": LEAGUE_ID, "season": SEASON, "date": hoy})

    fixtures = data.get("response", [])
    print(f"Fixtures recibidos: {len(fixtures)} (modo={MODO})")

    for fx in fixtures:
        # freno duro de cuota a mitad de camino
        if usados_previos + _requests_hechos >= MAX_CUOTA:
            print("Llegamos al limite de cuota. Corto aca.")
            break
        p = buscar_partido(fx)
        if not p:
            continue
        short = actualizar_partido(p, fx)
        if necesita_eventos(p, short):
            try:
                sincronizar_eventos(p, fx)
            except Exception as exc:  # un evento fallido no debe tumbar todo
                print(f"  eventos fallaron para partido {p['id']}: {exc}")
        print(f"  OK {p['equipo_local']} vs {p['equipo_visita']} -> {short}")

    total = usados_previos + _requests_hechos
    guardar_cuota(total)
    print(f"Listo. Requests hoy: {total}/{MAX_CUOTA}")


if __name__ == "__main__":
    main()
