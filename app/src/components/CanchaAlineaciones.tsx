// Cancha de alineaciones: dibuja la formacion con el 11 inicial de cada equipo
// enfrentados (visita arriba, local abajo) + la banca en 2 columnas. Highlightly
// NO trae foto de jugador -> cada ficha es un dorsal (numero) + apellido, pintado
// con el COLOR CARACTERISTICO de la seleccion (lib/coloresSeleccion).
import type { Alineaciones, AlineacionEquipo, JugadorAlineacion } from "../lib/types";
import { colorSeleccion, type ColorSeleccion } from "../lib/coloresSeleccion";

// Apellido "lindo" para la ficha: "A. Al Amri" -> "Al Amri"; "Lionel Messi" -> "Messi".
function apellido(nombre: string): string {
  const n = nombre.trim();
  const m = n.match(/^[A-Z]\.\s+(.*)$/); // inicial + apellido (formato Highlightly)
  if (m) return m[1];
  const partes = n.split(/\s+/);
  return partes.length > 1 ? partes.slice(1).join(" ") : n;
}

// Estilo inline de una ficha segun el color de la seleccion (colores arbitrarios).
function estiloFicha(color: ColorSeleccion) {
  return {
    backgroundColor: color.bg,
    color: color.text,
    borderColor: color.ring ?? color.bg,
  };
}

function Ficha({ j, color }: { j: JugadorAlineacion; color: ColorSeleccion }) {
  return (
    <div className="flex flex-col items-center gap-1 w-14">
      <div
        className="w-9 h-9 rounded-full grid place-items-center text-sm font-bold tabular-nums border-2 shadow"
        style={estiloFicha(color)}
      >
        {j.numero ?? "?"}
      </div>
      <span className="text-[10px] leading-tight text-center text-white/90 drop-shadow">
        {apellido(j.nombre)}
      </span>
    </div>
  );
}

function Linea({ jugadores, color }: { jugadores: JugadorAlineacion[]; color: ColorSeleccion }) {
  return (
    <div className="flex-1 flex items-center justify-around px-1">
      {jugadores.map((j, i) => (
        <Ficha key={j.id ?? `${j.nombre}-${i}`} j={j} color={color} />
      ))}
    </div>
  );
}

// Mitad de cancha de un equipo. invertido=true => arco arriba (visita): lineas
// en orden GK..FWD. invertido=false (local) => arco abajo: lineas FWD..GK.
function MitadEquipo({
  equipo,
  color,
  invertido,
}: {
  equipo: AlineacionEquipo;
  color: ColorSeleccion;
  invertido: boolean;
}) {
  const lineas = invertido ? equipo.titulares : [...equipo.titulares].reverse();
  return (
    <div className="flex-1 flex flex-col py-2">
      {lineas.map((linea, i) => (
        <Linea key={i} jugadores={linea} color={color} />
      ))}
    </div>
  );
}

// Una columna de suplentes (banca). lado derecho => alineado a la derecha.
function ColumnaBanca({
  titulo,
  suplentes,
  color,
  derecha,
}: {
  titulo: string;
  suplentes: JugadorAlineacion[];
  color: ColorSeleccion;
  derecha: boolean;
}) {
  if (!suplentes?.length) return <div />;
  return (
    <div className={`flex flex-col gap-1 ${derecha ? "items-end text-right" : "items-start text-left"}`}>
      <div className="text-xs font-semibold text-neutral-400 mb-0.5">{titulo}</div>
      {suplentes.map((j, i) => (
        <div
          key={j.id ?? `${j.nombre}-${i}`}
          className={`flex items-center gap-1.5 ${derecha ? "flex-row-reverse" : ""}`}
        >
          <span
            className="inline-grid place-items-center w-5 h-5 rounded-full text-[10px] font-bold tabular-nums border"
            style={estiloFicha(color)}
          >
            {j.numero ?? "-"}
          </span>
          <span className="text-xs text-neutral-300 leading-tight">{apellido(j.nombre)}</span>
        </div>
      ))}
    </div>
  );
}

export default function CanchaAlineaciones({
  alineaciones,
  equipoLocal,
  equipoVisita,
  paisLocal,
  paisVisita,
}: {
  alineaciones: Alineaciones;
  equipoLocal: string;
  equipoVisita: string;
  paisLocal: string;
  paisVisita: string;
}) {
  const local = alineaciones.local;
  const visita = alineaciones.visita;
  const colorLocal = colorSeleccion(paisLocal, "local");
  const colorVisita = colorSeleccion(paisVisita, "visita");

  if (!local && !visita) {
    return (
      <div className="text-center text-neutral-400 py-10">
        Las alineaciones aparecen ~1 hora antes del partido.
      </div>
    );
  }

  return (
    <div>
      {/* Cabecera con formaciones */}
      <div className="flex items-center justify-between mb-2 text-sm">
        <span className="font-semibold text-white">
          {equipoVisita} <span className="text-neutral-400">{visita?.formacion ?? ""}</span>
        </span>
        <span className="font-semibold text-white text-right">
          <span className="text-neutral-400">{local?.formacion ?? ""}</span> {equipoLocal}
        </span>
      </div>

      {/* Cancha */}
      <div className="relative rounded-2xl overflow-hidden border border-borde bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-800 min-h-[460px] flex flex-col">
        {/* Lineas de cancha (decorativas) */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-0 right-0 top-1/2 h-px bg-white/20" />
          <div className="absolute left-1/2 top-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
          <div className="absolute left-1/2 top-0 w-40 h-14 -translate-x-1/2 border-x border-b border-white/20" />
          <div className="absolute left-1/2 bottom-0 w-40 h-14 -translate-x-1/2 border-x border-t border-white/20" />
        </div>

        {/* Visita arriba (arco arriba) */}
        {visita ? (
          <MitadEquipo equipo={visita} color={colorVisita} invertido />
        ) : (
          <div className="flex-1 grid place-items-center text-white/60 text-sm">
            Sin alineacion de {equipoVisita}
          </div>
        )}

        {/* Local abajo (arco abajo) */}
        {local ? (
          <MitadEquipo equipo={local} color={colorLocal} invertido={false} />
        ) : (
          <div className="flex-1 grid place-items-center text-white/60 text-sm">
            Sin alineacion de {equipoLocal}
          </div>
        )}
      </div>

      {/* Bancas en 2 columnas: visita a la izquierda, local a la derecha */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <ColumnaBanca
          titulo={`Suplentes ${equipoVisita}`}
          suplentes={visita?.suplentes ?? []}
          color={colorVisita}
          derecha={false}
        />
        <ColumnaBanca
          titulo={`Suplentes ${equipoLocal}`}
          suplentes={local?.suplentes ?? []}
          color={colorLocal}
          derecha
        />
      </div>
    </div>
  );
}
