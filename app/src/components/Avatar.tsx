import { useEffect, useState } from "react";
import type { VarianteBorde } from "../lib/avatares";

type Props = {
  src: string | null;
  nombre: string;
  width?: number; // ancho en px (el alto se calcula con la proporcion 3:4)
  variante?: VarianteBorde;
};

// Proporcion real de las fotos (894x1200 ~ 3:4).
const RATIO_W_H = 894 / 1200;

// Colores de borde por posicion.
const BORDES: Record<VarianteBorde, string> = {
  oro: "#E9A82E", // dorado
  plata: "#C0C7CF", // plata
  bronce: "#CD7F32", // bronce
  gris: "#4b5563", // gris neutro
  rojo: "#EF4444", // rojo (ultimo)
};

// Avatar rectangular (proporcion de la foto) con borde de color segun el puesto.
// Si no hay foto, muestra la inicial como respaldo.
export default function Avatar({
  src,
  nombre,
  width = 112,
  variante = "gris",
}: Props) {
  const height = Math.round(width / RATIO_W_H);
  const borderColor = BORDES[variante];
  // Si la foto falla al cargar (archivo faltante o mal nombrado), caemos a la
  // inicial en vez de mostrar el icono de "imagen rota".
  const [falloFoto, setFalloFoto] = useState(false);
  useEffect(() => setFalloFoto(false), [src]);
  const box = {
    width,
    height,
    borderColor,
    borderWidth: 3,
  } as const;
  const base =
    "rounded-lg overflow-hidden bg-carbon-card border-solid";

  if (src && !falloFoto) {
    return (
      <img
        src={src}
        alt={nombre}
        onError={() => setFalloFoto(true)}
        className={`${base} object-cover`}
        style={box}
      />
    );
  }
  return (
    <div
      className={`${base} flex items-center justify-center text-neutral-300 font-bold`}
      style={{ ...box, fontSize: width * 0.4 }}
      aria-label={nombre}
    >
      {(nombre?.trim()?.[0] ?? "?").toUpperCase()}
    </div>
  );
}
