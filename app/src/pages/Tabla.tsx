import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Avatar from "../components/Avatar";
import IndicadorMovimiento from "../components/IndicadorMovimiento";
import PrediccionesTodos from "../components/PrediccionesTodos";
import { avatarPorPosicion, bordePorPosicion } from "../lib/avatares";
import { obtenerTabla, obtenerTablaLive, obtenerPosicionesBase, fotoUltimoHabilitada, fotoPrimeroHabilitada } from "../lib/data";
import { useAsync } from "../lib/useAsync";
import { useSwipe } from "../lib/useSwipe";
import type { FilaTabla } from "../lib/types";

type Pestana = "galeria" | "clasica" | "predicciones";

export default function Tabla() {
  const navigate = useNavigate();
  const [pestana, setPestana] = useState<Pestana>("galeria");
  const { data, cargando, error } = useAsync(obtenerTabla, []);
  const { data: live } = useAsync(obtenerTablaLive, []);
  const { data: posBase } = useAsync(obtenerPosicionesBase, []);
  const { data: fotoCfg } = useAsync(fotoUltimoHabilitada, []);
  const { data: fotoCfgPrimero } = useAsync(fotoPrimeroHabilitada, []);
  const filas = data ?? [];
  const total = filas.length;
  const fotoUltimoOn = fotoCfg ?? false;
  const fotoPrimeroOn = fotoCfgPrimero ?? false;

  // Movimiento de posicion (flechas que PERSISTEN):
  //   actual   = posicion AHORA (en vivo si hay; si no, la oficial).
  //   anterior = posicion al CIERRE DE LA JORNADA ANTERIOR (vista _base).
  // Asi suben/bajan haya o no partido en curso. Sin base -> usa la oficial
  // (queda gris), p.ej. durante la Fecha 1 que no tiene jornada previa.
  // Ambos mapas se pasan a Galeria/Clasica (ver helper movProps).
  const posLive = new Map<string, number>();
  for (const f of live ?? []) posLive.set(f.jugador_id, f.posicion);
  const posBaseMap = posBase ?? new Map<string, number>();

  // Swipe: desliza a los lados para cambiar entre Tabla y Clasica.
  const swipe = useSwipe(
    () => setPestana("clasica"),
    () => setPestana("galeria")
  );

  // Tocar un participante abre sus predicciones (solo lectura). El nombre viaja
  // por state para mostrarlo en el header sin un fetch extra.
  const irAPredicciones = (f: FilaTabla) =>
    navigate(`/mis-predicciones/${f.jugador_id}`, {
      state: { nombre: f.alias ?? f.nombre },
    });

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
          <TabBtn activo={pestana === "predicciones"} onClick={() => setPestana("predicciones")}>
            Predicciones
          </TabBtn>
        </div>
      </div>

      {pestana === "galeria" && (
        <div {...swipe}>
          <Galeria filas={filas} total={total} fotoUltimoOn={fotoUltimoOn} fotoPrimeroOn={fotoPrimeroOn} posLive={posLive} posBase={posBaseMap} onSelect={irAPredicciones} />
        </div>
      )}
      {pestana === "clasica" && (
        <div {...swipe}>
          <Clasica filas={filas} posLive={posLive} posBase={posBaseMap} onSelect={irAPredicciones} />
        </div>
      )}
      {pestana === "predicciones" && <PrediccionesTodos />}
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
// Props del indicador de movimiento para una fila (DRY: lo usan galeria y
// clasica). actual = en vivo si hay, si no la oficial; anterior = base.
function movProps(
  f: FilaTabla,
  posLive: Map<string, number>,
  posBase: Map<string, number>
): { actual: number; anterior: number } {
  return {
    actual: posLive.get(f.jugador_id) ?? f.posicion,
    anterior: posBase.get(f.jugador_id) ?? f.posicion,
  };
}

function Galeria({
  filas,
  total,
  fotoUltimoOn,
  fotoPrimeroOn,
  posLive,
  posBase,
  onSelect,
}: {
  filas: FilaTabla[];
  total: number;
  fotoUltimoOn: boolean;
  fotoPrimeroOn: boolean;
  posLive: Map<string, number>;
  posBase: Map<string, number>;
  onSelect: (f: FilaTabla) => void;
}) {
  return (
    <div className="px-4 py-4 flex flex-col gap-4">
      {filas.map((f) => {
        // Foto de fondo para el ultimo (pos = total) o el primero (pos = 1),
        // cada uno con su propio toggle de admin.
        const conFotoUltimo = fotoUltimoOn && total > 0 && f.posicion === total;
        const conFotoPrimero = fotoPrimeroOn && f.posicion === 1;
        const conFoto = conFotoUltimo || conFotoPrimero;
        const fondo = conFotoPrimero ? "url('/primero.png')" : "url('/ultimo.png')";
        return (
          <article
            key={f.jugador_id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(f)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(f);
              }
            }}
            aria-label={`Ver predicciones de ${f.alias ?? f.nombre}`}
            style={conFoto ? { backgroundImage: fondo } : undefined}
            className={`relative overflow-hidden bg-carbon-card border border-borde rounded-2xl cursor-pointer active:scale-[0.99] transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-oro ${
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
                <IndicadorMovimiento {...movProps(f, posLive, posBase)} />
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
function Clasica({ filas, posLive, posBase, onSelect }: { filas: FilaTabla[]; posLive: Map<string, number>; posBase: Map<string, number>; onSelect: (f: FilaTabla) => void }) {
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
                <tr
                  key={f.jugador_id}
                  onClick={() => onSelect(f)}
                  title={`Ver predicciones de ${f.alias ?? f.nombre}`}
                  className={`border-t border-borde cursor-pointer active:bg-white/5 ${realce}`}
                >
                  <td className="py-2.5 px-2 font-bold text-oro">{f.posicion}</td>
                  <td className="py-2.5 px-1 text-center">
                    <IndicadorMovimiento {...movProps(f, posLive, posBase)} />
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
