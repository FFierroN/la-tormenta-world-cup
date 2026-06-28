import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAsync } from "../lib/useAsync";
import { ESTADO_LABEL, enCurso } from "../lib/estados";
import { fmtMinuto } from "../lib/eventos";
import { ShoeIcon } from "../components/Iconos";
import {
  agregarEvento,
  eliminarEvento,
  guardarResultado,
  guardarEquipos,
  propagarLlaves,
  listarEventos,
  obtenerPartido,
  type ResultadoInput,
  type EquiposInput,
} from "../lib/data";
import type { EstadoPartido, EventoPartido, Partido, TipoEvento } from "../lib/types";

export default function AdminPartido() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);

  const { data, cargando, error } = useAsync(async () => {
    if (!id) return null;
    const [partido, eventos] = await Promise.all([
      obtenerPartido(id),
      listarEventos(id),
    ]);
    return { partido, eventos };
  }, [id, version]);

  if (cargando) {
    return <div className="p-8 text-center text-neutral-400">Cargando...</div>;
  }
  const partido = data?.partido ?? null;
  if (error || !partido) {
    return (
      <div className="p-8 text-center text-neutral-400">
        No se pudo cargar el partido.
        <button onClick={() => navigate("/admin")} className="block mx-auto mt-4 text-oro">
          Volver
        </button>
      </div>
    );
  }
  const eventos = data?.eventos ?? [];
  const refrescar = () => setVersion((v) => v + 1);

  return (
    <div className="max-w-md mx-auto pb-10">
      <header className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate("/admin")} aria-label="Volver" className="text-oro">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold leading-tight">
            {partido.equipo_local} vs {partido.equipo_visita}
          </h1>
          <p className="text-xs text-neutral-400">
            {partido.grupo ? `Grupo ${partido.grupo}` : partido.fase}
          </p>
        </div>
      </header>

      <div className="px-4 flex flex-col gap-4">
        {!partido.grupo && <EquiposForm partido={partido} onGuardado={refrescar} />}
        <ResultadoForm partido={partido} onGuardado={refrescar} />
        <EventosForm partido={partido} eventos={eventos} onCambio={refrescar} />
      </div>
    </div>
  );
}

