// Tarjeta de partido estilo WC26 (rediseno piloto) -- v2 con marcador menta.
//
// Refs: Downloads/1000278585.png (marcador) y 1000278586.png (resultados).
// - Marco que CODIFICA el estado (neon+glow en vivo / sutil programado /
//   apagado final), via temaPartido (fuente unica).
// - Centro adaptativo:
//     * programado            -> cuadrado blanco con "V" de Versus.
//     * en vivo / final / etc -> pildora MENTA con el marcador (numeros negros)
//       partida por una linea fina (estilo de las referencias).
// - Etiqueta de grupo/fase VERTICAL al costado derecho.
// - Top center: hora (programado) / "FIN" (final) / estado en vivo.
// - Banderas en rectangulo redondeado (Flag rect). Reusa Flag, fechas, estados.
import { useNavigate } from "react-router-dom";
import Flag from "./Flag";
import EstadoBadge from "./EstadoBadge";
import { CheckIcon } from "./Iconos";
import { fmtHora } from "../lib/fechas";
import { temaPartido } from "../lib/temaWC";
import type { Partido } from "../lib/types";

// Ganador de un partido JUGADO (final). Prioridad: penales -> total con
// alargue -> 90'. Devuelve null en empate (solo posible en grupos) o si el
// partido no termino. Fuente unica para el check sobre la bandera.
function ganadorPartido(p: Partido): "local" | "visita" | null {
  if (p.estado !== "final") return null;
  if (p.ganador_penales) return p.ganador_penales;
  const gl = (p.goles_local ?? 0) + (p.alargue_local ?? 0);
  const gv = (p.goles_visita ?? 0) + (p.alargue_visita ?? 0);
  if (gl > gv) return "local";
  if (gv > gl) return "visita";
  return null;
}

// Etiqueta corta (grupo o fase en mayusculas) para el costado vertical.
function etiquetaBadge(p: Partido): string {
  if (p.grupo) return `GRUPO ${p.grupo}`;
  const map: Record<string, string> = {
    Dieciseisavos: "DIECISEISAVOS",
    Octavos: "OCTAVOS",
    Cuartos: "CUARTOS",
    Semifinales: "SEMIFINALES",
    "Tercer Puesto": "3ER PUESTO",
    Final: "FINAL",
  };
  return (map[p.fase] ?? p.fase).toUpperCase();
}

function esPronosticable(p: Partido): boolean {
  return p.estado === "programado" && new Date(p.fecha).getTime() > Date.now();
}

