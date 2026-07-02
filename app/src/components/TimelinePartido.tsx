// Timeline de eventos del detalle de partido (estilo OneFootball).
// Distribucion: espina vertical central; eventos a izquierda (local) / derecha
// (visita); chips de fase centrados con marcador parcial; sub-pestanas
// "Destacado" (goles y rojas) vs "Todos" (todo). Datos: partido_eventos
// (no requiere cambios de DB ni robots).
import { Fragment, useState } from "react";
import {
  BallIcon,
  YellowCard,
  RedCard,
  FlechasCambio,
  PenalIcon,
  PorteriaIcon,
  PenalTandaIcon,
} from "./Iconos";
import { fmtMinuto } from "../lib/eventos";
import type { EventoPartido, Partido } from "../lib/types";

type SubTab = "destacado" | "todos";

// Minuto efectivo para ordenar (90+8 va por encima de 90+0).
const efectivo = (e: EventoPartido) => e.minuto * 100 + (e.minuto_adicional ?? 0);

// "Clave" = lo que se muestra en la sub-pestana Destacado: goles y rojas.
const esClave = (e: EventoPartido) => e.tipo === "gol" || e.tipo === "roja";

// Icono central segun el tipo de evento.
function IconoEvento({ e }: { e: EventoPartido }) {
  if (e.tipo === "gol") {
    if (e.detalle === "penal") return <PenalIcon className="w-5 h-5" />;
    if (e.detalle === "autogol") return <PorteriaIcon className="w-5 h-5 text-rose-400" />;
    return <BallIcon className="w-5 h-5 text-white" />;
  }
  if (e.tipo === "amarilla") return <YellowCard />;
  if (e.tipo === "roja") return <RedCard />;
  return <FlechasCambio />; // cambio
}

// Bloque de texto del evento (nombre + segunda linea). Se alinea segun el lado.
function TextoEvento({ e, lado }: { e: EventoPartido; lado: "local" | "visita" }) {
  const align = lado === "local" ? "text-right" : "text-left";
  const esGol = e.tipo === "gol";
  return (
    <div className={`leading-tight min-w-0 ${align}`}>
      <div className={esGol ? "font-bold text-white" : "text-neutral-100"}>
        {e.tipo === "cambio" ? (
          <span className="text-emerald-400">{e.jugador}</span>
        ) : (
          e.jugador
        )}
        {esGol && e.detalle === "autogol" && (
          <span className="text-xs font-normal text-rose-400"> (e/c)</span>
        )}
      </div>
      {/* Segunda linea: asistente (gol) o quien sale (cambio). */}
      {e.asistencia && (
        <div className="text-xs text-neutral-400">{e.asistencia}</div>
      )}
    </div>
  );
}

// Una fila de evento: local a la izquierda, visita a la derecha, minuto centrado.
function FilaEvento({ e }: { e: EventoPartido }) {
  const local = e.equipo === "local";
  // El minuto del penal va en rojo (igual que la referencia).
  const minColor = e.detalle === "penal" ? "text-rose-500" : "text-neutral-200";
  return (
    <li className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2.5">
      {/* Zona local (izquierda) */}
      <div className="flex items-center justify-end gap-2 min-w-0">
        {local && <TextoEvento e={e} lado="local" />}
        {local && <span className="shrink-0">{<IconoEvento e={e} />}</span>}
      </div>
      {/* Minuto centrado sobre la espina (el fondo tapa la linea) */}
      <div className="relative z-10 min-w-[2.75rem] text-center">
        <span className={`bg-carbon px-1 text-sm font-semibold tabular-nums ${minColor}`}>
          {fmtMinuto(e)}
        </span>
      </div>
      {/* Zona visita (derecha) */}
      <div className="flex items-center justify-start gap-2 min-w-0">
        {!local && <span className="shrink-0">{<IconoEvento e={e} />}</span>}
        {!local && <TextoEvento e={e} lado="visita" />}
      </div>
    </li>
  );
}

// Chip de fase centrado en la espina (marcador parcial).
function ChipFase({ texto }: { texto: string }) {
  return (
    <li className="relative z-10 flex justify-center py-2">
      <span className="rounded-full border border-borde bg-carbon-soft px-4 py-1.5 text-sm font-medium text-neutral-200">
        {texto}
      </span>
    </li>
  );
}

// Bloque de la TANDA DE PENALES (estilo 365 Scores): cabecera "Penales X - Y" y
// una fila por ronda con el numero al centro, local (izq) y visita (der). Cada
// penal muestra balon con check verde (convertido) o X roja (fallado).
function BloqueTanda({
  penales,
  marcador,
}: {
  penales: EventoPartido[];
  marcador: string;
}) {
  const porOrden = (a: EventoPartido, b: EventoPartido) => a.minuto - b.minuto;
  const local = penales.filter((e) => e.equipo === "local").sort(porOrden);
  const visita = penales.filter((e) => e.equipo === "visita").sort(porOrden);
  const rondas = Math.max(local.length, visita.length);

  const Penal = ({ e, lado }: { e?: EventoPartido; lado: "local" | "visita" }) => {
    if (!e) return <div />;
    const conv = e.detalle === "convertido";
    const align = lado === "local" ? "justify-end text-right" : "justify-start text-left";
    const nombre = (
      <span className={conv ? "text-neutral-100" : "text-neutral-500 line-through"}>
        {e.jugador}
      </span>
    );
    return (
      <div className={`flex items-center gap-2 min-w-0 ${align}`}>
        {lado === "local" && nombre}
        <span className="shrink-0">
          <PenalTandaIcon convertido={conv} />
        </span>
        {lado === "visita" && nombre}
      </div>
    );
  };

  const filas: React.ReactNode[] = [];
  for (let i = rondas - 1; i >= 0; i--) {
    filas.push(
      <li key={`t${i}`} className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2">
        <Penal e={local[i]} lado="local" />
        <div className="relative z-10 flex justify-center">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-oro text-sm font-bold text-black tabular-nums">
            {i + 1}
          </span>
        </div>
        <Penal e={visita[i]} lado="visita" />
      </li>
    );
  }

  return (
    <>
      <ChipFase texto={`Penales ${marcador}`} />
      {filas}
    </>
  );
}

