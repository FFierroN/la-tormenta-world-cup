// Pagina PILOTO del rediseno estilo WC26 (ruta /partidos-wc).
//
// NO reemplaza Partidos.tsx: es un preview para validar el look antes de
// propagarlo. Reusa los mismos hooks de datos (listarPartidos / misPronosticos)
// y la TarjetaPartidoWC. Agrupacion por ESTADO (En vivo / Proximos / Jugados),
// y dentro, separadores por dia.
import { useMemo } from "react";
import TarjetaPartidoWC from "../components/TarjetaPartidoWC";
import { listarPartidos, misPronosticos } from "../lib/data";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../lib/auth";
import { fmtDiaLargo, claveDia } from "../lib/fechas";
import { enCurso } from "../lib/estados";
import type { Partido } from "../lib/types";

type Seccion = { id: string; titulo: string; partidos: Partido[] };

function enVivoAhora(p: Partido): boolean {
  return enCurso(p.estado) || p.estado === "entretiempo";
}

function construirSecciones(partidos: Partido[]): Seccion[] {
  const vivos = partidos
    .filter(enVivoAhora)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const proximos = partidos
    .filter((p) => p.estado === "programado" || p.estado === "suspendido")
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const jugados = partidos
    .filter((p) => p.estado === "final")
    .sort((a, b) => b.fecha.localeCompare(a.fecha)); // ultimo primero

  return [
    { id: "vivo", titulo: "En vivo", partidos: vivos },
    { id: "proximos", titulo: "Proximos", partidos: proximos },
    { id: "jugados", titulo: "Jugados", partidos: jugados },
  ].filter((s) => s.partidos.length > 0);
}

// Agrupa una lista (ya ordenada) en sub-bloques por dia.
function porDia(partidos: Partido[]): { dia: string; partidos: Partido[] }[] {
  const out: { dia: string; partidos: Partido[] }[] = [];
  let clave = "";
  for (const p of partidos) {
    const c = claveDia(p.fecha);
    if (c !== clave) {
      out.push({ dia: fmtDiaLargo(p.fecha), partidos: [] });
      clave = c;
    }
    out[out.length - 1].partidos.push(p);
  }
  return out;
}

export default function PartidosWC() {
  const { jugador } = useAuth();
  const { data: partidos, cargando, error } = useAsync(listarPartidos, []);
  const secciones = useMemo(
    () => (partidos ? construirSecciones(partidos) : []),
    [partidos]
  );

  const { data: pronIds } = useAsync(
    () =>
      jugador ? misPronosticos(jugador.id) : Promise.resolve(new Set<string>()),
    [jugador?.id]
  );
  const pronosticadoIds = pronIds ?? new Set<string>();

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-10">
      {/* Cabecera estilo WC26: titulo brutal + subtitulo lima. */}
      <header className="mb-5">
        <h1 className="titulo-wc text-6xl text-white">Partidos</h1>
        <p className="mt-1 text-sm font-bold uppercase tracking-[0.2em] text-neon-lima">
          La Tormenta - Mundial 2026
        </p>
      </header>

      {cargando && (
        <p className="text-neutral-400 text-sm">Cargando partidos...</p>
      )}
      {error && (
        <p className="text-neon-naranja text-sm">
          No se pudieron cargar los partidos. Revisa la conexion con Supabase.
        </p>
      )}
      {!cargando && !error && partidos && partidos.length === 0 && (
        <p className="text-neutral-400 text-sm">Aun no hay partidos.</p>
      )}

      <div className="flex flex-col gap-8">
        {secciones.map((s) => (
          <section key={s.id}>
            <h2 className="mb-3 flex items-center gap-2 titulo-wc text-2xl text-white">
              {s.id === "vivo" && (
                <span className="w-2.5 h-2.5 rounded-full bg-neon-naranja glow-punto text-neon-naranja" />
              )}
              {s.titulo}
            </h2>

            <div className="flex flex-col gap-6">
              {porDia(s.partidos).map((g) => (
                <div key={g.dia}>
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-neutral-400">
                    {g.dia}
                  </p>
                  <ul className="flex flex-col gap-3">
                    {g.partidos.map((p) => (
                      <TarjetaPartidoWC
                        key={p.id}
                        p={p}
                        pronosticado={pronosticadoIds.has(p.id)}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
