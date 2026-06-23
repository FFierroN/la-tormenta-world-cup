import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Flag from "../components/Flag";
import EstadoBadge from "../components/EstadoBadge";
import { listarJugadores, misPrediccionesDetalle, prediccionesJugadasTodas } from "../lib/data";
import { soloCasi, rankingCasi } from "../lib/casi";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../lib/auth";
import { fmtHora, fmtDiaLargo } from "../lib/fechas";
import type { MiPrediccion, ResultadoPrediccion } from "../lib/types";

// Etiqueta + color de cada categoria (mismo criterio cromatico que PanelTormenta).
const RESULTADO: Record<ResultadoPrediccion, { texto: string; clase: string }> = {
  exacto: { texto: "Exacto", clase: "bg-emerald-400/15 text-emerald-400" },
  diferencia: { texto: "Diferencia", clase: "bg-amber-400/15 text-amber-400" },
  acierto: { texto: "Acierto", clase: "bg-orange-500/15 text-orange-400" },
  falla: { texto: "Falla", clase: "bg-rose-500/15 text-rose-400" },
};

// Borde de la tarjeta: SOLO 2 colores -> rojo si falla, verde en todo lo demas.
const BORDE: Record<ResultadoPrediccion, string> = {
  exacto: "border-green-500",
  diferencia: "border-green-500",
  acierto: "border-green-500",
  falla: "border-red-500",
};

// Color del numero de puntos segun la categoria (verde = exacto, etc.).
const PUNTOS: Record<ResultadoPrediccion, string> = {
  exacto: "text-green-400",
  diferencia: "text-amber-400",
  acierto: "text-orange-400",
  falla: "text-red-400",
};

type Tab = "lista" | "casi";

