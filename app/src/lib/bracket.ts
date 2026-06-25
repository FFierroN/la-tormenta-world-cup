// =====================================================================
// bracket.ts  ·  Estructura del CUADRO de eliminacion (pestana "Llaves").
// =====================================================================
// IMPORTANTE: esto es un TEMPLATE MOCK temporal. Los placeholders (1A, 2B,
// 3C/D/F/G/H, "Gan. P73") y las fechas son de relleno para ver el diseno.
// Cuando llegue el mapa oficial FIFA 2026, se reemplaza SOLO el contenido
// de MOCK_LLAVES (o se cambia obtenerLlaves() para leer de Supabase).
// El resto del front (LlavesView) no cambia. DRY: una sola fuente de datos.

export type FaseLlave =
  | "Dieciseisavos"
  | "Octavos"
  | "Cuartos"
  | "Semifinales"
  | "Tercer Puesto"
  | "Final";

// Un partido del cuadro. 'local'/'visita' son ETIQUETAS (placeholder) mientras
// no haya equipos reales; cuando se enchufe la data, paisLocal/equipoLocal se
// llenan y la UI muestra bandera + nombre en vez del placeholder.
export interface SlotLlave {
  slot: string; // codigo oficial: P73..P104
  fase: FaseLlave;
  fecha: string; // ISO
  ciudad?: string;
  // placeholders (de donde sale cada lado)
  local: string; // ej "1A"  | "Gan. P73"
  visita: string; // ej "3C/D/F/G/H"
  // datos reales (cuando ya se definio el equipo); null = aun placeholder
  equipoLocal?: string | null;
  paisLocal?: string | null;
  equipoVisita?: string | null;
  paisVisita?: string | null;
}

// Orden canonico de las fases (de la mas temprana a la final).
export const ORDEN_FASE_LLAVE: FaseLlave[] = [
  "Dieciseisavos",
  "Octavos",
  "Cuartos",
  "Semifinales",
  "Tercer Puesto",
  "Final",
];

