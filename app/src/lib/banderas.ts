// Mapa nombre-de-equipo (espanol) -> codigo ISO-2 para banderas.
//
// Las predicciones especiales guardan el NOMBRE del equipo (ej. "Brasil"),
// pero el componente Flag necesita el codigo ISO ("br"). El dato ISO ya vive
// en cada partido (pais_local / pais_visita), asi que derivamos el mapa de la
// lista de partidos una sola vez. DRY: sirve para cualquier pantalla que tenga
// el nombre y necesite la bandera.
import type { Partido } from "./types";

export type MapaEquipoPais = Record<string, string>;

// Construye { "Brasil": "br", "Argentina": "ar", ... } a partir de los partidos.
// Ignora "Por definir" (no tiene bandera real).
export function mapaEquipoPais(partidos: Partido[]): MapaEquipoPais {
  const m: MapaEquipoPais = {};
  for (const p of partidos) {
    if (p.equipo_local && p.pais_local && p.equipo_local !== "Por definir") {
      m[p.equipo_local] = p.pais_local;
    }
    if (p.equipo_visita && p.pais_visita && p.equipo_visita !== "Por definir") {
      m[p.equipo_visita] = p.pais_visita;
    }
  }
  return m;
}

// Codigo ISO de un equipo por nombre; "" si no se conoce (Flag muestra el logo).
export function codigoPais(mapa: MapaEquipoPais, equipo: string | null): string {
  if (!equipo) return "";
  return mapa[equipo] ?? "";
}
