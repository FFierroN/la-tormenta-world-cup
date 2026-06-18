// Cancha de alineaciones: dibuja la formacion con el 11 inicial de cada equipo
// enfrentados (visita arriba, local abajo) + la banca. Highlightly NO trae foto
// de jugador, asi que cada ficha es un dorsal (numero) + apellido.
// Componente presentacional puro: recibe ya las alineaciones normalizadas.
import type { Alineaciones, AlineacionEquipo, JugadorAlineacion } from "../lib/types";

// Apellido "lindo" para la ficha: "A. Al Amri" -> "Al Amri"; "Lionel Messi" -> "Messi".
function apellido(nombre: string): string {
  const n = nombre.trim();
  const m = n.match(/^[A-Z]\.\s+(.*)$/); // inicial + apellido (formato Highlightly)
  if (m) return m[1];
  const partes = n.split(/\s+/);
  return partes.length > 1 ? partes.slice(1).join(" ") : n;
}

function Ficha({ j, color }: { j: JugadorAlineacion; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 w-14">
      <div
        className={`w-9 h-9 rounded-full grid place-items-center text-sm font-bold tabular-nums border-2 shadow ${color}`}
      >
        {j.numero ?? "?"}
      </div>
      <span className="text-[10px] leading-tight text-center text-white/90 drop-shadow">
        {apellido(j.nombre)}
      </span>
    </div>
  );
}

function Linea({ jugadores, color }: { jugadores: JugadorAlineacion[]; color: string }) {
  return (
    <div className="flex-1 flex items-center justify-around px-1">
      {jugadores.map((j, i) => (
        <Ficha key={j.id ?? `${j.nombre}-${i}`} j={j} color={color} />
      ))}
    </div>
  );
}

// Mitad de cancha de un equipo. invertido=true => el arco va arriba (visita):
// las lineas se muestran en orden GK..FWD (de arriba hacia el centro).
// invertido=false (local) => arco abajo: lineas FWD..GK (centro hacia abajo).
function MitadEquipo({
  equipo,
  color,
  invertido,
}: {
  equipo: AlineacionEquipo;
  color: string;
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

function Banca({ equipo, titulo }: { equipo: AlineacionEquipo; titulo: string }) {
  if (!equipo.suplentes?.length) return null;
  return (
    <div className="mt-3">
      <div className="text-xs font-semibold text-neutral-400 mb-1.5">{titulo}</div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {equipo.suplentes.map((j, i) => (
          <span key={j.id ?? `${j.nombre}-${i}`} className="text-xs text-neutral-300">
            <span className="tabular-nums text-neutral-500">{j.numero ?? "-"}</span>{" "}
            {apellido(j.nombre)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function CanchaAlineaciones({
  alineaciones,
  equipoLocal,
  equipoVisita,
}: {
  alineaciones: Alineaciones;
  equipoLocal: string;
  equipoVisita: string;
}) {
  const local = alineaciones.local;
  const visita = alineaciones.visita;

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
          {/* linea media */}
          <div className="absolute left-0 right-0 top-1/2 h-px bg-white/20" />
          {/* circulo central */}
          <div className="absolute left-1/2 top-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
          {/* areas */}
          <div className="absolute left-1/2 top-0 w-40 h-14 -translate-x-1/2 border-x border-b border-white/20" />
          <div className="absolute left-1/2 bottom-0 w-40 h-14 -translate-x-1/2 border-x border-t border-white/20" />
        </div>

        {/* Visita arriba (arco arriba) */}
        {visita ? (
          <MitadEquipo equipo={visita} color="bg-white text-emerald-900 border-white" invertido />
        ) : (
          <div className="flex-1 grid place-items-center text-white/60 text-sm">
            Sin alineacion de {equipoVisita}
          </div>
        )}

        {/* Local abajo (arco abajo) */}
        {local ? (
          <MitadEquipo equipo={local} color="bg-oro text-carbon border-oro" invertido={false} />
        ) : (
          <div className="flex-1 grid place-items-center text-white/60 text-sm">
            Sin alineacion de {equipoLocal}
          </div>
        )}
      </div>

      {/* Bancas */}
      {visita && <Banca equipo={visita} titulo={`Suplentes ${equipoVisita}`} />}
      {local && <Banca equipo={local} titulo={`Suplentes ${equipoLocal}`} />}
    </div>
  );
}
