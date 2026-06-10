// Componente visual del CUADRO de una fase (llaves). Solo presentacion:
// tarjetas "Partido N" con sus dos equipos, fecha y sede, divididas en
// Lado Izquierdo / Derecho y con conectores decorativos entre pares.
import Flag from "./Flag";
import { fmtFechaHora } from "../lib/fechas";
import { armarCuadro, enPares, type LlavePartido } from "../lib/llaves";
import type { Partido } from "../lib/types";

export default function Llave({ partidos }: { partidos: Partido[] }) {
  if (partidos.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-neutral-400 text-sm">
        Aun no hay partidos cargados para esta fase.
      </p>
    );
  }

  const { izquierda, derecha } = armarCuadro(partidos);
  // El "cuadro" (lados Izq/Der + conectores) solo tiene sentido con 4+ partidos
  // (Dieciseisavos, Octavos, Cuartos). Semis/Final se muestran como lista simple.
  const conCuadro = partidos.length >= 4;

  if (!conCuadro) {
    const todos = [...izquierda, ...derecha];
    return (
      <div className="px-4 py-4 flex flex-col gap-3">
        {todos.map((lp) => (
          <TarjetaLlave key={lp.partido.id} lp={lp} />
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-6">
      <SeparadorLado texto="Lado Izquierdo del cuadro" />
      <LadoCuadro items={izquierda} />
      <SeparadorLado texto="Lado Derecho del cuadro" />
      <LadoCuadro items={derecha} />
    </div>
  );
}

function SeparadorLado({ texto }: { texto: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-borde" />
      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
        {texto}
      </span>
      <span className="h-px flex-1 bg-borde" />
    </div>
  );
}

function LadoCuadro({ items }: { items: LlavePartido[] }) {
  const pares = enPares(items);
  return (
    <div className="flex flex-col gap-5 pr-6">
      {pares.map((par, i) => (
        <div key={i} className="relative flex flex-col gap-3">
          {par.map((lp) => (
            <TarjetaLlave key={lp.partido.id} lp={lp} />
          ))}
          {/* Conector decorativo: une el par hacia la fase siguiente. */}
          {par.length === 2 && (
            <>
              <span
                aria-hidden
                className="pointer-events-none absolute -right-6 top-1/4 bottom-1/4 w-6 rounded-r-lg border-r-2 border-t-2 border-b-2 border-oro/40"
              />
              <span
                aria-hidden
                className="pointer-events-none absolute -right-6 top-1/2 w-3 translate-x-full border-t-2 border-oro/40"
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function TarjetaLlave({ lp }: { lp: LlavePartido }) {
  const { n, partido: p } = lp;
  return (
    <article className="bg-carbon-card border border-borde rounded-2xl p-4">
      <header className="flex items-center justify-between gap-2 mb-3">
        <span className="text-sm font-bold">Partido {n}</span>
        <span className="text-[11px] text-neutral-400 text-right">
          {fmtFechaHora(p.fecha)}
          {p.ciudad ? ` \u00b7 ${p.ciudad}` : ""}
        </span>
      </header>
      <div className="flex items-stretch gap-2">
        <Equipo nombre={p.equipo_local} pais={p.pais_local} />
        <div className="flex items-center text-xs font-bold text-neutral-400">
          VS
        </div>
        <Equipo nombre={p.equipo_visita} pais={p.pais_visita} />
      </div>
    </article>
  );
}

function Equipo({ nombre, pais }: { nombre: string; pais: string }) {
  const porDefinir = nombre === "Por definir";
  return (
    <div
      className={`flex-1 flex flex-col items-center gap-2 rounded-xl py-3 px-2 border ${
        porDefinir ? "border-dashed border-borde" : "border-borde"
      }`}
    >
      <Flag code={pais} size={40} nombre={nombre} />
      <span
        className={`text-center text-sm leading-tight ${
          porDefinir ? "text-neutral-500" : ""
        }`}
      >
        {nombre}
      </span>
    </div>
  );
}
