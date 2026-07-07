// Lista rankeada de jugadores (goleadores, asistidores, tarjetas, penales...).
// Fuente unica (DRY): la usan la pestana Estadisticas (top 5 con link al
// detalle) y la pantalla EstadisticaDetalle (lista completa, sin link).
//
// Comportamiento:
//   - Si viene 'href': la tabla es clickeable y navega a esa ruta. Muestra
//     'topInicial' filas (default 5) + pie "Ver todos (N)" cuando hay mas.
//   - Si NO viene 'href': muestra la lista completa (o el slice indicado en
//     topInicial), sin link ni pie.
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import Flag from "./Flag";
import type { FilaGoleo } from "../lib/types";

interface Props {
  titulo: string;
  filas: FilaGoleo[]; // lista COMPLETA (ya ordenada); el componente decide slice.
  icono: ReactNode;
  sufijo: string; // "goles", "asist.", "g+a", "amar.", "rojas", "penales"
  topInicial?: number; // default 5. Ignorado si !href (muestra todo).
  href?: string; // si viene, la tabla lleva a esta ruta al clickearla.
}

export default function ListaGoleo({ titulo, filas, icono, sufijo, topInicial = 5, href }: Props) {
  const navigate = useNavigate();
  const mostrar = href ? filas.slice(0, topInicial) : filas;
  const hayMas = href && filas.length > topInicial;
  const clickeable = !!href;

  const irADetalle = () => {
    if (href) navigate(href);
  };

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-oro uppercase tracking-wide">
        {icono}
        {titulo}
      </h3>
      <div
        className={`border border-borde rounded-2xl overflow-hidden ${
          clickeable ? "cursor-pointer active:bg-white/5 transition-colors" : ""
        }`}
        onClick={clickeable ? irADetalle : undefined}
        role={clickeable ? "button" : undefined}
        tabIndex={clickeable ? 0 : undefined}
        onKeyDown={
          clickeable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  irADetalle();
                }
              }
            : undefined
        }
        aria-label={clickeable ? `Ver ranking completo de ${titulo}` : undefined}
      >
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
              <div className="px-4 py-2 text-xs font-semibold text-oro uppercase tracking-wide border-t border-borde/70 text-center">
                Ver todos ({filas.length}) ›
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
