"""Utilidades compartidas por los robots (DRY).

Las usan tanto actualizar.py (worldcup26.ir, marcador en vivo) como
enriquecer.py (Highlightly, eventos + stats post-partido):
  - acceso a Supabase (REST con service-role key),
  - casteos defensivos,
  - mapa de nombres de equipo EN -> ES.

Variables de entorno requeridas (las mismas para ambos robots):
  SUPABASE_URL           -> https://TUPROYECTO.supabase.co
  SUPABASE_SERVICE_KEY   -> service_role key (NO la anon; bypassea RLS)
"""
from __future__ import annotations

import os
import re
import sys
import unicodedata

import requests

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]


# --------------------------------------------------------------------- casteos
def como_int(x) -> int | None:
    """Castea a int de forma defensiva. Las APIs devuelven casi todo como str."""
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


def sb_delete(tabla: str, filtro: dict) -> None:
    r = requests.delete(
        f"{SUPABASE_URL}/rest/v1/{tabla}",
        headers=sb_headers({"Prefer": "return=minimal"}),
        params=filtro,
        timeout=20,
    )
    r.raise_for_status()


# ------------------------------------------------- nombres de equipo EN -> ES
# Si una API devuelve un nombre que no esta aca, el robot lo loguea como
# "SIN MAPEAR" para que lo agreguemos. worldcup26.ir y Highlightly usan ambos
# el nombre en ingles, asi que este mapa sirve para los dos.
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


def _normalizar(s: str) -> str:
    # Tolera variantes del feed: minusculas, sin acentos, sin "the", sin
    # puntos/guiones, espacios colapsados. Asi "Democratic Republic of the
    # Congo", "D.R. Congo" y "DR Congo" caen en la misma clave.
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")  # sin acentos
    s = s.lower()
    s = re.sub(r"\bthe\b", " ", s)
    s = re.sub(r"[.']", "", s)   # puntos/apostrofes fuera: "D.R." -> "DR"
    s = re.sub(r"-", " ", s)     # guiones a espacio: "Bosnia-Herzegovina"
    return re.sub(r"\s+", " ", s).strip()


# Indice normalizado construido UNA vez desde EQUIPOS (con variantes "&"->"and").
_INDICE_NORM = {}
for _en, _es in EQUIPOS.items():
    _INDICE_NORM[_normalizar(_en)] = _es
    _INDICE_NORM[_normalizar(_en.replace(" & ", " and "))] = _es


def nuestro_nombre(api_nombre: str) -> str | None:
    # Lookup: exacto -> "&"->"and" -> normalizado (tolerante a variantes del
    # feed, p.ej. "Democratic Republic of the Congo" con "the").
    s = (api_nombre or "").strip()
    return (
        EQUIPOS.get(s)
        or EQUIPOS.get(s.replace(" & ", " and "))
        or _INDICE_NORM.get(_normalizar(s))
    )
