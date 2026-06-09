// Helpers de fecha/hora. Fuente unica (DRY) para toda la app.
// Zona y locale pensados para Chile (es-CL).

const TZ = "America/Santiago";

export function fmtHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

// Ej: "jue 11 jun"
export function fmtFechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: TZ,
  });
}

// Ej: "jue 11 jun · 15:00"
export function fmtFechaHora(iso: string): string {
  return `${fmtFechaCorta(iso)} \u00b7 ${fmtHora(iso)}`;
}

// Clave de dia para agrupar (YYYY-MM-DD en la zona local).
export function claveDia(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}
