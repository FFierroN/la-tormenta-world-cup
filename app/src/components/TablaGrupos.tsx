// Tabla de posiciones de cada GRUPO del Mundial (pestana "Grupos" dentro de Copa).
// Extraido de la antigua pantalla Grupos para reusarlo (DRY).
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import Flag from "./Flag";
import { BallIcon, ShoeIcon } from "./Iconos";
import { obtenerTablaGrupos, obtenerGoleo } from "../lib/data";
import { useAsync } from "../lib/useAsync";
import type { FilaGoleo, FilaGrupo } from "../lib/types";

// Color por posicion dentro del grupo: 1-2 clasifican (verde), 3 repechaje
// como mejor tercero (amarillo), 4 eliminado (blanco). Se reusa en # y Pts.
function colorPos(pos: number): string {
  if (pos <= 2) return "text-emerald-400";
  if (pos === 3) return "text-yellow-400";
  return "text-neutral-100";
}

export default function TablaGrupos() {
  const { data, cargando, error } = useAsync(obtenerTablaGrupos, []);
  const filas = data ?? [];
  const grupos = [...new Set(filas.map((f) => f.grupo))].sort();

  return (
    <div className="flex flex-col gap-6 px-4 py-4 pb-2">
      {cargando && (
        <p className="text-neutral-400 text-sm">Cargando grupos...</p>
      )}
      {error && (
        <p className="text-red-400 text-sm">
          No se pudieron cargar los grupos. Revisa la conexion con Supabase.
        </p>
      )}
      {!cargando && !error && grupos.length === 0 && (
        <p className="text-neutral-400 text-sm">
          Aun no hay equipos definidos en los grupos.
        </p>
      )}
      {grupos.map((g) => (
        <TablaGrupo key={g} grupo={g} filas={filas.filter((f) => f.grupo === g)} />
      ))}

      {!cargando && !error && grupos.length > 0 && <TablaGoleo />}
    </div>
  );
}

function TablaGrupo({ grupo, filas }: { grupo: string; filas: FilaGrupo[] }) {
  const navigate = useNavigate();
  const irAlGrupo = () => navigate(`/partidos?grupo=${grupo}`);
  return (
    <section>
      <button
        onClick={irAlGrupo}
        className="mb-2 flex items-center gap-1 text-sm font-bold text-oro uppercase tracking-wide"
      >
        Grupo {grupo}
        <span className="text-[10px] normal-case font-normal text-neutral-400">
          (ver partidos)
        </span>
      </button>
      <div className="bg-carbon-card border border-borde rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] text-neutral-400 border-b border-borde">
              <th className="text-left font-medium py-2 pl-3 pr-1 w-6">#</th>
              <th className="text-left font-medium py-2">Equipo</th>
              <th className="font-medium py-2 px-1 w-7">PJ</th>
              <th className="font-medium py-2 px-1 w-8">DG</th>
              <th className="font-medium py-2 pr-3 pl-1 w-9">Pts</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr
                key={f.equipo}
                onClick={irAlGrupo}
                className="border-b border-borde/50 last:border-0 cursor-pointer active:bg-carbon-soft"
              >
                <td className="py-2 pl-3 pr-1">
                  <span className={`font-bold ${colorPos(f.pos)}`}>{f.pos}</span>
                </td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <Flag code={f.pais} size={22} nombre={f.equipo} />
                    <span className="leading-tight">{f.equipo}</span>
                  </div>
                </td>
                <td className="py-2 px-1 text-center tabular-nums text-neutral-300">
                  {f.pj}
                </td>
                <td className="py-2 px-1 text-center tabular-nums text-neutral-300">
                  {f.dg > 0 ? `+${f.dg}` : f.dg}
                </td>
                <td className={`py-2 pr-3 pl-1 text-center tabular-nums font-bold ${colorPos(f.pos)}`}>
                  {f.pts}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Tabla con el Top 5 de goleadores y de asistidores del torneo.
function TablaGoleo() {
  const { data, cargando, error } = useAsync(() => obtenerGoleo(5), []);
  const goleadores = data?.goleadores ?? [];
  const asistidores = data?.asistidores ?? [];

  if (cargando || error) return null; // silencioso: es informacion secundaria
  if (goleadores.length === 0 && asistidores.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <ListaGoleo
        titulo="Goleadores"
        filas={goleadores}
        icono={<BallIcon className="w-4 h-4 text-oro" />}
        sufijo="goles"
      />
      <ListaGoleo
        titulo="Asistidores"
        filas={asistidores}
        icono={<ShoeIcon className="w-4 h-4 text-emerald-400" />}
        sufijo="asist."
      />
    </section>
  );
}

function ListaGoleo({
  titulo,
  filas,
  icono,
  sufijo,
}: {
  titulo: string;
  filas: FilaGoleo[];
  icono: ReactNode;
  sufijo: string;
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-oro uppercase tracking-wide">
        {icono}
        {titulo}
      </h3>
      <div className="bg-carbon-card border border-borde rounded-2xl overflow-hidden">
        {filas.length === 0 ? (
          <p className="text-xs text-neutral-500 px-4 py-3">Aun sin registros.</p>
        ) : (
          <ul>
            {filas.map((f, i) => (
              <li
                key={f.jugador}
                className="flex items-center gap-3 px-4 py-2.5 border-b border-borde/50 last:border-0"
              >
                <span className="w-5 text-center text-xs font-bold tabular-nums text-neutral-400">
                  {i + 1}
                </span>
                {f.pais && (
                  <Flag code={f.pais} size={20} nombre={f.jugador} />
                )}
                <span className="flex-1 text-sm leading-tight truncate" title={f.jugador}>
                  {f.jugador}
                </span>
                <span className="text-sm font-bold tabular-nums text-oro">
                  {f.total}
                </span>
                <span className="text-[11px] text-neutral-500 w-10">{sufijo}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
