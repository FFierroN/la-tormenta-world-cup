// =====================================================================
// podioSandbox.tsx  ·  Piezas visuales del PODIO del sandbox (compartidas).
// =====================================================================
// Las usan la sub-pestana "Llaves" (cajitas de "mas elegido por todos") y la
// pantalla del cuadro de cada jugador (podio personal). DRY: una sola fuente.
import Flag from "./Flag";
import type { VotoPodio, PosicionPodio } from "../lib/data";
import type { EquipoResuelto } from "../lib/pronostico";

// Estilo de cada posicion del podio (neon). Clases completas -> Tailwind JIT.
export const POSICIONES: {
  key: PosicionPodio;
  titulo: string;
  medalla: string;
  color: string; // text-* para el nombre en el podio personal
  dot: string;
  barra: string;
  borde: string;
}[] = [
  { key: "campeon",    titulo: "Campeon mas elegido",    medalla: "\u{1F3C6}", color: "text-neon-menta",   dot: "bg-neon-menta",   barra: "bg-neon-menta",   borde: "border-neon-menta/30" },
  { key: "subcampeon", titulo: "Subcampeon mas elegido", medalla: "\u{1F948}", color: "text-neon-azul",    dot: "bg-neon-azul",    barra: "bg-neon-azul",    borde: "border-neon-azul/30" },
  { key: "tercero",    titulo: "3er lugar mas elegido",  medalla: "\u{1F949}", color: "text-neon-purpura", dot: "bg-neon-purpura", barra: "bg-neon-purpura", borde: "border-neon-purpura/30" },
];

// Una linea del podio de un jugador (medalla + bandera + nombre), con color neon.
export function PodioLinea({
  medalla,
  color,
  equipo,
}: {
  medalla: string;
  color: string;
  equipo: EquipoResuelto | null;
}) {
  if (!equipo) {
    return (
      <div className="flex items-center gap-2 text-neutral-600">
        <span className="text-sm">{medalla}</span>
        <span className="text-xs">Por definir</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">{medalla}</span>
      <Flag code={equipo.pais ?? "XX"} size={18} nombre={equipo.nombre} />
      <span className={`text-sm font-bold truncate ${color}`}>{equipo.nombre}</span>
    </div>
  );
}

// Cajita de una posicion del podio: ranking de paises con barras de %.
export function CajaPosicion({
  estilo,
  filas,
}: {
  estilo: (typeof POSICIONES)[number];
  filas: VotoPodio[];
}) {
  const total = filas.reduce((acc, v) => acc + v.votos, 0);
  return (
    <div className={`mx-4 rounded-2xl border ${estilo.borde} bg-carbon-card p-4`}>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral-100">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${estilo.dot}`} aria-hidden="true" />
        <span>{estilo.medalla} {estilo.titulo}</span>
        {total > 0 && <span className="text-neutral-500 font-semibold">({total})</span>}
      </h3>

      {total === 0 ? (
        <p className="text-xs text-neutral-500">Aun nadie eligio este puesto.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {filas.map((v) => {
            const pct = Math.round((v.votos / total) * 100);
            return (
              <li key={v.pais}>
                <div className="mb-1 flex items-center gap-2">
                  <Flag code={v.iso ?? "XX"} size={18} nombre={v.pais} />
                  <span className="flex-1 truncate text-sm text-neutral-100">{v.pais}</span>
                  <span className="text-xs font-bold tabular-nums text-neutral-100">{pct}%</span>
                  <span className="w-6 text-right text-[11px] text-neutral-500 tabular-nums">
                    {v.votos}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-carbon-soft">
                  <div
                    className={`h-full rounded-full ${estilo.barra} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