export default function MisPredicciones() {
  const navigate = useNavigate();
  const { jugador } = useAuth();
  const [tab, setTab] = useState<Tab>("lista");

  return (
    <div className="max-w-md mx-auto pb-10">
      <header className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="text-oro">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">Mis predicciones</h1>
      </header>

      {/* Pestanas */}
      <div className="px-4">
        <div className="grid grid-cols-2 border-b border-borde">
          <TabBtn activo={tab === "lista"} onClick={() => setTab("lista")}>
            Lista
          </TabBtn>
          <TabBtn activo={tab === "casi"} onClick={() => setTab("casi")}>
            Casi
          </TabBtn>
        </div>
      </div>

      {tab === "lista" ? (
        <ListaTab jugadorId={jugador?.id ?? null} />
      ) : (
        <CasiTab miId={jugador?.id ?? null} />
      )}
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
      className={`pb-2 pt-1 text-center text-sm font-semibold transition-colors ${
        activo
          ? "text-white border-b-2 border-oro"
          : "text-neutral-400 border-b-2 border-transparent"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- Tab "Lista"
function ListaTab({ jugadorId }: { jugadorId: string | null }) {
  const { data, cargando, error } = useAsync(
    () =>
      jugadorId
        ? misPrediccionesDetalle(jugadorId)
        : Promise.resolve([] as MiPrediccion[]),
    [jugadorId]
  );

  const todas = data ?? [];
  // Jugados (final) mas reciente arriba; luego los proximos ya pronosticados.
  const jugados = todas
    .filter((p) => p.estado === "final")
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const proximos = todas
    .filter((p) => p.estado !== "final")
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  return (
    <>
      {cargando && (
        <p className="px-4 mt-3 text-neutral-400 text-sm">Cargando tus predicciones...</p>
      )}
      {error && (
        <p className="px-4 mt-3 text-rose-400 text-sm">
          No se pudieron cargar tus predicciones.
        </p>
      )}

      {!cargando && !error && todas.length === 0 && (
        <p className="px-4 mt-3 text-neutral-400 text-sm">
          Aun no has hecho ninguna prediccion.
        </p>
      )}

      {jugados.length > 0 && <Seccion titulo="Jugados" filas={jugados} />}
      {proximos.length > 0 && (
        <Seccion titulo="Proximos (ya pronosticados)" filas={proximos} />
      )}
    </>
  );
}

// ---------------------------------------------------------------- Tab "Casi"
function CasiTab({ miId }: { miId: string | null }) {
  const [sel, setSel] = useState<string | null>(miId);
  const { data, cargando, error } = useAsync(
    () => Promise.all([prediccionesJugadasTodas(), listarJugadores()]),
    []
  );

  const todas = data?.[0] ?? [];
const jugadores = data?.[1] ?? [];
  const nombres = new Map<string, string>(
    jugadores.map((j) => [j.id, j.nombre] as [string, string])
  );
  const ranking = rankingCasi(todas, nombres);

  // Detalle del jugador elegido (la tabla y el selector lo sincronizan).
  const seleccion = sel ?? miId;
  const jugadasSel = todas.filter((p) => p.jugador_id === seleccion);
  const casi = soloCasi(jugadasSel);
  const esYo = seleccion === miId;
  const nombreSel = seleccion ? nombres.get(seleccion) ?? "" : "";

  return (
    <section className="px-4 mt-3 mb-6">
      {cargando && <p className="text-neutral-400 text-sm mt-1">Calculando...</p>}
      {error && <p className="text-rose-400 text-sm mt-1">No se pudo calcular.</p>}

      {!cargando && !error && (
        <>
          {/* Mini tabla de posiciones por "casi" */}
          <h2 className="mb-2 text-sm font-bold text-oro uppercase tracking-wide">
            Tabla de "casi"
          </h2>
          <div className="bg-carbon-card border border-borde rounded-2xl overflow-hidden mb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-neutral-500 border-b border-borde">
                  <th className="text-left font-semibold py-2 pl-3 w-8">#</th>
                  <th className="text-left font-semibold py-2">Jugador</th>
                  <th className="text-right font-semibold py-2 pr-3 w-20">A 1 gol</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((f) => {
                  const activo = f.jugador_id === seleccion;
                  return (
                    <tr
                      key={f.jugador_id}
                      onClick={() => setSel(f.jugador_id)}
                      className={`cursor-pointer border-b border-borde/40 last:border-0 ${
                        activo ? "bg-oro/10" : "active:bg-white/5"
                      }`}
                    >
                      <td className="py-2 pl-3 tabular-nums text-neutral-400">{f.posicion}</td>
                      <td className={`py-2 ${activo ? "text-white font-semibold" : "text-neutral-200"}`}>
                        {f.nombre}
                        {f.jugador_id === miId ? " (tu)" : ""}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums font-bold text-oro">
                        {f.casi}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Selector de participante (sincronizado con la tabla) */}
          <label className="block mb-4">
            <span className="text-[11px] uppercase tracking-wide text-neutral-400">
              Detalle de
            </span>
            <select
              value={seleccion ?? ""}
              onChange={(e) => setSel(e.target.value)}
              className="mt-1 w-full bg-carbon-card border border-borde rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-oro"
            >
              {jugadores.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nombre}
                  {j.id === miId ? " (tu)" : ""}
                </option>
              ))}
            </select>
          </label>

          {/* Numero grande */}
          <div className="bg-carbon-card border border-borde rounded-2xl p-5 text-center mb-4">
            <div className="text-5xl font-black text-oro tabular-nums leading-none">
              {casi.length}
            </div>
            <p className="mt-2 text-sm text-neutral-200">
              {casi.length === 1 ? "vez" : "veces"} a <strong>1 gol</strong> de la clavada
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              {nombreSel ? `${nombreSel} \u00b7 ` : ""}de {jugadasSel.length}{" "}
              {jugadasSel.length === 1 ? "partido jugado" : "partidos jugados"} con pronostico
            </p>
          </div>

          {/* Explicacion corta */}
          <p className="text-[11px] text-neutral-500 mb-4 leading-snug">
            Cuenta los partidos donde falto 1 solo gol para el marcador exacto y
            tanto el pronostico como el resultado fueron victoria: los +6/+5/+4 que
            se escaparon por poquito. Empates y derrotas no cuentan.
          </p>

          {/* Lista de los "casi" del jugador elegido */}
          {casi.length === 0 ? (
            <p className="text-neutral-400 text-sm">
              Todavia no hay ningun "casi". {esYo ? "A seguir intentando!" : ""}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {casi.map((p) => (
                <PrediccionCard key={p.partido_id} p={p} casi />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function Seccion({ titulo, filas }: { titulo: string; filas: MiPrediccion[] }) {
  return (
    <section className="px-4 mt-3 mb-5">
      <h2 className="mb-2 text-sm font-bold text-oro uppercase tracking-wide">
        {titulo}
      </h2>
      <ul className="flex flex-col gap-3">
        {filas.map((p) => (
          <PrediccionCard key={p.partido_id} p={p} />
        ))}
      </ul>
    </section>
  );
}

function PrediccionCard({ p, casi = false }: { p: MiPrediccion; casi?: boolean }) {
  const navigate = useNavigate();
  const jugado = p.estado === "final";
  const cat = jugado && p.resultado ? RESULTADO[p.resultado] : null;
  // Borde por resultado (rojo falla / verde el resto); si no hay resultado, neutro.
  // En la pestana Casi todos son aciertos -> borde dorado para destacarlos.
  const borde = casi
    ? "border-oro"
    : jugado && p.resultado
    ? BORDE[p.resultado]
    : "border-borde";

  return (
    <li>
      <button
        onClick={() => navigate(`/partido/${p.partido_id}`)}
        className={`w-full text-left bg-carbon-card border ${borde} rounded-2xl p-4 active:scale-[0.99] transition-transform`}
      >
        <div className="flex items-center justify-between gap-2 text-[11px] text-neutral-400 mb-3">
          <span className="font-semibold text-neutral-300">
            {p.grupo ? `Grupo ${p.grupo}` : p.fase}
          </span>
          <span className="tabular-nums">
            {fmtDiaLargo(p.fecha)} · {fmtHora(p.fecha)}
          </span>
          <EstadoBadge estado={p.estado} className="text-[11px]" />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Equipo code={p.pais_local} nombre={p.equipo_local} />
          <Marcadores p={p} jugado={jugado} />
          <Equipo code={p.pais_visita} nombre={p.equipo_visita} />
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          {casi && (
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-oro/15 text-oro">
              A 1 gol
            </span>
          )}
          {cat && (
            <>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cat.clase}`}>
                {cat.texto}
              </span>
              <span className={`text-xs font-bold tabular-nums ${p.resultado ? PUNTOS[p.resultado] : "text-oro"}`}>
                +{p.puntos ?? 0} pts
              </span>
            </>
          )}
        </div>
      </button>
    </li>
  );
}

function Equipo({ code, nombre }: { code: string; nombre: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-24">
      <Flag code={code} size={40} nombre={nombre} />
      <span className="text-xs text-center font-medium leading-tight">{nombre}</span>
    </div>
  );
}

function Marcadores({ p, jugado }: { p: MiPrediccion; jugado: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[5.5rem]">
      <div className="text-center">
        <div className="text-2xl font-black tabular-nums leading-none">
          {p.pred_local} - {p.pred_visita}
        </div>
        <div className="text-[10px] uppercase tracking-wide text-neutral-500">
          pronostico
        </div>
      </div>
      {jugado && (
        <div className="text-center">
          <div className="text-sm font-bold tabular-nums text-neutral-200 leading-none">
            {p.goles_local ?? 0} - {p.goles_visita ?? 0}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-neutral-500">
            resultado
          </div>
        </div>
      )}
    </div>
  );
}
