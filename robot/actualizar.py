"""Robot de sincronizacion: worldcup26.ir  ->  Supabase.

Cambio del 2026-06-11 (segundo en el dia): football-data.org tiene delay
de 30+ min para flipear partidos a IN_PLAY. worldcup26.ir es real-time
(o casi). Trade-off aceptado: perdemos asistencias/tarjetas/penales en
la API, que cargamos a mano desde Admin.

Que hace, en orden:
  1. Pregunta GRATIS a Supabase si hay partidos en vivo o por empezar.
     Si no hay, sale sin tocar la API (0 requests).
  2. Pide TODOS los partidos del Mundial 2026 (1 sola request, sin auth).
  3. Filtra los partidos de hoy +/- 1 dia.
  4. Para cada uno: empareja con nuestro partido (por api_fixture_id ya
     aprendido, o por nombres+fecha la primera vez) y actualiza marcador,
     estado y penales en Supabase.
  5. Para los partidos EN VIVO o RECIEN finalizados: parsea los strings
     home_scorers/away_scorers y agrega los goles a partido_eventos
     (sin pisar los que ya existen ni los datos manuales del admin).

NUNCA corre en el navegador de los amigos. Corre en GitHub Actions con
la service-role key guardada como SECRETO.

Variables de entorno requeridas:
  SUPABASE_URL           -> https://TUPROYECTO.supabase.co
  SUPABASE_SERVICE_KEY   -> service_role key (NO la anon; bypassea RLS)
"""
from __future__ import annotations

import os
import re
import sys
from datetime import date, datetime, timedelta, timezone

import requests

API_URL = "https://worldcup26.ir/get/games"

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

# Estado nuestro derivado de los campos finished + time_elapsed de la API.
#   finished=TRUE                 -> final
#   finished=FALSE + live         -> en_vivo
#   finished=FALSE + (sin live)   -> programado
ESTADOS_VIVOS = {"en_vivo", "entretiempo", "alargue", "penales"}
ESTADOS_FINAL = {"final"}

# Prioridad de estado: nunca degradamos un partido. Si DB ya dice en_vivo y la
# API trae programado, ignoramos (cubre delays del feed y ediciones manuales).
PRIORIDAD_ESTADO = {
    "programado": 0, "suspendido": 0,
    "en_vivo": 1, "entretiempo": 1,
    "alargue": 2, "penales": 3,
    "final": 4,
}

# Mapeo nombre EN (worldcup26.ir) -> nombre nuestro (ES).
# Si la API devuelve un nombre que no esta aca, queda en el log como "SIN MAPEAR".
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


# --------------------------------------------------------------------- Helpers
def como_int(x) -> int | None:
    """Castea strings a int de forma defensiva. La API devuelve TODO como str."""
    if x is None or x == "" or x == "null":
        return None
    try:
        return int(str(x).strip())
    except (TypeError, ValueError):
        return None


def como_bool(x) -> bool:
    """'TRUE'/'true'/True -> True. Resto False."""
    if isinstance(x, bool):
        return x
    return str(x).strip().upper() == "TRUE"


def derivar_estado(m: dict) -> str:
    """De finished + time_elapsed sacamos nuestro estado interno."""
    if como_bool(m.get("finished")):
        return "final"
    if (m.get("time_elapsed") or "").strip().lower() == "live":
        return "en_vivo"
    return "programado"


# Patrón goleador: "J. Quiñones 9'" o "R. Jiménez 67'+2" o "J. Doe 90+3'"
RE_GOLEADOR = re.compile(r"^\s*(?P<jugador>.+?)\s+(?P<minuto>\d+)(?:\s*\+\s*\d+)?\s*'?\s*$")


