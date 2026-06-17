import { useState } from "react";
import Avatar from "../components/Avatar";
import IndicadorMovimiento from "../components/IndicadorMovimiento";
import { avatarPorPosicion, bordePorPosicion } from "../lib/avatares";
import { obtenerTabla, obtenerTablaLive, fotoUltimoHabilitada } from "../lib/data";
import { useAsync } from "../lib/useAsync";
import { useSwipe } from "../lib/useSwipe";
import type { FilaTabla } from "../lib/types";

type Pestana = "galeria" | "clasica";

export default function Tabla() {
  const [pestana, setPestana] = useState<Pestana>("galeria");
  const { data, cargando, error } = useAsync(obtenerTabla, []);
  const { data: live } = useAsync(obtenerTablaLive, []);
  const { data: fotoCfg } = useAsync(fotoUltimoHabilitada, []);
  const filas = data ?? [];
  const total = filas.length;
  const fotoUltimoOn = fotoCfg ?? false;

  // Posicion EN VIVO por jugador (para el indicador de movimiento). actual=live,
  // anterior=oficial -> muestra el movimiento que provocan los partidos en curso.
  const posLive = new Map<string, number>();
  for (const f of live ?? []) posLive.set(f.jugador_id, f.posicion);

  // Swipe: desliza a los lados para cambiar entre Tabla y Clasica.
  const swipe = useSwipe(
    () => setPestana("clasica"),
    () => setPestana("galeria")
  );

  return (
    <div className="max-w-md mx-auto">
      <header className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold">Tabla de posiciones</h1>
      </header>

      {cargando && (
        <p className="px-4 text-neutral-400 text-sm">Cargando tabla...</p>
      )}
      {error && (
        <p className="px-4 text-red-400 text-sm">
          No se pudo cargar la tabla. Revisa la conexion con Supabase.
        </p>
      )}

      {/* Selector de pestanas */}
      <div className="px-4">
        <div className="flex gap-2 p-1 bg-carbon-soft rounded-full border border-borde">
          <TabBtn activo={pestana === "galeria"} onClick={() => setPestana("galeria")}>
            Tabla
          </TabBtn>
          <TabBtn activo={pestana === "clasica"} onClick={() => setPestana("clasica")}>
            Clásica
          </TabBtn>
        </div>
      </div>

      {pestana === "galeria" ? (
        <div {...swipe}>
          <Galeria filas={filas} total={total} fotoUltimoOn={fotoUltimoOn} posLive={posLive} />
        </div>
      ) : (
        <div {...swipe}>
          <Clasica filas={filas} posLive={posLive} />
        </div>
      )}
    </div>
  );
}

function TabBtn({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-sm font-semibold rounded-full transition-colors ${
        activo ? "bg-oro text-carbon" : "text-neutral-300"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- Pestana 1: galeria de avatares ---------- */
function Galeria({
  filas,
  total,
  fotoUltimoOn,
  posLive,
}: {
  filas: FilaTabla[];
  total: number;
  fotoUltimoOn: boolean;
  posLive: Map<string, number>;
}) {
  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {filas.map((f) => {
        // Foto de fondo SOLO para el ultimo lugar y si el admin la activo.
        const conFoto = fotoUltimoOn && total > 0 && f.posicion === total;
        return (
          <article
            key={f.jugador_id}
            style={conFoto ? { backgroundImage: "url('/ultimo.png')" } : undefined}
            className={`relative overflow-hidden bg-carbon-card border border-borde rounded-2xl ${
              conFoto ? "bg-cover bg-center" : ""
            }`}
          >
            {/* Scrim oscuro para mantener legible el texto sobre la foto (WCAG). */}
            {conFoto && (
              <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
            )}
            <div className="relative z-10 px-4 py-5 flex flex-col items-center text-center">
              <Avatar
                src={avatarPorPosicion(f, total)}
                nombre={f.nombre}
                width={150}
                variante={bordePorPosicion(f.posicion, total)}
              />
              <div className="mt-3 flex items-center gap-1.5">
                <div className="text-2xl font-extrabold text-oro">#{f.posicion}</div>
                <IndicadorMovimiento
                  actual={posLive.get(f.jugador_id)}
                  anterior={f.posicion}
                />
              </div>
              <div className="text-lg font-bold">{f.alias ?? f.nombre}</div>
              <div className="mt-1 text-3xl font-black tabular-nums">{f.puntos}</div>
              <div className="text-xs uppercase tracking-wide text-neutral-400">puntos</div>

              <div className="mt-4 grid grid-cols-3 gap-2 w-full">
                <Stat label="Exactos" valor={f.exactos} />
                <Stat label="Aciertos" valor={f.aciertos} />
                <Stat label="Fallas" valor={f.fallas} />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Stat({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="bg-carbon-soft rounded-xl py-2">
      <div className="text-lg font-bold tabular-nums">{valor}</div>
      <div className="text-[10px] uppercase tracking-wide text-neutral-400">{label}</div>
    </div>
  );
}

/* ---------- Pestana 2: tabla clasica ---------- */
function Clasica({ filas, posLive }: { filas: FilaTabla[]; posLive: Map<string, number> }) {
  const total = filas.length;
  return (
    <div className="px-4 py-4">
      <div className="overflow-hidden rounded-2xl border border-borde">
        <table className="w-full text-sm">
          <thead className="bg-carbon-soft text-neutral-400 text-xs uppercase">
            <tr>
              <th className="py-2.5 px-2 text-left">#</th>
              <th className="py-2.5 px-1 w-5" aria-label="Movimiento" />
              <th className="py-2.5 px-2 text-left">Jugador</th>
              <th className="py-2.5 px-1 text-center">Pts</th>
              <th className="py-2.5 px-1 text-center" title="Exactos">Ex</th>
              <th className="py-2.5 px-1 text-center" title="Aciertos">Ac</th>
              <th className="py-2.5 px-1 text-center" title="Fallas">Fa</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              // Realces sutiles: dorado al puntero (1°), rojo al colista.
              const esLider = f.posicion === 1;
              const esColista = total > 0 && f.posicion === total;
              const realce = esLider
                ? "bg-oro/10"
                : esColista
                ? "bg-rose-500/10"
                : "";
              return (
                <tr key={f.jugador_id} className={`border-t border-borde ${realce}`}>
                  <td className="py-2.5 px-2 font-bold text-oro">{f.posicion}</td>
                  <td className="py-2.5 px-1 text-center">
                    <IndicadorMovimiento
                      actual={posLive.get(f.jugador_id)}
                      anterior={f.posicion}
                    />
                  </td>
                  <td className="py-2.5 px-2">{f.alias ?? f.nombre}</td>
                  <td className="py-2.5 px-1 text-center font-bold tabular-nums">{f.puntos}</td>
                  <td className="py-2.5 px-1 text-center tabular-nums">{f.exactos}</td>
                  <td className="py-2.5 px-1 text-center tabular-nums">{f.aciertos}</td>
                  <td className="py-2.5 px-1 text-center tabular-nums">{f.fallas}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
