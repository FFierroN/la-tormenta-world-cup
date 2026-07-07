// Cancha de alineaciones: dibuja la formacion con el 11 inicial de cada equipo
// enfrentados (visita arriba, local abajo) + la banca en 2 columnas. Highlightly
// NO trae foto de jugador -> cada ficha es un dorsal (numero) + apellido, pintado
// con el COLOR CARACTERISTICO de la seleccion (lib/coloresSeleccion).
import type { Alineaciones, AlineacionEquipo, EventoPartido, JugadorAlineacion } from "../lib/types";
import { colorSeleccion, type ColorSeleccion } from "../lib/coloresSeleccion";
import { actividadDe, type ActividadJugador } from "../lib/actividadJugador";
import {
  BallIcon,
  ShoeIcon,
  YellowCard,
  RedCard,
  PorteriaIcon,
  FlechaEntra,
  FlechaSale,
} from "./Iconos";

// Apellido "lindo" para la ficha: "A. Al Amri" -> "Al Amri"; "Lionel Messi" -> "Messi".
function apellido(nombre: string): string {
  const n = nombre.trim();
  const m = n.match(/^[A-Z]\.\s+(.*)$/); // inicial + apellido (formato Highlightly)
  if (m) return m[1];
  const partes = n.split(/\s+/);
  return partes.length > 1 ? partes.slice(1).join(" ") : n;
}

// Estilo base de una ficha segun el color de la seleccion (colores arbitrarios).
// Le sumamos un brillo radial arriba para dar volumen (efecto "boton").
function baseFicha(color: ColorSeleccion) {
  return {
    backgroundColor: color.bg,
    backgroundImage:
      "radial-gradient(circle at 50% 30%, rgba(255,255,255,.38), rgba(255,255,255,0) 62%)",
    color: color.text,
    borderColor: color.ring ?? color.bg,
  };
}

// Profundidad: sombra exterior (despega del fondo) + brillo y sombra internos.
const SOMBRA_FICHA =
  "0 3px 7px rgba(0,0,0,.55), inset 0 1px 1px rgba(255,255,255,.35), inset 0 -3px 4px rgba(0,0,0,.22)";
const SOMBRA_MINI =
  "0 1px 3px rgba(0,0,0,.5), inset 0 1px 1px rgba(255,255,255,.3)";

// Fila compacta de iconos de actividad (goles, asist, tarjetas, entro/salio).
// esTitular ajusta las flechas para descartar combinaciones IMPOSIBLES que el
// match difuso de nombres (apellidos parecidos) puede inventar:
//   - un TITULAR empezo en cancha -> jamas "entro" (solo puede "salir").
//   - un SUPLENTE solo pudo "salir" si antes "entro" (no sale quien no entro).
// Asi un suplente que entro y luego fue reemplazado SI muestra ambas (caso real),
// pero se eliminan las dobles flechas fantasma por colision de apellidos.
function IconosActividad({
  act,
  esTitular,
}: {
  act: ActividadJugador;
  esTitular: boolean;
}) {
  const entro = act.entro && !esTitular;
  const salio = act.salio && (esTitular || act.entro);
  const hayAlgo =
    act.goles || act.autogoles || act.asistencias || act.amarilla || act.roja || entro || salio;
  if (!hayAlgo) return null;
  return (
    <div className="flex items-center justify-center gap-0.5 flex-wrap">
      {act.goles > 0 && (
        <span className="flex items-center text-white">
          <BallIcon className="w-3 h-3 text-white" />
          {act.goles > 1 && <span className="text-[9px] font-bold ml-px">x{act.goles}</span>}
        </span>
      )}
      {act.autogoles > 0 && <PorteriaIcon className="w-3 h-3 text-rose-400" />}
      {act.asistencias > 0 && (
        <span className="flex items-center text-oro">
          <ShoeIcon className="w-3 h-3 text-oro" />
          {act.asistencias > 1 && <span className="text-[9px] font-bold ml-px">x{act.asistencias}</span>}
        </span>
      )}
      {act.amarilla && <YellowCard />}
      {act.roja && <RedCard />}
      {entro && <FlechaEntra className="w-3 h-3" />}
      {salio && <FlechaSale className="w-3 h-3" />}
    </div>
  );
}

function Ficha({
  j,
  color,
  eventosEquipo,
}: {
  j: JugadorAlineacion;
  color: ColorSeleccion;
  eventosEquipo: EventoPartido[];
}) {
  const act = actividadDe(j.nombre, eventosEquipo);
  return (
    <div className="flex flex-col items-center gap-1 w-14">
      <div
        className="w-9 h-9 rounded-full grid place-items-center text-sm font-bold tabular-nums border-[3px]"
        style={{ ...baseFicha(color), boxShadow: SOMBRA_FICHA }}
      >
        {j.numero ?? "?"}
      </div>
      <span className="text-[10px] leading-tight text-center text-white/90 drop-shadow">
        {apellido(j.nombre)}
      </span>
      <IconosActividad act={act} esTitular />
    </div>
  );
}

