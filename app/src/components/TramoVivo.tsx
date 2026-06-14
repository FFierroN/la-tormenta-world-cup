import type { Partido } from "../lib/types";

// Etiqueta de TRAMO en vivo (reemplaza al cronometro). worldcup26 no da el
// minuto real ni distingue el entretiempo, asi que en vez de un reloj que se
// desfasaba mostramos en que parte del partido vamos, con un punto de color:
//   1er Tiempo  -> punto rojo pulsante
//   Entretiempo -> punto amarillo pulsante
//   2do Tiempo  -> punto rojo pulsante
// El tramo lo setea el robot cruzando worldcup26 (vivo/final) con Highlightly
// (state.description = "Half time" / "In Progress").

// Mapa tramo -> { etiqueta, color del punto }. Fuente unica (DRY).
const TRAMO_INFO: Record<
  NonNullable<Partido["tramo"]>,
  { label: string; punto: string }
> = {
  "1T": { label: "1er Tiempo", punto: "bg-red-500" },
  ET: { label: "Entretiempo", punto: "bg-yellow-400" },
  "2T": { label: "2do Tiempo", punto: "bg-red-500" },
};

export default function TramoVivo({
  partido,
  className = "",
}: {
  partido: Partido;
  className?: string;
}) {
  // Solo aplica mientras el partido esta en juego.
  if (partido.estado !== "en_vivo" && partido.estado !== "entretiempo") return null;
  if (!partido.tramo) return null;

  const info = TRAMO_INFO[partido.tramo];
  if (!info) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className={`relative flex h-2 w-2`}>
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${info.punto}`}
        />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${info.punto}`} />
      </span>
      <span className="text-xs font-bold text-neutral-100">{info.label}</span>
    </div>
  );
}
