// Color caracteristico por seleccion para las fichas de la cancha.
// code = ISO-3166 alpha-2 (el mismo que usa <Flag/>, ej "ar", "br", "es").
// Cada entrada define fondo (bg), color del numero (text) y un anillo (ring)
// para las camisetas claras (blanco) que si no se perderian con el fondo.
// Pensado para CONTRASTE legible del dorsal (WCAG): texto oscuro sobre claro
// y viceversa.

export interface ColorSeleccion {
  bg: string;
  text: string;
  ring?: string; // borde de la ficha (default = bg)
}

const MAPA: Record<string, ColorSeleccion> = {
  // Sudamerica
  ar: { bg: "#75AADB", text: "#0B3D6B" }, // Argentina celeste
  br: { bg: "#FFDF00", text: "#009739" }, // Brasil amarillo
  uy: { bg: "#4B9CD3", text: "#FFFFFF" }, // Uruguay celeste (mas fuerte)
  cl: { bg: "#DA291C", text: "#FFFFFF" }, // Chile rojo
  co: { bg: "#FCD116", text: "#00338D" }, // Colombia amarillo
  ec: { bg: "#FFDD00", text: "#034EA2" }, // Ecuador amarillo
  pe: { bg: "#FFFFFF", text: "#D91023", ring: "#D91023" }, // Peru blanco/rojo
  py: { bg: "#DA121A", text: "#FFFFFF" }, // Paraguay rojo
  bo: { bg: "#007934", text: "#FFFFFF" }, // Bolivia verde
  ve: { bg: "#7B1113", text: "#FFD100" }, // Venezuela vinotinto

  // Europa
  es: { bg: "#C60B1E", text: "#FFFFFF" }, // Espana rojo
  fr: { bg: "#0055A4", text: "#FFFFFF" }, // Francia azul
  de: { bg: "#FFFFFF", text: "#000000", ring: "#FFCE00" }, // Alemania blanco/negro
  it: { bg: "#0066B3", text: "#FFFFFF" }, // Italia azzurri
  pt: { bg: "#C8102E", text: "#FFFFFF", ring: "#006600" }, // Portugal rojo/verde
  nl: { bg: "#FF6200", text: "#FFFFFF" }, // Paises Bajos naranja
  be: { bg: "#E30613", text: "#FFFFFF" }, // Belgica rojo
  hr: { bg: "#FF0000", text: "#FFFFFF" }, // Croacia rojo
  pl: { bg: "#FFFFFF", text: "#DC143C", ring: "#DC143C" }, // Polonia blanco/rojo
  ch: { bg: "#D52B1E", text: "#FFFFFF" }, // Suiza rojo
  rs: { bg: "#C6363C", text: "#FFFFFF" }, // Serbia rojo
  dk: { bg: "#C60C30", text: "#FFFFFF" }, // Dinamarca rojo
  gr: { bg: "#0D5EAF", text: "#FFFFFF" }, // Grecia azul
  tr: { bg: "#E30A17", text: "#FFFFFF" }, // Turquia rojo
  at: { bg: "#ED2939", text: "#FFFFFF" }, // Austria rojo
  no: { bg: "#BA0C2F", text: "#FFFFFF" }, // Noruega rojo
  se: { bg: "#FECC00", text: "#006AA7" }, // Suecia amarillo
  ua: { bg: "#0057B7", text: "#FFD500" }, // Ucrania azul/amarillo
  // Inglaterra / Reino Unido (flagcdn usa sufijos gb-*)
  en: { bg: "#FFFFFF", text: "#1D3D8F", ring: "#CE1124" }, // Inglaterra blanco
  "gb-eng": { bg: "#FFFFFF", text: "#1D3D8F", ring: "#CE1124" },
  "gb-sct": { bg: "#0065BF", text: "#FFFFFF" }, // Escocia azul
  "gb-wls": { bg: "#C8102E", text: "#FFFFFF" }, // Gales rojo

  // Norte/Centroamerica
  us: { bg: "#0A3161", text: "#FFFFFF" }, // USA azul marino
  mx: { bg: "#006847", text: "#FFFFFF" }, // Mexico verde
  ca: { bg: "#D52B1E", text: "#FFFFFF" }, // Canada rojo
  cr: { bg: "#C8102E", text: "#FFFFFF" }, // Costa Rica rojo

  // Africa
  ma: { bg: "#C1272D", text: "#006233" }, // Marruecos rojo/verde
  sn: { bg: "#00853F", text: "#FFFFFF" }, // Senegal verde
  gh: { bg: "#006B3F", text: "#FCD116" }, // Ghana verde/oro
  ng: { bg: "#008751", text: "#FFFFFF" }, // Nigeria verde
  eg: { bg: "#CE1126", text: "#FFFFFF" }, // Egipto rojo
  dz: { bg: "#006233", text: "#FFFFFF" }, // Argelia verde
  ci: { bg: "#FF8200", text: "#FFFFFF" }, // Costa de Marfil naranja
  cm: { bg: "#007A5E", text: "#FCD116" }, // Camerun verde/oro
  za: { bg: "#007A4D", text: "#FFFFFF" }, // Sudafrica verde
  tn: { bg: "#E70013", text: "#FFFFFF" }, // Tunez rojo

  // Asia / Oceania
  sa: { bg: "#006C35", text: "#FFFFFF" }, // Arabia Saudita verde
  jp: { bg: "#001C68", text: "#FFFFFF" }, // Japon samurai blue
  kr: { bg: "#CD2E3A", text: "#FFFFFF" }, // Corea del Sur rojo
  au: { bg: "#FFCD00", text: "#00843D" }, // Australia oro/verde
  qa: { bg: "#8A1538", text: "#FFFFFF" }, // Qatar granate
  ir: { bg: "#FFFFFF", text: "#239F40", ring: "#DA0000" }, // Iran blanco/verde
  nz: { bg: "#FFFFFF", text: "#00247D", ring: "#00247D" }, // Nueva Zelanda blanco
};

// Fallback por lado (cuando no tenemos el color de la seleccion):
// local = oro de la app, visita = blanco. Asi siempre se distinguen.
const FALLBACK: Record<"local" | "visita", ColorSeleccion> = {
  local: { bg: "#E9A82E", text: "#0A0A0A" },
  visita: { bg: "#FFFFFF", text: "#111111", ring: "#C9CDD3" },
};

export function colorSeleccion(code: string, lado: "local" | "visita"): ColorSeleccion {
  const c = (code || "").toLowerCase().trim();
  return MAPA[c] ?? FALLBACK[lado];
}