// ---------------------------------------------------------------------
// TEMPLATE MOCK (placeholders + fechas reales del fixture WC2026)
// ---------------------------------------------------------------------
// OJO: los emparejamientos de grupos son inventados para la demo visual.
// No representan el cuadro oficial (eso llega con el PDF de Felipe).
export const MOCK_LLAVES: SlotLlave[] = [
  // ---- Dieciseisavos (16) ----
  { slot: "P73", fase: "Dieciseisavos", fecha: "2026-06-28T15:00:00-04:00", ciudad: "Los Ángeles", local: "1A", visita: "3C/D/F/G/H" },
  { slot: "P74", fase: "Dieciseisavos", fecha: "2026-06-29T13:00:00-04:00", ciudad: "Houston", local: "1C", visita: "2F" },
  { slot: "P75", fase: "Dieciseisavos", fecha: "2026-06-29T16:30:00-04:00", ciudad: "Boston", local: "1E", visita: "3A/B/C/D" },
  { slot: "P76", fase: "Dieciseisavos", fecha: "2026-06-29T21:00:00-04:00", ciudad: "Monterrey", local: "1F", visita: "2C" },
  { slot: "P77", fase: "Dieciseisavos", fecha: "2026-06-30T13:00:00-04:00", ciudad: "Dallas", local: "2A", visita: "2B" },
  { slot: "P78", fase: "Dieciseisavos", fecha: "2026-06-30T17:00:00-04:00", ciudad: "Nueva York", local: "1I", visita: "3E/H/I/J" },
  { slot: "P79", fase: "Dieciseisavos", fecha: "2026-06-30T21:00:00-04:00", ciudad: "Ciudad de México", local: "1G", visita: "3A/E/H/I/J" },
  { slot: "P80", fase: "Dieciseisavos", fecha: "2026-07-01T12:00:00-04:00", ciudad: "Atlanta", local: "2L", visita: "2J" },
  { slot: "P81", fase: "Dieciseisavos", fecha: "2026-07-01T16:00:00-04:00", ciudad: "Seattle", local: "1K", visita: "3B/E/F/I/J" },
  { slot: "P82", fase: "Dieciseisavos", fecha: "2026-07-01T20:00:00-04:00", ciudad: "San Francisco", local: "1B", visita: "3E/F/G/I/J" },
  { slot: "P83", fase: "Dieciseisavos", fecha: "2026-07-02T15:00:00-04:00", ciudad: "Los Ángeles", local: "1L", visita: "3C/D/F/G/H" },
  { slot: "P84", fase: "Dieciseisavos", fecha: "2026-07-02T19:00:00-04:00", ciudad: "Toronto", local: "2K", visita: "2I" },
  { slot: "P85", fase: "Dieciseisavos", fecha: "2026-07-02T23:00:00-04:00", ciudad: "Vancouver", local: "1D", visita: "3B/E/F/I/J" },
  { slot: "P86", fase: "Dieciseisavos", fecha: "2026-07-03T14:00:00-04:00", ciudad: "Dallas", local: "1H", visita: "2G" },
  { slot: "P87", fase: "Dieciseisavos", fecha: "2026-07-03T18:00:00-04:00", ciudad: "Miami", local: "1J", visita: "2H" },
  { slot: "P88", fase: "Dieciseisavos", fecha: "2026-07-03T21:30:00-04:00", ciudad: "Kansas City", local: "2D", visita: "2E" },

  // ---- Octavos (8) ----
  { slot: "P89", fase: "Octavos", fecha: "2026-07-04T13:00:00-04:00", ciudad: "Houston", local: "Gan. P74", visita: "Gan. P77" },
  { slot: "P90", fase: "Octavos", fecha: "2026-07-04T17:00:00-04:00", ciudad: "Filadelfia", local: "Gan. P73", visita: "Gan. P75" },
  { slot: "P91", fase: "Octavos", fecha: "2026-07-05T16:00:00-04:00", ciudad: "Nueva York", local: "Gan. P76", visita: "Gan. P78" },
  { slot: "P92", fase: "Octavos", fecha: "2026-07-05T20:00:00-04:00", ciudad: "Ciudad de México", local: "Gan. P79", visita: "Gan. P80" },
  { slot: "P93", fase: "Octavos", fecha: "2026-07-06T15:00:00-04:00", ciudad: "Dallas", local: "Gan. P83", visita: "Gan. P84" },
  { slot: "P94", fase: "Octavos", fecha: "2026-07-06T20:00:00-04:00", ciudad: "Seattle", local: "Gan. P81", visita: "Gan. P82" },
  { slot: "P95", fase: "Octavos", fecha: "2026-07-07T12:00:00-04:00", ciudad: "Atlanta", local: "Gan. P86", visita: "Gan. P88" },
  { slot: "P96", fase: "Octavos", fecha: "2026-07-07T16:00:00-04:00", ciudad: "Vancouver", local: "Gan. P85", visita: "Gan. P87" },

  // ---- Cuartos (4) ----
  { slot: "P97", fase: "Cuartos", fecha: "2026-07-09T16:00:00-04:00", ciudad: "Boston", local: "Gan. P89", visita: "Gan. P90" },
  { slot: "P98", fase: "Cuartos", fecha: "2026-07-10T15:00:00-04:00", ciudad: "Los Ángeles", local: "Gan. P93", visita: "Gan. P94" },
  { slot: "P99", fase: "Cuartos", fecha: "2026-07-11T17:00:00-04:00", ciudad: "Miami", local: "Gan. P91", visita: "Gan. P92" },
  { slot: "P100", fase: "Cuartos", fecha: "2026-07-11T21:00:00-04:00", ciudad: "Kansas City", local: "Gan. P95", visita: "Gan. P96" },

  // ---- Semifinales (2) ----
  { slot: "P101", fase: "Semifinales", fecha: "2026-07-14T15:00:00-04:00", ciudad: "Dallas", local: "Gan. P97", visita: "Gan. P98" },
  { slot: "P102", fase: "Semifinales", fecha: "2026-07-15T15:00:00-04:00", ciudad: "Atlanta", local: "Gan. P99", visita: "Gan. P100" },

  // ---- Tercer puesto (1) ----
  { slot: "P103", fase: "Tercer Puesto", fecha: "2026-07-18T17:00:00-04:00", ciudad: "Miami", local: "Perd. P101", visita: "Perd. P102" },

  // ---- Final (1) ----
  { slot: "P104", fase: "Final", fecha: "2026-07-19T15:00:00-04:00", ciudad: "Nueva York", local: "Gan. P101", visita: "Gan. P102" },
];

// Fuente unica de datos para la UI. Hoy devuelve el MOCK; manana puede
// devolver Promise<SlotLlave[]> leyendo de Supabase (slot/origen_* reales).
export function obtenerLlavesMock(): SlotLlave[] {
  return MOCK_LLAVES;
}

export function slotsPorFase(slots: SlotLlave[], fase: FaseLlave): SlotLlave[] {
  return slots
    .filter((s) => s.fase === fase)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
