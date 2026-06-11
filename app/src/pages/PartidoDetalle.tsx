import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Flag from "../components/Flag";
import RelojVivo from "../components/RelojVivo";
import EstadoBadge from "../components/EstadoBadge";
import { BallIcon, EventoIcono, ShoeIcon } from "../components/Iconos";
import type { EventoPartido, Partido, PronosticoVista } from "../lib/types";
import { ESTADOS_EN_CURSO } from "../lib/estados";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../lib/auth";
import {
  guardarPronostico,
  listarEventos,
  obtenerPartido,
  pronosticosPartido,
} from "../lib/data";

type Pestana = "detalles" | "pronosticos";

// Un partido esta abierto para pronosticar si sigue programado y no empezo.
function puedePronosticar(p: Partido): boolean {
  return p.estado === "programado" && new Date(p.fecha) > new Date();
}

export default function PartidoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { jugador } = useAuth();
  const [pestana, setPestana] = useState<Pestana>("detalles");
  const [version, setVersion] = useState(0); // para refrescar tras guardar

  const { data, cargando, error } = useAsync(async () => {
    if (!id) return null;
    const [partido, eventos, pronosticos] = await Promise.all([
      obtenerPartido(id),
      listarEventos(id),
      pronosticosPartido(id, jugador?.id ?? "0"),
    ]);
    return { partido, eventos, pronosticos };
  }, [id, version]);

  if (cargando) {
    return <div className="p-8 text-center text-neutral-400">Cargando partido...</div>;
  }

  const partido = data?.partido ?? null;
  const eventos = data?.eventos ?? [];
  const pronosticos = data?.pronosticos ?? [];

  if (error || !partido) {
    return (
      <div className="p-8 text-center text-neutral-400">
        {error ? "No se pudo cargar el partido." : "Partido no encontrado."}
        <button onClick={() => navigate("/partidos")} className="block mx-auto mt-4 text-oro">
          Volver
        </button>
      </div>
    );
  }

  const minutosGol = eventos
    .filter((e) => e.tipo === "gol")
    .map((e) => `${e.minuto}'`)
    .join(", ");

  const miPronostico =
    pronosticos.find((p) => p.jugador_id === jugador?.id) ?? null;

  return (
    <div className="min-h-full bg-carbon">
      {/* ---------- Header con fondo de la Copa (imagen) ----------
          Relacion fija 16:9: la imagen fondo-partido.png se disena a 16:9
          (ej. 1440x810 px) y calza perfecto sin recortes. Si en una pantalla
          chica el contenido es mas alto, el banner crece sin romperse. */}
      <header className="relative overflow-hidden aspect-[16/9] flex flex-col">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(8,10,8,.55) 0%, rgba(8,10,8,.35) 45%, rgba(10,10,10,.92) 100%)," +
              "url('/fondo-partido.png')",
            backgroundColor: "#0d2a14",
          }}
        />
        <div className="relative px-4 pt-4 pb-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center"
              aria-label="Volver"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <TeamHead code={partido.pais_local} nombre={partido.equipo_local} />
            <div className="text-center">
              <div className="flex items-center justify-center">
                <EstadoBadge estado={partido.estado} className="text-xs" />
              </div>
              {partido.estado === "programado" ? (
                <div className="text-2xl font-bold mt-1">
                  {new Date(partido.fecha).toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              ) : (
                <>
                  <div className="text-4xl font-black tabular-nums mt-1">
                    {partido.goles_local ?? 0} - {partido.goles_visita ?? 0}
                  </div>
                  {ESTADOS_EN_CURSO.includes(partido.estado) && (
                    <RelojVivo partido={partido} />
                  )}
                  {partido.ganador_penales && (
                    <div className="text-xs text-neutral-300 mt-1">
                      Penales: {partido.penales_local ?? 0} -{" "}
                      {partido.penales_visita ?? 0}
                    </div>
                  )}
                </>
              )}
            </div>
            <TeamHead code={partido.pais_visita} nombre={partido.equipo_visita} />
          </div>

          {(partido.estadio || partido.fase) && (
            <div className="mt-3 text-center text-[11px] text-neutral-300">
              {partido.grupo ? `Grupo ${partido.grupo}` : partido.fase}
              {partido.estadio ? ` \u00b7 ${partido.estadio}` : ""}
              {partido.ciudad ? `, ${partido.ciudad}` : ""}
            </div>
          )}

          {minutosGol && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-neutral-300">
              <BallIcon />
              <span>{minutosGol}</span>
            </div>
          )}
        </div>
      </header>

      {/* ---------- Tu pronostico ---------- */}
      <div className="px-4 mt-4">
        <EditorPronostico
          partido={partido}
          jugadorId={jugador?.id ?? null}
          mio={miPronostico}
          onGuardado={() => setVersion((v) => v + 1)}
        />
      </div>

      {/* ---------- Pestanas ---------- */}
      <div className="px-4 mt-4 flex gap-2">
        <TabBtn activo={pestana === "detalles"} onClick={() => setPestana("detalles")}>
          Detalles del partido
        </TabBtn>
        <TabBtn activo={pestana === "pronosticos"} onClick={() => setPestana("pronosticos")}>
          Pronosticos
        </TabBtn>
      </div>

      <div className="px-4 py-4 pb-10">
        {pestana === "detalles" ? (
          <Detalles partido={partido} eventos={eventos} />
        ) : (
          <Pronosticos partido={partido} pronosticos={pronosticos} />
        )}
      </div>
    </div>
  );
}

