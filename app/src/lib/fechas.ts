// Helpers de fecha/hora. Fuente unica (DRY) para toda la app.
// Zona y locale pensados para Chile (es-CL).

const TZ = "America/Santiago";

export function fmtHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false, // formato 24h (ej. 15:00)
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

// Ej: "4/7" (dia/mes, compacto para las tarjetas del cuadro de llaves).
export function fmtDiaMes(iso: string): string {
  const d = new Date(iso);
  const dia = d.toLocaleDateString("es-CL", { day: "numeric", timeZone: TZ });
  const mes = d.toLocaleDateString("es-CL", { month: "numeric", timeZone: TZ });
  return `${dia}/${mes}`;
}

// Ej: "Jueves 11 de junio" (encabezado de dia, con mayuscula inicial).
export function fmtDiaLargo(iso: string): string {
  const s = new Date(iso).toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  });
  const limpio = s.replace(",", ""); // "jueves, 11 de junio" -> "jueves 11 de junio"
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

// Clave de dia para agrupar (YYYY-MM-DD en la zona local).
export function claveDia(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}

// Clave del dia de HOY (misma zona) -> para la pestana "Proximos partidos".
export function claveHoy(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

// Cierre de las predicciones especiales: 17 de junio 2026 a las 23:59 (Chile,
// UTC-4) == 18 de junio 03:59 UTC. Antes del primer partido del 18.
const CIERRE_ESPECIALES = Date.parse("2026-06-18T03:59:00Z");

// Dias que faltan para el cierre de especiales (redondeado hacia arriba).
// 0 si ya cerro. Util para la cuenta regresiva del boton.
export function diasParaEspeciales(): number {
  const ms = CIERRE_ESPECIALES - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86400000);
}