/* ---------- Equipos de la llave (solo eliminatoria) ---------- */
function EquiposForm({
  partido,
  onGuardado,
}: {
  partido: Partido;
  onGuardado: () => void;
}) {
  const [eqL, setEqL] = useState(partido.equipo_local);
  const [paL, setPaL] = useState(partido.pais_local);
  const [eqV, setEqV] = useState(partido.equipo_visita);
  const [paV, setPaV] = useState(partido.pais_visita);
  const [bloq, setBloq] = useState(partido.equipos_bloqueados);
  const [guardando, setGuardando] = useState(false);
  const [propagando, setPropagando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const guardar = async () => {
    setGuardando(true);
    setMsg(null);
    const e: EquiposInput = {
      equipo_local: eqL.trim() || "Por definir",
      pais_local: paL.trim().toUpperCase() || "XX",
      equipo_visita: eqV.trim() || "Por definir",
      pais_visita: paV.trim().toUpperCase() || "XX",
      equipos_bloqueados: bloq,
    };
    try {
      await guardarEquipos(partido.id, e);
      setMsg("Equipos guardados.");
      onGuardado();
    } catch {
      setMsg("No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const propagar = async () => {
    setPropagando(true);
    setMsg(null);
    try {
      const n = await propagarLlaves();
      setMsg(`Motor ejecutado: ${n} lado(s) rellenado(s).`);
      onGuardado();
    } catch {
      setMsg("No se pudo ejecutar el motor.");
    } finally {
      setPropagando(false);
    }
  };

  return (
    <section className="bg-carbon-card border border-borde rounded-2xl p-4">
      <h2 className="text-sm font-bold text-oro uppercase tracking-wide mb-1">
        Equipos de la llave
      </h2>
      <p className="text-[11px] text-neutral-400 mb-3">
        {partido.slot ? `Slot ${partido.slot}` : "Eliminatoria"} · origen{" "}
        {partido.origen_local ?? "?"} vs {partido.origen_visita ?? "?"}. Corrige a
        mano si el motor no pudo resolverlos.
      </p>

      <div className="grid grid-cols-[1fr_auto] gap-2 mb-2">
        <input
          value={eqL}
          onChange={(e) => setEqL(e.target.value)}
          placeholder="Equipo local"
          className="px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm"
        />
        <input
          value={paL}
          onChange={(e) => setPaL(e.target.value)}
          placeholder="ISO"
          maxLength={3}
          className="w-16 px-2 py-2 rounded-lg bg-carbon-soft border border-borde text-sm text-center uppercase"
        />
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2 mb-3">
        <input
          value={eqV}
          onChange={(e) => setEqV(e.target.value)}
          placeholder="Equipo visita"
          className="px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm"
        />
        <input
          value={paV}
          onChange={(e) => setPaV(e.target.value)}
          placeholder="ISO"
          maxLength={3}
          className="w-16 px-2 py-2 rounded-lg bg-carbon-soft border border-borde text-sm text-center uppercase"
        />
      </div>

      <label className="flex items-center gap-2 mb-3 text-sm">
        <input
          type="checkbox"
          checked={bloq}
          onChange={(e) => setBloq(e.target.checked)}
          className="w-4 h-4 accent-oro"
        />
        <span>
          Fijar a mano
          <span className="block text-[11px] text-neutral-400">
            El motor de llaves NO volvera a pisar estos equipos.
          </span>
        </span>
      </label>

      <button
        onClick={guardar}
        disabled={guardando}
        className="w-full py-2.5 rounded-full bg-oro text-carbon font-bold disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar equipos"}
      </button>

      <button
        onClick={propagar}
        disabled={propagando}
        className="w-full mt-2 py-2.5 rounded-full bg-carbon-soft border border-oro text-oro font-bold disabled:opacity-50"
      >
        {propagando ? "Ejecutando..." : "Re-ejecutar motor de llaves"}
      </button>
      {msg && <p className="mt-2 text-center text-xs text-neutral-300">{msg}</p>}
    </section>
  );
}

/* ---------- Resultado ---------- */
function ResultadoForm({
  partido,
  onGuardado,
}: {
  partido: Partido;
  onGuardado: () => void;
}) {
  const [estado, setEstado] = useState<EstadoPartido>(partido.estado);
  const [gl, setGl] = useState(partido.goles_local ?? 0);
  const [gv, setGv] = useState(partido.goles_visita ?? 0);
  const [min, setMin] = useState(partido.minuto ?? 0);
  const [pl, setPl] = useState(partido.penales_local ?? 0);
  const [pv, setPv] = useState(partido.penales_visita ?? 0);
  const [ganador, setGanador] = useState<"" | "local" | "visita">(
    partido.ganador_penales ?? ""
  );
  const [huboAlargue, setHuboAlargue] = useState(partido.alargue_local != null);
  const [al, setAl] = useState(partido.alargue_local ?? 0);
  const [av, setAv] = useState(partido.alargue_visita ?? 0);
  const [guardando, setGuardando] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const programado = estado === "programado";
  const esEliminatoria = !partido.grupo;

  const guardar = async () => {
    setGuardando(true);
    setMsg(null);
    const r: ResultadoInput = {
      estado,
      goles_local: programado ? null : gl,
      goles_visita: programado ? null : gv,
      minuto: enCurso(estado) ? min : null,
      penales_local: ganador ? pl : null,
      penales_visita: ganador ? pv : null,
      ganador_penales: ganador || null,
      alargue_local: esEliminatoria && huboAlargue ? al : null,
      alargue_visita: esEliminatoria && huboAlargue ? av : null,
    };
    try {
      await guardarResultado(partido.id, r);
      setMsg("Resultado guardado.");
      onGuardado();
    } catch {
      setMsg("No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="bg-carbon-card border border-borde rounded-2xl p-4">
      <h2 className="text-sm font-bold text-oro uppercase tracking-wide mb-3">
        Resultado
      </h2>

      <label className="block text-xs text-neutral-400 mb-1">Estado</label>
      <select
        value={estado}
        onChange={(e) => setEstado(e.target.value as EstadoPartido)}
        className="w-full mb-4 px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm"
      >
        {Object.entries(ESTADO_LABEL).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>

      {!programado && (
        <div className="flex items-center justify-center gap-4 mb-4">
          <NumBox etiqueta={partido.equipo_local} valor={gl} set={setGl} />
          <span className="text-2xl font-black text-neutral-500 pb-6">-</span>
          <NumBox etiqueta={partido.equipo_visita} valor={gv} set={setGv} />
        </div>
      )}

      {enCurso(estado) && (
        <div className="mb-4">
          <label className="block text-xs text-neutral-400 mb-1">Minuto</label>
          <NumInput valor={min} set={setMin} max={130} />
        </div>
      )}

      {esEliminatoria && (
        <div className="mb-4">
          <label className="flex items-center gap-2 text-xs text-neutral-400 mb-2">
            <input
              type="checkbox"
              checked={huboAlargue}
              onChange={(e) => setHuboAlargue(e.target.checked)}
              className="w-4 h-4 accent-oro"
            />
            Hubo alargue (cargar goles SOLO del tiempo extra)
          </label>
          {huboAlargue && (
            <div className="flex items-center justify-center gap-4">
              <NumBox etiqueta="Alargue local" valor={al} set={setAl} />
              <span className="text-2xl font-black text-neutral-500 pb-6">-</span>
              <NumBox etiqueta="Alargue visita" valor={av} set={setAv} />
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-xs text-neutral-400 mb-1">
          Penales (solo si hubo definicion)
        </label>
        <select
          value={ganador}
          onChange={(e) => setGanador(e.target.value as "" | "local" | "visita")}
          className="w-full mb-2 px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm"
        >
          <option value="">Sin penales</option>
          <option value="local">Gano {partido.equipo_local}</option>
          <option value="visita">Gano {partido.equipo_visita}</option>
        </select>
        {ganador && (
          <div className="flex items-center justify-center gap-4">
            <NumBox etiqueta="Pen. local" valor={pl} set={setPl} />
            <span className="text-2xl font-black text-neutral-500 pb-6">-</span>
            <NumBox etiqueta="Pen. visita" valor={pv} set={setPv} />
          </div>
        )}
      </div>

      <button
        onClick={guardar}
        disabled={guardando}
        className="w-full py-2.5 rounded-full bg-oro text-carbon font-bold disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar resultado"}
      </button>
      {msg && <p className="mt-2 text-center text-xs text-neutral-300">{msg}</p>}
    </section>
  );
}

/* ---------- Eventos ---------- */
function EventosForm({
  partido,
  eventos,
  onCambio,
}: {
  partido: Partido;
  eventos: EventoPartido[];
  onCambio: () => void;
}) {
  const [tipo, setTipo] = useState<TipoEvento>("gol");
  const [equipo, setEquipo] = useState<"local" | "visita">("local");
  const [minuto, setMinuto] = useState(1);
  const [adicional, setAdicional] = useState(0);
  const [jugador, setJugador] = useState("");
  const [asistencia, setAsistencia] = useState("");
  const [guardando, setGuardando] = useState(false);

  const agregar = async () => {
    setGuardando(true);
    try {
      await agregarEvento({
        partido_id: partido.id,
        tipo,
        equipo,
        minuto,
        minuto_adicional: adicional > 0 ? adicional : null,
        jugador: jugador.trim() || null,
        // asistencia: en goles = asistidor; en cambios = quien sale; resto null
        asistencia:
          tipo === "gol" || tipo === "cambio" ? asistencia.trim() || null : null,
        detalle: null,
      });
      setJugador("");
      setAsistencia("");
      setAdicional(0);
      onCambio();
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (id: string) => {
    await eliminarEvento(id);
    onCambio();
  };

  const orden = [...eventos].sort((a, b) => b.minuto - a.minuto);
  const LABEL: Record<TipoEvento, string> = {
    gol: "Gol",
    amarilla: "Amarilla",
    roja: "Roja",
    cambio: "Cambio",
  };

  return (
    <section className="bg-carbon-card border border-borde rounded-2xl p-4">
      <h2 className="text-sm font-bold text-oro uppercase tracking-wide mb-3">
        Eventos
      </h2>

      {/* Lista existente */}
      {orden.length === 0 ? (
        <p className="text-xs text-neutral-500 mb-3">Sin eventos cargados.</p>
      ) : (
        <ul className="flex flex-col gap-1.5 mb-4">
          {orden.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-2 text-sm bg-carbon-soft rounded-lg px-3 py-2"
            >
              <span className="tabular-nums text-neutral-400 w-10">{fmtMinuto(e)}</span>
              <span className="flex-1">
                {LABEL[e.tipo]} ·{" "}
                {e.equipo === "local" ? partido.equipo_local : partido.equipo_visita}
                {e.jugador ? ` · ${e.jugador}` : ""}
                {e.asistencia && (
                  <span className="text-xs text-neutral-400">
                    {" "}
                    <ShoeIcon className="inline w-3 h-3 text-emerald-400 align-text-bottom" />{" "}
                    {e.asistencia}
                  </span>
                )}
              </span>
              <button
                onClick={() => borrar(e.id)}
                className="text-red-400 text-xs font-semibold"
                aria-label="Eliminar evento"
              >
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Agregar nuevo */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoEvento)}
          className="px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm"
        >
          <option value="gol">Gol</option>
          <option value="amarilla">Amarilla</option>
          <option value="roja">Roja</option>
          <option value="cambio">Cambio</option>
        </select>
        <select
          value={equipo}
          onChange={(e) => setEquipo(e.target.value as "local" | "visita")}
          className="px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm"
        >
          <option value="local">{partido.equipo_local}</option>
          <option value="visita">{partido.equipo_visita}</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">Minuto</label>
            <NumInput valor={minuto} set={setMinuto} max={130} />
          </div>
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">+ Desc.</label>
            <NumInput valor={adicional} set={setAdicional} max={20} />
          </div>
        </div>
        <div>
          <label className="block text-[11px] text-neutral-400 mb-1">
            Jugador (opcional)
          </label>
          <input
            value={jugador}
            onChange={(e) => setJugador(e.target.value)}
            placeholder="Nombre"
            className="w-full px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm"
          />
        </div>
      </div>

      {/* Asistidor: solo tiene sentido en goles. La API no lo trae -> se carga aca. */}
      {tipo === "gol" && (
        <div className="mb-3">
          <label className="flex items-center gap-1.5 text-[11px] text-neutral-400 mb-1">
            <ShoeIcon className="w-3.5 h-3.5 text-emerald-400" />
            Asistidor (opcional)
          </label>
          <input
            value={asistencia}
            onChange={(e) => setAsistencia(e.target.value)}
            placeholder="Quien asistio el gol"
            className="w-full px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm"
          />
        </div>
      )}
      <button
        onClick={agregar}
        disabled={guardando}
        className="w-full py-2.5 rounded-full bg-carbon-soft border border-oro text-oro font-bold disabled:opacity-50"
      >
        {guardando ? "Agregando..." : "Agregar evento"}
      </button>
    </section>
  );
}

/* ---------- Inputs ---------- */
function NumBox({
  etiqueta,
  valor,
  set,
}: {
  etiqueta: string;
  valor: number;
  set: (n: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <Mini onClick={() => set(Math.max(0, valor - 1))}>&minus;</Mini>
        <span className="text-3xl font-black tabular-nums w-10 text-center">{valor}</span>
        <Mini onClick={() => set(Math.min(99, valor + 1))}>+</Mini>
      </div>
      <span className="text-[11px] text-neutral-400 max-w-[6rem] truncate" title={etiqueta}>
        {etiqueta}
      </span>
    </div>
  );
}

function NumInput({
  valor,
  set,
  max = 99,
}: {
  valor: number;
  set: (n: number) => void;
  max?: number;
}) {
  return (
    <input
      type="number"
      min={0}
      max={max}
      value={valor}
      onChange={(e) => set(Math.max(0, Math.min(max, Number(e.target.value) || 0)))}
      className="w-full px-3 py-2 rounded-lg bg-carbon-soft border border-borde text-sm tabular-nums"
    />
  );
}

function Mini({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-9 h-9 rounded-full bg-carbon-soft border border-borde text-xl font-bold leading-none active:scale-95"
    >
      {children}
    </button>
  );
}