function TeamHead({ code, nombre }: { code: string; nombre: string }) {
  return (
    <div className="flex flex-col items-center gap-2 w-28">
      <Flag code={code} size={64} nombre={nombre} />
      <span className="text-sm font-semibold text-center leading-tight">{nombre}</span>
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
      className={`px-4 py-2 text-sm font-semibold rounded-full border transition-colors ${
        activo
          ? "bg-oro text-carbon border-oro"
          : "bg-carbon-soft text-neutral-300 border-borde"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- Editor: tu pronostico (steppers + guardar) ---------- */
function EditorPronostico({
  partido,
  jugadorId,
  mio,
  onGuardado,
}: {
  partido: Partido;
  jugadorId: string | null;
  mio: PronosticoVista | null;
  onGuardado: () => void;
}) {
  const abierto = puedePronosticar(partido);
  const [local, setLocal] = useState<number>(mio?.pred_local ?? 0);
  const [visita, setVisita] = useState<number>(mio?.pred_visita ?? 0);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Si el partido ya cerro: mostramos lo que pronostico (o que no jugo).
  if (!abierto) {
    return (
      <div className="bg-carbon-card border border-borde rounded-2xl p-4 text-center">
        <div className="text-xs uppercase tracking-wide text-neutral-400 mb-1">
          Tu pronostico
        </div>
        {mio ? (
          <div className="text-2xl font-black tabular-nums">
            {mio.pred_local} - {mio.pred_visita}
          </div>
        ) : (
          <div className="text-sm text-neutral-400">No pronosticaste este partido.</div>
        )}
        <div className="text-xs text-neutral-500 mt-1">Las predicciones estan cerradas.</div>
      </div>
    );
  }

  const guardar = async () => {
    if (!jugadorId) return;
    setGuardando(true);
    setMsg(null);
    try {
      const r = await guardarPronostico(jugadorId, partido.id, local, visita);
      if (r === "ok") {
        setMsg("Guardado");
        onGuardado();
      } else if (r === "cerrado") {
        setMsg("El partido ya cerro, no se pudo guardar.");
      } else {
        setMsg("Marcador invalido.");
      }
    } catch {
      setMsg("No se pudo guardar. Reintenta.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-carbon-card border border-borde rounded-2xl p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-400 mb-3 text-center">
        Tu pronostico
      </div>
      <div className="flex items-center justify-center gap-4">
        <Stepper
          etiqueta={partido.equipo_local}
          valor={local}
          set={setLocal}
        />
        <span className="text-2xl font-black text-neutral-500 pb-6">-</span>
        <Stepper
          etiqueta={partido.equipo_visita}
          valor={visita}
          set={setVisita}
        />
      </div>
      <button
        onClick={guardar}
        disabled={guardando}
        className="mt-4 w-full py-2.5 rounded-full bg-oro text-carbon font-bold disabled:opacity-50"
      >
        {guardando ? "Guardando..." : mio ? "Actualizar pronostico" : "Guardar pronostico"}
      </button>
      {msg && (
        <div className="mt-2 text-center text-xs text-neutral-300">{msg}</div>
      )}
    </div>
  );
}

function Stepper({
  etiqueta,
  valor,
  set,
}: {
  etiqueta: string;
  valor: number;
  set: (n: number) => void;
}) {
  const dec = () => set(Math.max(0, valor - 1));
  const inc = () => set(Math.min(99, valor + 1));
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-3">
        <BotonRedondo onClick={dec} aria="Restar">
          &minus;
        </BotonRedondo>
        <span className="text-3xl font-black tabular-nums w-10 text-center">{valor}</span>
        <BotonRedondo onClick={inc} aria="Sumar">
          +
        </BotonRedondo>
      </div>
      <span className="text-[11px] text-neutral-400 max-w-[6rem] truncate" title={etiqueta}>
        {etiqueta}
      </span>
    </div>
  );
}

function BotonRedondo({
  onClick,
  aria,
  children,
}: {
  onClick: () => void;
  aria: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={aria}
      className="w-9 h-9 rounded-full bg-carbon-soft border border-borde text-xl font-bold leading-none active:scale-95"
    >
      {children}
    </button>
  );
}

/* ---------- Tab 1: timeline de goles + rojas ---------- */
function Detalles({
  partido,
  eventos,
}: {
  partido: Partido;
  eventos: EventoPartido[];
}) {
  if (eventos.length === 0) {
    return (
      <div className="text-center text-neutral-400 py-10">
        Sin acontecimientos todavia.
      </div>
    );
  }
  // ordenamos por minuto descendente (lo mas reciente arriba)
  const orden = [...eventos].sort((a, b) => b.minuto - a.minuto);

  return (
    <div className="bg-carbon-card border border-borde rounded-2xl overflow-hidden">
      <div className="text-center text-sm font-semibold py-3 border-b border-borde">
        Acontecimientos clave
      </div>
      <ul>
        {orden.map((e) => (
          <li
            key={e.id}
            className={`flex items-center gap-2 py-3 px-4 border-b border-borde last:border-0 ${
              e.equipo === "local" ? "" : "flex-row-reverse text-right"
            }`}
          >
            <EventoIcono tipo={e.tipo} />
            <div className="leading-tight">
              <div>
                {e.jugador && <span className="text-sm">{e.jugador} </span>}
                <span className="text-sm font-semibold tabular-nums text-neutral-300">
                  {e.minuto}'
                </span>
                {e.tipo === "gol" && e.detalle && e.detalle !== "normal" && (
                  <span className="text-xs text-neutral-400"> ({e.detalle})</span>
                )}
              </div>
              {e.asistencia && (
                <div className="mt-0.5 text-xs text-neutral-500">
                  <ShoeIcon className="inline w-3.5 h-3.5 text-emerald-400 align-text-bottom mr-1" />
                  {e.asistencia}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="text-center text-xs text-neutral-500 py-3">
        {partido.equipo_local} vs {partido.equipo_visita}
      </div>
    </div>
  );
}

/* ---------- Tab 2: pronosticos (oculta ajenos hasta el inicio) ---------- */
function Pronosticos({
  partido,
  pronosticos,
}: {
  partido: Partido;
  pronosticos: PronosticoVista[];
}) {
  const noEmpezo = partido.estado === "programado";

  if (pronosticos.length === 0) {
    return (
      <div className="text-center text-neutral-400 py-10">
        {noEmpezo
          ? "Los pronosticos se revelan cuando empieza el partido."
          : "Todavia no hay pronosticos."}
      </div>
    );
  }

  const estadoAcierto = (
    pr: PronosticoVista
  ): "exacto" | "diferencia" | "acierto" | "falla" | null => {
    if (partido.goles_local == null || partido.goles_visita == null) return null;
    const gl = partido.goles_local;
    const gv = partido.goles_visita;
    if (pr.pred_local === gl && pr.pred_visita === gv) return "exacto";
    if (gl !== gv && gl - gv === pr.pred_local - pr.pred_visita) return "diferencia";
    const signoReal = Math.sign(gl - gv);
    const signoPred = Math.sign(pr.pred_local - pr.pred_visita);
    return signoReal === signoPred ? "acierto" : "falla";
  };

  const BADGE: Record<string, string> = {
    exacto: "bg-oro text-carbon",
    diferencia: "bg-sky-600 text-white",
    acierto: "bg-emerald-600 text-white",
    falla: "bg-neutral-700 text-neutral-300",
  };
  const BADGE_LABEL: Record<string, string> = {
    exacto: "Exacto",
    diferencia: "Diferencia",
    acierto: "Acierto",
    falla: "Falla",
  };

  return (
    <>
      {noEmpezo && (
        <p className="text-xs text-neutral-500 mb-2 text-center">
          Solo ves tu pronostico. Los demas se revelan al empezar el partido.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {pronosticos.map((pr) => {
          const st = estadoAcierto(pr);
          return (
            <li
              key={pr.jugador_id}
              className="flex items-center gap-3 bg-carbon-card border border-borde rounded-xl px-4 py-3"
            >
              <span className="flex-1 font-medium">{pr.nombre}</span>
              <span className="text-lg font-bold tabular-nums w-16 text-center">
                {pr.pred_local} - {pr.pred_visita}
              </span>
              {st && (
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${BADGE[st]}`}>
                  {BADGE_LABEL[st]}
                </span>
              )}
              <span className="w-12 text-right font-bold text-oro tabular-nums">
                {pr.puntos ?? 0}
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}