export default function TimelinePartido({
  partido,
  eventos,
}: {
  partido: Partido;
  eventos: EventoPartido[];
}) {
  const [tab, setTab] = useState<SubTab>("destacado");

  if (eventos.length === 0) {
    return (
      <div className="text-center text-neutral-400 py-10">
        Sin acontecimientos todavia.
      </div>
    );
  }

  // Marcador final: autoritativo desde el partido (goles_local/visita = 90').
  const gl = partido.goles_local ?? 0;
  const gv = partido.goles_visita ?? 0;

  // Separar la tanda de penales del flujo normal de eventos.
  const tanda = eventos.filter((e) => e.tipo === "penal_tanda");
  const normales = eventos.filter((e) => e.tipo !== "penal_tanda");

  // Marcador al entretiempo: goles del primer tiempo (minuto <= 45) por lado
  // acreditado (e.equipo ya viene como el lado que sumo, incluido autogol).
  const primerTiempo = normales.filter((e) => e.tipo === "gol" && e.minuto <= 45);
  const htL = primerTiempo.filter((e) => e.equipo === "local").length;
  const htV = primerTiempo.filter((e) => e.equipo === "visita").length;

  const hayPrimera = normales.some((e) => e.minuto <= 45);
  const haySegunda = normales.some((e) => e.minuto > 45);
  const mostrarHT =
    hayPrimera &&
    (haySegunda || partido.estado === "final" || partido.estado === "entretiempo");

  // Definicion de eliminatoria: hubo alargue y/o tanda de penales.
  const huboDefinicion =
    tanda.length > 0 ||
    partido.penales_local != null ||
    partido.alargue_local != null ||
    partido.alargue_visita != null;
  // Marcador acumulado tras el suplementario (90' + alargue).
  const supL = gl + (partido.alargue_local ?? 0);
  const supV = gv + (partido.alargue_visita ?? 0);
  const marcadorTanda = `${partido.penales_local ?? 0} - ${partido.penales_visita ?? 0}`;

  // Eventos visibles segun la sub-pestana, ordenados (lo mas tarde, arriba).
  const visibles = (tab === "destacado" ? normales.filter(esClave) : normales).sort(
    (a, b) => efectivo(b) - efectivo(a)
  );

  // Interleaved (de arriba hacia abajo, lo mas reciente primero):
  //   tanda -> suplementario -> fin de 90 -> eventos (con Entretiempo).
  const items: { key: string; node: React.ReactNode }[] = [];
  if (tanda.length > 0) {
    items.push({
      key: "tanda",
      node: <BloqueTanda penales={tanda} marcador={marcadorTanda} />,
    });
  }
  if (huboDefinicion) {
    items.push({
      key: "sup",
      node: <ChipFase texto={`Suplementario ${supL} - ${supV}`} />,
    });
  }
  if (partido.estado === "final") {
    items.push({
      key: "final",
      node: <ChipFase texto={`Fin de los 90 minutos ${gl} - ${gv}`} />,
    });
  }
  let htPuesto = false;
  for (const e of visibles) {
    if (!htPuesto && mostrarHT && e.minuto <= 45) {
      items.push({
        key: "ht",
        node: <ChipFase texto={`Entretiempo ${htL} - ${htV}`} />,
      });
      htPuesto = true;
    }
    items.push({ key: e.id, node: <FilaEvento e={e} /> });
  }
  // Si quedaron eventos pero el chip de HT no se puso (todos 2do tiempo) y
  // corresponde mostrarlo, lo dejamos al final.
  if (!htPuesto && mostrarHT && visibles.length > 0) {
    items.push({
      key: "ht",
      node: <ChipFase texto={`Entretiempo ${htL} - ${htV}`} />,
    });
  }

  return (
    <div>
      {/* Sub-pestanas Destacado / Todos */}
      <div className="grid grid-cols-2 mb-2 border-b border-borde">
        <SubBtn activo={tab === "destacado"} onClick={() => setTab("destacado")}>
          Destacado
        </SubBtn>
        <SubBtn activo={tab === "todos"} onClick={() => setTab("todos")}>
          Todos
        </SubBtn>
      </div>

      {visibles.length === 0 && tanda.length === 0 ? (
        <div className="text-center text-neutral-400 py-10">
          Sin goles ni expulsiones.
        </div>
      ) : (
        <div className="relative px-1 py-2">
          {/* Espina vertical central */}
          <div
            className="pointer-events-none absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-borde"
            aria-hidden="true"
          />
          <ul>
            {items.map((it) => (
              <Fragment key={it.key}>{it.node}</Fragment>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SubBtn({
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
      className={`pb-2 text-center text-sm font-semibold transition-colors ${
        activo
          ? "text-white border-b-2 border-oro"
          : "text-neutral-400 border-b-2 border-transparent"
      }`}
    >
      {children}
    </button>
  );
}