export default function TarjetaPartidoWC({
  p,
  pronosticado,
}: {
  p: Partido;
  pronosticado?: boolean;
}) {
  const navigate = useNavigate();
  const { marco, glow, atenuado } = temaPartido(p.estado);
  const programado = p.estado === "programado";
  const conMarcador = !programado; // en vivo / final / etc -> cajas menta
  const pendiente = esPronosticable(p);
  const esFinal = p.estado === "final";
  const gana = ganadorPartido(p); // 'local' | 'visita' | null (empate/no jugado)

  return (
    <li>
      <button
        onClick={() => navigate(`/partido/${p.id}`)}
        aria-label={`${p.equipo_local} contra ${p.equipo_visita}`}
        className={`group w-full text-left overflow-hidden ${marco} ${
          glow ? "glow-neon" : ""
        } ${
          atenuado ? "opacity-90" : ""
        } transition-transform active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-menta`}
      >
        <div className="bg-carbon-card px-3 pt-2.5 pb-3">
          {/* Top center: estado / hora / FIN */}
          <div className="flex justify-center mb-2 h-4">
            <TopEstado p={p} />
          </div>

          {/* Fila central: bandera | (V o marcador menta) | bandera | etiqueta */}
          <div className="flex items-center gap-2">
            <Equipo
              code={p.pais_local}
              nombre={p.equipo_local}
              gano={gana === "local"}
              reservar={esFinal}
            />

            <div className="shrink-0">
              {conMarcador ? (
                <MarcadorMenta a={p.goles_local} b={p.goles_visita} />
              ) : (
                <CuadradoV />
              )}
            </div>

            <Equipo
              code={p.pais_visita}
              nombre={p.equipo_visita}
              gano={gana === "visita"}
              reservar={esFinal}
            />

            <EtiquetaVertical texto={etiquetaBadge(p)} />
          </div>

          {/* Definicion de eliminatoria (debajo del marcador):
              - por PENALES  -> muestra como salio la tanda.
              - por ALARGUE  -> leyenda "Definicion por alargue". */}
          {p.penales_local != null && p.penales_visita != null ? (
            <div className="mt-2 text-center text-[11px] font-bold text-neon-menta">
              Definición por penales · {p.penales_local} - {p.penales_visita}
            </div>
          ) : p.alargue_local != null || p.alargue_visita != null ? (
            <div className="mt-2 text-center text-[11px] font-bold text-neon-menta">
              Definición por alargue
            </div>
          ) : null}

          {/* Etiqueta de pronostico (solo si aun se puede pronosticar). */}
          {pendiente && (
            <div className="mt-2.5 flex justify-center">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  pronosticado
                    ? "bg-neon-menta/15 text-neon-menta"
                    : "bg-neon-lima/15 text-neon-lima"
                }`}
              >
                {pronosticado ? "Pronosticado" : "Pendiente"}
              </span>
            </div>
          )}

          {p.puntaje_anulado && (
            <div className="mt-2 text-center text-[11px] font-bold text-amber-400">
              Puntaje anulado / no suma puntos
            </div>
          )}

          {/* Astillas de color al pie (detalle de la maqueta WC26). */}
          <div className="astillas-wc mt-3" />
        </div>
      </button>
    </li>
  );
}

// Indicador superior centrado: hora (programado), estado (en vivo), o FIN.
function TopEstado({ p }: { p: Partido }) {
  if (p.estado === "programado") {
    return (
      <span className="tabular-nums text-xs font-semibold text-neutral-400">
        {fmtHora(p.fecha)}
      </span>
    );
  }
  if (p.estado === "final") {
    return (
      <span className="rounded bg-carbon-soft px-2 py-0.5 text-[10px] font-extrabold tracking-widest text-neutral-300">
        FIN
      </span>
    );
  }
  return <EstadoBadge estado={p.estado} className="text-[11px]" />;
}

function Equipo({
  code,
  nombre,
  gano,
  reservar,
}: {
  code: string;
  nombre: string;
  gano?: boolean; // este lado gano el partido
  reservar?: boolean; // reservar el hueco del check (partido final) para no descuadrar
}) {
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5">
      {reservar && (
        <div className="h-4 flex items-center justify-center">
          {gano && <CheckIcon className="w-4 h-4 text-neon-menta" />}
        </div>
      )}
      <Flag code={code} size={54} nombre={nombre} rect />
      <span className="text-[11px] text-center font-semibold leading-tight text-neutral-200 line-clamp-2">
        {nombre}
      </span>
    </div>
  );
}

// Cuadrado blanco con la "V" de Versus (solo partidos no empezados).
function CuadradoV() {
  return (
    <span className="grid place-items-center w-9 h-12 rounded-lg bg-white text-carbon titulo-wc text-2xl leading-none select-none">
      V
    </span>
  );
}

// Pildora MENTA con el marcador: dos numeros negros partidos por linea fina.
function MarcadorMenta({ a, b }: { a: number | null; b: number | null }) {
  return (
    <div className="flex items-stretch rounded-xl overflow-hidden bg-neon-menta">
      <span className="grid place-items-center w-9 h-12 titulo-wc text-3xl leading-none text-carbon tabular-nums">
        {a ?? 0}
      </span>
      <span className="w-px bg-black/25" />
      <span className="grid place-items-center w-9 h-12 titulo-wc text-3xl leading-none text-carbon tabular-nums">
        {b ?? 0}
      </span>
    </div>
  );
}

// Etiqueta de grupo/fase rotada al costado derecho (estilo referencias).
function EtiquetaVertical({ texto }: { texto: string }) {
  return (
    <span className="self-stretch flex items-center text-[8px] font-bold tracking-[0.25em] text-neutral-500 [writing-mode:vertical-rl] rotate-180 select-none">
      {texto}
    </span>
  );
}
