import Flag from "../components/Flag";
import { obtenerTablaGrupos } from "../lib/data";
import { useAsync } from "../lib/useAsync";
import type { FilaGrupo } from "../lib/types";

export default function Grupos() {
  const { data, cargando, error } = useAsync(obtenerTablaGrupos, []);
  const filas = data ?? [];

  // Agrupar filas por letra de grupo.
  const grupos = [...new Set(filas.map((f) => f.grupo))].sort();

  return (
    <div className="max-w-md mx-auto">
      <header className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold">Grupos del Mundial</h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          Se actualiza solo con cada resultado.
        </p>
      </header>

      {cargando && (
        <p className="px-4 text-neutral-400 text-sm">Cargando grupos...</p>
      )}
      {error && (
        <p className="px-4 text-red-400 text-sm">
          No se pudieron cargar los grupos. Revisa la conexion con Supabase.
        </p>
      )}
      {!cargando && !error && grupos.length === 0 && (
        <p className="px-4 text-neutral-400 text-sm">
          Aun no hay equipos definidos en los grupos.
        </p>
      )}

      <div className="flex flex-col gap-6 px-4 pb-2">
        {grupos.map((g) => (
          <TablaGrupo
            key={g}
            grupo={g}
            filas={filas.filter((f) => f.grupo === g)}
          />
        ))}
      </div>
    </div>
  );
}

function TablaGrupo({ grupo, filas }: { grupo: string; filas: FilaGrupo[] }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold text-oro uppercase tracking-wide">
        Grupo {grupo}
      </h2>
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
            {filas.map((f) => {
              const clasifica = f.pos <= 2; // top 2 avanzan directo
              return (
                <tr
                  key={f.equipo}
                  className="border-b border-borde/50 last:border-0"
                >
                  <td className="py-2 pl-3 pr-1">
                    <span
                      className={
                        clasifica
                          ? "text-oro font-bold"
                          : "text-neutral-400"
                      }
                    >
                      {f.pos}
                    </span>
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
                  <td className="py-2 pr-3 pl-1 text-center tabular-nums font-bold">
                    {f.pts}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