def parsear_scorers(crudo) -> list[tuple[str, int]]:
    """Convierte el string raro de la API en lista de (jugador, minuto).

    Formato visto: '{"J. Quiñones 9\\'","R. Jiménez 67\\'"}'  (con comillas
    tipograficas " y "). Tambien la API devuelve a veces el string "null".
    """
    if crudo is None:
        return []
    s = str(crudo).strip()
    if not s or s.lower() == "null" or s in ("{}", "{ }"):
        return []
    # Quitar llaves externas si vienen
    s = s.strip("{} ")
    # Normalizar comillas raras a comilla doble estandar
    s = s.replace("\u201c", '"').replace("\u201d", '"')
    s = s.replace("\u2018", "'").replace("\u2019", "'")
    # Separar entradas por '","' o ',"'
    crudos = re.split(r'"\s*,\s*"', s)
    salida: list[tuple[str, int]] = []
    for c in crudos:
        c = c.strip().strip('"').strip()
        if not c:
            continue
        m = RE_GOLEADOR.match(c)
        if not m:
            continue
        jugador = m.group("jugador").strip()
        minuto = int(m.group("minuto"))
        salida.append((jugador, minuto))
    return salida


# ------------------------------------------------------------------- worldcup26
def api_get_juegos() -> list[dict]:
    """Una sola llamada trae los 64 partidos del Mundial. Sin auth."""
    r = requests.get(API_URL, timeout=20)
    r.raise_for_status()
    data = r.json()
    # La API devuelve {"games": [...]} segun el ejemplo de Felipe
    return data.get("games", []) if isinstance(data, dict) else (data or [])


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
    return EQUIPOS.get((api_nombre or "").strip())


def buscar_partido(m: dict) -> dict | None:
    """Devuelve nuestro registro de partido para un game de la API."""
    api_id = como_int(m.get("id"))
    if api_id is not None:
        filas = sb_get("partidos",
                       {"api_fixture_id": f"eq.{api_id}", "select": "*"})
        if filas:
            return filas[0]

    home = m.get("home_team_name_en") or ""
    away = m.get("away_team_name_en") or ""
    local = nuestro_nombre(home)
    visita = nuestro_nombre(away)
    if not local or not visita:
        faltan = []
        if not local:  faltan.append(f"'{home}'")
        if not visita: faltan.append(f"'{away}'")
        print(f"  SIN MAPEAR ({', '.join(faltan)}): {home} vs {away}"
              f" -- agregar a EQUIPOS")
        return None

    # local_date viene como "MM/DD/YYYY HH:MM" (formato US, Mundial en USA/MEX/CAN)
    fecha_api = None
    try:
        fecha_api = datetime.strptime(
            (m.get("local_date") or "").strip(), "%m/%d/%Y %H:%M"
        ).date().isoformat()
    except (ValueError, TypeError):
        pass

    filas = sb_get("partidos", {
        "equipo_local": f"eq.{local}",
        "equipo_visita": f"eq.{visita}",
        "select": "*",
    })
    for p in filas:
        if fecha_api and str(p["fecha"])[:10] == fecha_api:
            if api_id is not None:
                sb_patch("partidos", {"id": f"eq.{p['id']}"},
                         {"api_fixture_id": api_id})
            return p
    # Sin fecha confiable: si hay un solo partido entre estos equipos, ese es
    if len(filas) == 1:
        if api_id is not None:
            sb_patch("partidos", {"id": f"eq.{filas[0]['id']}"},
                     {"api_fixture_id": api_id})
        return filas[0]
    return None


# ------------------------------------------------------------- actualizaciones
def actualizar_partido(p: dict, m: dict) -> str | None:
    """Devuelve el estado nuevo, o None si se salto la actualizacion."""
    nuevo_estado = derivar_estado(m)

    # Salvaguarda 1: no degradar el estado.
    prio_db = PRIORIDAD_ESTADO.get(p.get("estado") or "", 0)
    prio_api = PRIORIDAD_ESTADO.get(nuevo_estado, 0)
    if prio_api < prio_db:
        print(f"  saltado (API={nuevo_estado} retrocederia '{p.get('estado')}'): "
              f"{p['equipo_local']} vs {p['equipo_visita']}")
        return None

    home = como_int(m.get("home_score"))
    away = como_int(m.get("away_score"))

    body: dict = {"estado": nuevo_estado}
    # Salvaguarda 2: no escribir null encima de un valor real.
    if home is not None:
        body["goles_local"] = home
    if away is not None:
        body["goles_visita"] = away
    if nuevo_estado == "final":
        body["minuto"] = None
        body["finalizado_at"] = datetime.now(timezone.utc).isoformat()
    # worldcup26.ir no da minuto numerico; lo dejamos como esta.

    sb_patch("partidos", {"id": f"eq.{p['id']}"}, body)
    return nuevo_estado


