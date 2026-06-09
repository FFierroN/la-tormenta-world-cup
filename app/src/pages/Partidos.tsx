import { useNavigate } from "react-router-dom";
import Flag from "../components/Flag";
import { listarPartidos } from "../lib/data";
import { useAsync } from "../lib/useAsync";
import { ESTADO_LABEL } from "../lib/estados";
import type { Partido } from "../lib/types";

export default function Partidos() {
  const navigate = useNavigate();
  const { data: partidos, cargando, error } = useAsync(listarPartidos, []);

  return (
    <div className="max-w-md mx-auto">
      <header className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold">Partidos</h1>
      </header>

      {cargando && (
        <p className="px-4 text-neutral-400 text-sm">Cargando partidos...</p>
      )}
      {error && (
        <p className="px-4 text-red-400 text-sm">
          No se pudieron cargar los partidos. Revisa la conexion con Supabase.
        </p>
      )}
      {!cargando && !error && (partidos?.length ?? 0) === 0 && (
        <p className="px-4 text-neutral-400 text-sm">Aun no hay partidos.</p>
      )}

      <ul className="px-4 flex flex-col gap-3">
        {(partidos ?? []).map((p) => (
          <li key={p.id}>
            <button
              onClick={() => navigate(`/partido/${p.id}`)}
              className="w-full text-left bg-carbon-card border border-borde rounded-2xl p-4 active:scale-[0.99] transition-transform"
            >
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-3">
                <span>{p.fase}</span>
                <span
                  className={
                    p.estado === "en_vivo"
                      ? "text-oro font-semibold"
                      : "text-neutral-400"
                  }
                >
                  {ESTADO_LABEL[p.estado]}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <Equipo code={p.pais_local} nombre={p.equipo_local} />
                <Marcador p={p} />
                <Equipo code={p.pais_visita} nombre={p.equipo_visita} />
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Equipo({ code, nombre }: { code: string; nombre: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-24">
      <Flag code={code} size={44} nombre={nombre} />
      <span className="text-xs text-center font-medium leading-tight">{nombre}</span>
    </div>
  );
}

function Marcador({ p }: { p: Partido }) {
  if (p.estado === "programado") {
    const hora = new Date(p.fecha).toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return <div className="text-sm font-semibold text-neutral-300">{hora}</div>;
  }
  return (
    <div className="text-2xl font-black tabular-nums">
      {p.goles_local ?? 0} - {p.goles_visita ?? 0}
    </div>
  );
}
