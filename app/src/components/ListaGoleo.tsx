// Lista rankeada de jugadores (goleadores, asistidores, tarjetas, penales...).
// Fuente unica (DRY): la reusan la pestana Grupos (antes) y ahora Estadisticas.
// Colapsada muestra 'topInicial' filas (default 5); un click al pie expande a
// la lista completa. Si hay menos filas que topInicial, no muestra el toggle.
import { useState } from "react";
import type { ReactNode } from "react";
import Flag from "./Flag";
import type { FilaGoleo } from "../lib/types";

interface Props {
  titulo: string;
  filas: FilaGoleo[]; // lista COMPLETA (ya ordenada); el componente corta.
  icono: ReactNode;
  sufijo: string; // "goles", "asist.", "g+a", "amar.", "rojas", "penales"
  topInicial?: number; // default 5
}

export default function ListaGoleo({ titulo, filas, icono, sufijo, topInicial = 5 }: Props) {
  const [expandido, setExpandido] = useState(false);
  const hayMas = filas.length > topInicial;
  const mostrar = expandido ? filas : filas.slice(0, topInicial);

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-oro uppercase tracking-wide">
        {icono}
        {titulo}
      </h3>
      <div className="border border-borde rounded-2xl overflow-hidden">
        {filas.length === 0 ? (
          <p className="text-xs text-neutral-500 px-4 py-3">Aun sin registros.</p>
        ) : (
          <>
            <ul>
              {mostrar.map((f, i) => (
                <li
                  key={f.jugador}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-borde/50 last:border-0"
                >
                  <span className="w-5 text-center text-xs font-bold tabular-nums text-neutral-400">
                    {i + 1}
                  </span>
                  {f.pais && <Flag code={f.pais} size={20} nombre={f.jugador} />}
                  <span className="flex-1 text-sm leading-tight truncate" title={f.jugador}>
                    {f.jugador}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-oro">{f.total}</span>
                  <span className="text-[11px] text-neutral-500 w-12 text-right">{sufijo}</span>
                </li>
              ))}
            </ul>
            {hayMas && (
              <button
                type="button"
                onClick={() => setExpandido((v) => !v)}
                className="w-full px-4 py-2 text-xs font-semibold text-oro uppercase tracking-wide border-t border-borde/70 hover:bg-white/5 active:bg-white/10 transition-colors"
              >
                {expandido
                  ? "Ver menos"
                  : `Ver lista completa (${filas.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