def sincronizar_goles(p: dict, m: dict) -> None:
    """Agrega goles nuevos a partido_eventos sin pisar los existentes.

    No borramos nada: el admin puede haber agregado asistencias, tarjetas u
    otros datos manuales en filas que ya existen. Solo INSERT cuando el
    (jugador, minuto, equipo) no esta presente todavia.
    """
    home_nombre = (m.get("home_team_name_en") or "").strip()
    parsed: list[tuple[str, int, str]] = []
    for jugador, minuto in parsear_scorers(m.get("home_scorers")):
        parsed.append((jugador, minuto, "local"))
    for jugador, minuto in parsear_scorers(m.get("away_scorers")):
        parsed.append((jugador, minuto, "visita"))

    if not parsed:
        return

    existentes = sb_get("partido_eventos", {
        "partido_id": f"eq.{p['id']}",
        "tipo": "eq.gol",
        "select": "jugador,minuto,equipo",
    })
    ya = {(e["jugador"], e["minuto"], e["equipo"]) for e in existentes}

    nuevos = []
    for jugador, minuto, equipo in parsed:
        clave = (jugador, minuto, equipo)
        if clave in ya:
            continue
        ya.add(clave)  # evita duplicar si la API repite
        nuevos.append({
            "partido_id": p["id"],
            "tipo": "gol",
            "equipo": equipo,
            "minuto": minuto,
            "jugador": jugador,
            "asistencia": None,   # worldcup26.ir no la trae; admin la carga despues
            "detalle": "normal",  # tampoco distingue penal/autogol
        })
    if nuevos:
        sb_insert("partido_eventos", nuevos)
        print(f"  +{len(nuevos)} gol(es) nuevos en {p['equipo_local']} vs {p['equipo_visita']}")
    # Nota visible: home_nombre solo se usa si en el futuro queremos validar
    # consistencia de equipo; por ahora lo dejamos.
    _ = home_nombre


def relevante_para_hoy(m: dict) -> bool:
    """Solo procesamos partidos de ayer/hoy/mañana (margen para zonas horarias)."""
    try:
        fecha = datetime.strptime(
            (m.get("local_date") or "").strip(), "%m/%d/%Y %H:%M"
        ).date()
    except (ValueError, TypeError):
        return False
    hoy = date.today()
    return abs((fecha - hoy).days) <= 1


# ------------------------------------------------------------------------ main
def main() -> None:
    if not hay_trabajo():
        print("No hay partidos en vivo ni por empezar. Sin requests a la API.")
        return

    todos = api_get_juegos()
    relevantes = [m for m in todos if relevante_para_hoy(m)]
    print(f"Partidos totales: {len(todos)} | relevantes hoy +/-1d: {len(relevantes)}")

    for m in relevantes:
        p = buscar_partido(m)
        if not p:
            continue
        try:
            estado = actualizar_partido(p, m)
            if estado is None:
                continue
            if estado in ESTADOS_VIVOS or estado in ESTADOS_FINAL:
                try:
                    sincronizar_goles(p, m)
                except Exception as exc:
                    print(f"  goles fallaron para partido {p['id']}: {exc}")
            print(f"  OK {p['equipo_local']} vs {p['equipo_visita']} -> {estado}")
        except Exception as exc:
            print(f"  fallo {p['equipo_local']} vs {p['equipo_visita']}: {exc}")

    print("Listo.")


if __name__ == "__main__":
    main()
