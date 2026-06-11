// Badge de estado de partido: puntito de color (con glow opcional) + texto en
// negrita. Fuente unica (DRY): lo usan la lista de partidos y el detalle.
// No dibuja nada cuando el partido esta 'programado' (aun no se juega).
import { ESTADO_LABEL, estiloEstado } from "../lib/estados";
import type { EstadoPartido } from "../lib/types";

export default function EstadoBadge({
  estado,
  className = "",
}: {
  estado: EstadoPartido;
  className?: string;
}) {
  const { mostrar, punto, glow } = estiloEstado(estado);
  if (!mostrar) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 font-bold text-neutral-100 ${className}`}>
      {punto && (
        <span
          className={`w-2 h-2 rounded-full bg-current ${punto} ${glow ? "glow-punto" : ""}`}
        />
      )}
      {ESTADO_LABEL[estado]}
    </span>
  );
}
