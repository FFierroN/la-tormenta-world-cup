import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Flag from "../components/Flag";
import TramoVivo from "../components/TramoVivo";
import EstadoBadge from "../components/EstadoBadge";
import PanelStats from "../components/PanelStats";
import PanelTormenta from "../components/PanelTormenta";
import TablaTormentaLive from "../components/TablaTormentaLive";
import { BallIcon } from "../components/Iconos";
import TimelinePartido from "../components/TimelinePartido";
import CanchaAlineaciones from "../components/CanchaAlineaciones";
import type { Partido, PronosticoVista, ModoDefinicion, LadoEquipo } from "../lib/types";

import { fmtMinuto } from "../lib/eventos";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../lib/auth";
import {
  guardarPronostico,
  listarEventos,
  obtenerPartido,
  pronosticosPartido,
} from "../lib/data";

type Pestana = "detalles" | "alineaciones" | "estadisticas" | "pronosticos" | "tormenta";

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
    .map((e) => fmtMinuto(e))
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
                {partido.estado === "final" ? (
                  <span className="text-sm font-bold text-neutral-100">
                    Partido Finalizado
                  </span>
                ) : (
                  <EstadoBadge estado={partido.estado} className="text-xs" />
                )}
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
                  {(partido.estado === "en_vivo" || partido.estado === "entretiempo") && (
                    <TramoVivo partido={partido} className="mt-1.5" />
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

          {partido.puntaje_anulado && (
            <div className="mt-3 text-center text-xs font-bold text-amber-400">
              Puntaje anulado · este partido no suma puntos
            </div>
          )}

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
      <div className="px-4 mt-4 flex flex-wrap gap-2">
        <TabBtn activo={pestana === "detalles"} onClick={() => setPestana("detalles")}>
          Detalles
        </TabBtn>
        <TabBtn activo={pestana === "alineaciones"} onClick={() => setPestana("alineaciones")}>
          Alineaciones
        </TabBtn>
        <TabBtn activo={pestana === "estadisticas"} onClick={() => setPestana("estadisticas")}>
          Estadisticas
        </TabBtn>
        <TabBtn activo={pestana === "pronosticos"} onClick={() => setPestana("pronosticos")}>
          Pronosticos
        </TabBtn>
        <TabBtn activo={pestana === "tormenta"} onClick={() => setPestana("tormenta")}>
          Tormenta
        </TabBtn>
      </div>

      <div className="px-4 py-4 pb-10">
        {pestana === "detalles" && (
          <TimelinePartido partido={partido} eventos={eventos} />
        )}
        {pestana === "alineaciones" && (
          partido.alineaciones ? (
            <CanchaAlineaciones
              alineaciones={partido.alineaciones}
              equipoLocal={partido.equipo_local}
              equipoVisita={partido.equipo_visita}
              paisLocal={partido.pais_local}
              paisVisita={partido.pais_visita}
              eventos={eventos}
            />
          ) : (
            <div className="text-center text-neutral-400 py-10">
              Las alineaciones aparecen ~1 hora antes del partido.
            </div>
          )
        )}
        {pestana === "estadisticas" && <PanelStats partido={partido} />}
        {pestana === "pronosticos" && (
          <Pronosticos partido={partido} pronosticos={pronosticos} />
        )}
        {pestana === "tormenta" && (
          <div className="flex flex-col gap-4">
            <TablaTormentaLive />
            <PanelTormenta />
          </div>
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
  const esEliminatoria = !partido.grupo;
  const [local, setLocal] = useState<number>(mio?.pred_local ?? 0);
  const [visita, setVisita] = useState<number>(mio?.pred_visita ?? 0);
  const [clasificado, setClasificado] = useState<LadoEquipo | null>(
    mio?.pred_clasificado ?? null
  );
  const [definicion, setDefinicion] = useState<ModoDefinicion | null>(
    mio?.pred_definicion ?? null
  );
  const [defLocal, setDefLocal] = useState<number>(mio?.pred_def_local ?? 0);
  const [defVisita, setDefVisita] = useState<number>(mio?.pred_def_visita ?? 0);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Validacion en cascada para eliminatoria. Bandera y definicion (modo +
  // marcador no-empate + coherencia) son OBLIGATORIAS: si falta algo, el
  // boton Guardar se deshabilita y mostramos un solo mensaje rojo (el primero
  // por prioridad), asi el jugador resuelve uno a la vez sin marearse.
  let error: string | null = null;
  if (esEliminatoria) {
    if (!clasificado) {
      error = "Falta elegir quien clasifica (toca una bandera).";
    } else if (!definicion) {
      error = "Falta elegir como se define (alargue o penales).";
    } else if (defLocal === defVisita) {
      error = "El marcador de la definicion no puede ser empate.";
    } else if (clasificado === "local" && defLocal < defVisita) {
      error = `Elegiste a ${partido.equipo_local}, pero tu marcador favorece a ${partido.equipo_visita}.`;
    } else if (clasificado === "visita" && defVisita < defLocal) {
      error = `Elegiste a ${partido.equipo_visita}, pero tu marcador favorece a ${partido.equipo_local}.`;
    }
  }

  // Si el partido ya cerro (empezo o termino): mostramos lo que pronostico (o
  // que no jugo). Sin fondo azul solido, solo el borde (igual que goleadores).
  if (!abierto) {
    return (
      <div className="border border-borde rounded-2xl p-4 text-center">
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
        {mio?.pred_clasificado && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-neutral-300">
            <span className="uppercase tracking-wide text-neutral-500">Clasifica:</span>
            <Flag
              code={mio.pred_clasificado === "local" ? partido.pais_local : partido.pais_visita}
              size={16}
              nombre={mio.pred_clasificado === "local" ? partido.equipo_local : partido.equipo_visita}
            />
            <span className="font-semibold">
              {mio.pred_clasificado === "local" ? partido.equipo_local : partido.equipo_visita}
            </span>
          </div>
        )}
        {mio?.pred_definicion && (
          <div className="mt-1 text-xs text-neutral-300">
            Si hay empate:{" "}
            <span className="text-oro font-semibold">
              {mio.pred_definicion === "alargue" ? "Alargue" : "Penales"}
            </span>{" "}
            {mio.pred_def_local} - {mio.pred_def_visita}
          </div>
        )}
        <div className="text-xs text-neutral-500 mt-1">Las predicciones estan cerradas.</div>
      </div>
    );
  }

  const guardar = async () => {
    if (!jugadorId || error) return;
    setGuardando(true);
    setMsg(null);
    try {
      const r = await guardarPronostico(
        jugadorId,
        partido.id,
        local,
        visita,
        esEliminatoria ? definicion : null,
        esEliminatoria && definicion ? defLocal : null,
        esEliminatoria && definicion ? defVisita : null,
        esEliminatoria ? clasificado : null
      );
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
    <div className="space-y-3">
      {/* Caja 1: pronostico oficial (marcador de 90'). */}
      <div className="bg-carbon-card border border-borde rounded-2xl p-4">
        <div className="text-xs uppercase tracking-wide text-neutral-400 mb-3 text-center">
          Tu pronostico
        </div>
        <div className="flex items-center justify-center gap-4">
          <Stepper etiqueta={partido.equipo_local} valor={local} set={setLocal} />
          <span className="text-2xl font-black text-neutral-500 pb-6">-</span>
          <Stepper etiqueta={partido.equipo_visita} valor={visita} set={setVisita} />
        </div>
      </div>

      {esEliminatoria && (
        <>
          {/* Caja 2: bandera del equipo que el jugador cree que clasifica. */}
          <SelectorBandera
            partido={partido}
            clasificado={clasificado}
            setClasificado={setClasificado}
          />

          {/* Caja 3: modo (alargue/penales) + marcador exacto + nota. */}
          <DefinicionEmpate
            partido={partido}
            definicion={definicion}
            setDefinicion={setDefinicion}
            defLocal={defLocal}
            setDefLocal={setDefLocal}
            defVisita={defVisita}
            setDefVisita={setDefVisita}
          />
        </>
      )}

      {error && (
        <div className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/40 text-center text-xs text-red-300">
          {error}
        </div>
      )}

      <button
        onClick={guardar}
        disabled={guardando || !!error}
        className="w-full py-2.5 rounded-full bg-oro text-carbon font-bold disabled:opacity-50"
      >
        {guardando ? "Guardando..." : mio ? "Actualizar pronostico" : "Guardar pronostico"}
      </button>
      {msg && (
        <div className="text-center text-xs text-neutral-300">{msg}</div>
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


/* ---------- Caja 3: como se define el empate (solo eliminatoria) ---------- */
function DefinicionEmpate({
  partido,
  definicion,
  setDefinicion,
  defLocal,
  setDefLocal,
  defVisita,
  setDefVisita,
}: {
  partido: Partido;
  definicion: ModoDefinicion | null;
  setDefinicion: (m: ModoDefinicion | null) => void;
  defLocal: number;
  setDefLocal: (n: number) => void;
  defVisita: number;
  setDefVisita: (n: number) => void;
}) {
  // Toggle: si vuelves a tocar el modo activo, lo deseleccionas (apuesta opcional).
  const elegir = (m: ModoDefinicion) => setDefinicion(definicion === m ? null : m);

  return (
    <div className="bg-carbon-card border border-borde rounded-2xl p-4">
      <div className="text-sm font-bold text-oro mb-3 text-center">
        Como se define:
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <OpcionDef activo={definicion === "alargue"} onClick={() => elegir("alargue")}>
          Alargue
        </OpcionDef>
        <OpcionDef activo={definicion === "penales"} onClick={() => elegir("penales")}>
          Penales
        </OpcionDef>
      </div>

      {definicion && (
        <div className="flex items-center justify-center gap-4">
          <Stepper etiqueta={partido.equipo_local} valor={defLocal} set={setDefLocal} />
          <span className="text-2xl font-black text-neutral-500 pb-6">-</span>
          <Stepper etiqueta={partido.equipo_visita} valor={defVisita} set={setDefVisita} />
        </div>
      )}

      <p className="mt-3 text-[11px] text-neutral-500 italic text-center">
        El marcador de alargue solo cuenta desde el 90 al 120.
      </p>
    </div>
  );
}

function OpcionDef({
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
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`py-2.5 rounded-full border text-sm font-bold transition-colors ${
        activo
          ? "bg-oro text-carbon border-oro"
          : "bg-carbon-soft text-neutral-300 border-borde"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------- Caja 2: bandera del clasificado (solo eliminatoria) ---------- */
function SelectorBandera({
  partido,
  clasificado,
  setClasificado,
}: {
  partido: Partido;
  clasificado: LadoEquipo | null;
  setClasificado: (l: LadoEquipo | null) => void;
}) {
  // Toggle: si vuelves a tocar la misma bandera, la deseleccionas.
  const elegir = (l: LadoEquipo) => setClasificado(clasificado === l ? null : l);
  return (
    <div className="bg-carbon-card border border-borde rounded-2xl p-4">
      <div className="text-sm font-bold text-oro mb-3 text-center">
        Si empatan, quien clasifica?
      </div>
      <div className="grid grid-cols-2 gap-3">
        <BotonBandera
          activo={clasificado === "local"}
          pais={partido.pais_local}
          equipo={partido.equipo_local}
          onClick={() => elegir("local")}
        />
        <BotonBandera
          activo={clasificado === "visita"}
          pais={partido.pais_visita}
          equipo={partido.equipo_visita}
          onClick={() => elegir("visita")}
        />
      </div>
    </div>
  );
}

function BotonBandera({
  activo,
  pais,
  equipo,
  onClick,
}: {
  activo: boolean;
  pais: string;
  equipo: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-colors ${
        activo
          ? "bg-oro/15 border-oro"
          : "bg-carbon-soft border-borde hover:border-neutral-500"
      }`}
    >
      <Flag code={pais} size={44} nombre={equipo} />
      <span
        className={`text-xs font-semibold max-w-[8rem] truncate ${
          activo ? "text-oro" : "text-neutral-300"
        }`}
        title={equipo}
      >
        {equipo}
      </span>
    </button>
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

  // Marco de la tarjeta: borde grueso de SOLO 2 colores -> rojo si falla,
  // verde en todo lo demas (exacto/diferencia/acierto).
  const MARCO: Record<string, string> = {
    exacto: "border-green-500",
    diferencia: "border-green-500",
    acierto: "border-green-500",
    falla: "border-red-500",
  };

  // Pill de puntos: mismo estilo que las etiquetas "Pronosticado/Pendiente"
  // (bg-color/20 + texto color). Un color por categoria, verde = exacto.
  const PILL: Record<string, string> = {
    exacto: "bg-green-500/20 text-green-400",
    diferencia: "bg-amber-500/20 text-amber-400",
    acierto: "bg-orange-500/20 text-orange-400",
    falla: "bg-red-500/20 text-red-400",
  };

  return (
    <>
      {/* Barra de distribucion de pronosticos (solo cuando ya se revelaron). */}
      {!noEmpezo && (
        <PrediccionesBarra partido={partido} pronosticos={pronosticos} />
      )}

      {noEmpezo && (
        <p className="text-xs text-neutral-500 mb-2 text-center">
          Solo ves tu pronostico. Los demas se revelan al empezar el partido.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {pronosticos.map((pr) => {
          const st = estadoAcierto(pr);
          const pickLocal = pr.pred_local > pr.pred_visita;   // eligio gana local
          const pickVisita = pr.pred_visita > pr.pred_local;  // eligio gana visita
          const empate = !pickLocal && !pickVisita;
          return (
            <li
              key={pr.jugador_id}
              className={`bg-carbon-card border-2 rounded-xl px-4 py-3 ${
                st ? MARCO[st] : "border-borde"
              }`}
            >
              {/* Indicador del ganador elegido: bandera en la esquina que
                  corresponde (izq=local, der=visita) o simbolo de empate al
                  centro, todos a la misma altura. */}
              <div className="flex items-center justify-between h-5 mb-1.5">
                <div className="w-6 flex justify-start">
                  {pickLocal && (
                    <Flag code={partido.pais_local} size={20} nombre={partido.equipo_local} />
                  )}
                </div>
                <div className="flex-1 flex justify-center">
                  {empate && (
                    <div className="flex items-center gap-1">
                      <Flag code={partido.pais_local} size={20} nombre={partido.equipo_local} />
                      <Flag code={partido.pais_visita} size={20} nombre={partido.equipo_visita} />
                    </div>
                  )}
                </div>
                <div className="w-6 flex justify-end">
                  {pickVisita && (
                    <Flag code={partido.pais_visita} size={20} nombre={partido.equipo_visita} />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                {/* Goles del pais de la IZQUIERDA (local). */}
                <span className="text-2xl font-black tabular-nums w-11 text-center text-neutral-100">
                  {pr.pred_local}
                </span>

                <div className="flex-1 text-center leading-tight min-w-0">
                  <div className="font-semibold truncate">{pr.nombre}</div>
                  {st && (
                    <span
                      className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${PILL[st]}`}
                    >
                      +{pr.puntos ?? 0} pts
                    </span>
                  )}
                </div>

                {/* Goles del pais de la DERECHA (visita). */}
                <span className="text-2xl font-black tabular-nums w-11 text-center text-neutral-100">
                  {pr.pred_visita}
                </span>
              </div>

              {pr.pred_definicion && (
                <div className="mt-2 pt-2 border-t border-borde text-center text-[11px] text-neutral-400">
                  Si empata:{" "}
                  <span className="text-neutral-200 font-semibold">
                    {pr.pred_definicion === "alargue" ? "Alargue" : "Penales"}{" "}
                    {pr.pred_def_local}-{pr.pred_def_visita}
                  </span>
                  {pr.puntos_definicion > 0 && (
                    <span className="ml-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold bg-green-500/20 text-green-400">
                      +{pr.puntos_definicion}
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/* Barra horizontal con la distribucion local / empate / visita de los
   pronosticos (estilo casa de apuestas). Solo se muestra cuando ya estan
   revelados (partido iniciado). */
function PrediccionesBarra({
  partido,
  pronosticos,
}: {
  partido: Partido;
  pronosticos: PronosticoVista[];
}) {
  const total = pronosticos.length;
  let local = 0;
  let empate = 0;
  let visita = 0;
  for (const pr of pronosticos) {
    if (pr.pred_local > pr.pred_visita) local += 1;
    else if (pr.pred_local < pr.pred_visita) visita += 1;
    else empate += 1;
  }
  const w = (n: number) => (total ? (n / total) * 100 : 0);
  const p = (n: number) => Math.round(w(n));

  return (
    <div className="bg-carbon-card border border-borde rounded-2xl p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wide text-neutral-300">
          {"\u00bfQui\u00e9n ganar\u00e1?"}
        </span>
        <span className="text-xs text-neutral-400 tabular-nums">
          {total} voto{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Cada caja crece segun su porcentaje (flex-grow proporcional al # de
         votos). minWidth garantiza que incluso el 0% se vea en la grafica. */}
      <div className="flex gap-2 text-xs">
        <span
          className="flex items-center justify-center gap-1.5 bg-carbon-soft rounded-lg py-2 px-1 overflow-hidden"
          style={{ flexGrow: local, flexBasis: 0, minWidth: "3.25rem" }}
        >
          <Flag code={partido.pais_local} size={16} nombre={partido.equipo_local} />
          <span className="font-bold tabular-nums">{p(local)}%</span>
        </span>
        <span
          className="flex items-center justify-center gap-1.5 bg-carbon-soft rounded-lg py-2 px-1 overflow-hidden"
          style={{ flexGrow: empate, flexBasis: 0, minWidth: "3.25rem" }}
        >
          <span className="text-neutral-400 truncate">
            {p(empate) < 12 ? "=" : "Empate"}
          </span>
          <span className="font-bold tabular-nums">{p(empate)}%</span>
        </span>
        <span
          className="flex items-center justify-center gap-1.5 bg-carbon-soft rounded-lg py-2 px-1 overflow-hidden"
          style={{ flexGrow: visita, flexBasis: 0, minWidth: "3.25rem" }}
        >
          <Flag code={partido.pais_visita} size={16} nombre={partido.equipo_visita} />
          <span className="font-bold tabular-nums">{p(visita)}%</span>
        </span>
      </div>
    </div>
  );
}