function Linea({
  jugadores,
  color,
  eventosEquipo,
}: {
  jugadores: JugadorAlineacion[];
  color: ColorSeleccion;
  eventosEquipo: EventoPartido[];
}) {
  return (
    <div className="flex-1 flex items-center justify-around px-1">
      {jugadores.map((j, i) => (
        <Ficha key={j.id ?? `${j.nombre}-${i}`} j={j} color={color} eventosEquipo={eventosEquipo} />
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
  eventosEquipo,
}: {
  equipo: AlineacionEquipo;
  color: ColorSeleccion;
  invertido: boolean;
  eventosEquipo: EventoPartido[];
}) {
  const lineas = invertido ? equipo.titulares : [...equipo.titulares].reverse();
  return (
    <div className="flex-1 flex flex-col py-2">
      {lineas.map((linea, i) => (
        <Linea key={i} jugadores={linea} color={color} eventosEquipo={eventosEquipo} />
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
  eventosEquipo,
}: {
  titulo: string;
  suplentes: JugadorAlineacion[];
  color: ColorSeleccion;
  derecha: boolean;
  eventosEquipo: EventoPartido[];
}) {
  if (!suplentes?.length) return <div />;
  return (
    <div className={`flex flex-col gap-1 ${derecha ? "items-end text-right" : "items-start text-left"}`}>
      <div className="text-xs font-semibold text-neutral-400 mb-0.5">{titulo}</div>
      {suplentes.map((j, i) => {
        const act = actividadDe(j.nombre, eventosEquipo);
        return (
          <div
            key={j.id ?? `${j.nombre}-${i}`}
            className={`flex items-center gap-1.5 ${derecha ? "flex-row-reverse" : ""}`}
          >
            <span
              className="inline-grid place-items-center w-5 h-5 rounded-full text-[10px] font-bold tabular-nums border"
              style={{ ...baseFicha(color), boxShadow: SOMBRA_MINI }}
            >
              {j.numero ?? "-"}
            </span>
            <span className="text-xs text-neutral-300 leading-tight">{apellido(j.nombre)}</span>
            <IconosActividad act={act} esTitular={false} />
          </div>
        );
      })}
    </div>
  );
}

export default function CanchaAlineaciones({
  alineaciones,
  equipoLocal,
  equipoVisita,
  paisLocal,
  paisVisita,
  eventos,
}: {
  alineaciones: Alineaciones;
  equipoLocal: string;
  equipoVisita: string;
  paisLocal: string;
  paisVisita: string;
  eventos: EventoPartido[];
}) {
  const local = alineaciones.local;
  const visita = alineaciones.visita;
  const colorLocal = colorSeleccion(paisLocal, "local");
  const colorVisita = colorSeleccion(paisVisita, "visita");
  const evLocal = eventos.filter((e) => e.equipo === "local");
  const evVisita = eventos.filter((e) => e.equipo === "visita");

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

      {/* Cancha (mismo tono que el fondo de la app, con un leve degradado) */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-borde bg-gradient-to-b from-carbon-card via-carbon to-carbon-card min-h-[460px] flex flex-col">
        {/* Lineas de cancha (blancas) */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/45" />
          <div className="absolute left-1/2 top-1/2 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/45" />
          <div className="absolute left-1/2 top-0 w-40 h-14 -translate-x-1/2 border-x-2 border-b-2 border-white/45" />
          <div className="absolute left-1/2 bottom-0 w-40 h-14 -translate-x-1/2 border-x-2 border-t-2 border-white/45" />
        </div>

        {/* Visita arriba (arco arriba) */}
        {visita ? (
          <MitadEquipo equipo={visita} color={colorVisita} invertido eventosEquipo={evVisita} />
        ) : (
          <div className="flex-1 grid place-items-center text-white/60 text-sm">
            Sin alineacion de {equipoVisita}
          </div>
        )}

        {/* Local abajo (arco abajo) */}
        {local ? (
          <MitadEquipo equipo={local} color={colorLocal} invertido={false} eventosEquipo={evLocal} />
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
          eventosEquipo={evVisita}
        />
        <ColumnaBanca
          titulo={`Suplentes ${equipoLocal}`}
          suplentes={local?.suplentes ?? []}
          color={colorLocal}
          derecha
          eventosEquipo={evLocal}
        />
      </div>
    </div>
  );
}
