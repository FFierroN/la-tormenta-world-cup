import { useNavigate } from "react-router-dom";
import Flag from "../components/Flag";
import EstadoBadge from "../components/EstadoBadge";
import { misPrediccionesDetalle } from "../lib/data";
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

export default function MisPredicciones() {
  const navigate = useNavigate();
  const { jugador } = useAuth();
  const { data, cargando, error } = useAsync(
    () =>
      jugador
        ? misPrediccionesDetalle(jugador.id)
        : Promise.resolve([] as MiPrediccion[]),
    [jugador?.id]
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
    <div className="max-w-md mx-auto pb-10">
      <header className="px-4 pt-5 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Volver" className="text-oro">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">Mis predicciones</h1>
      </header>

      {cargando && (
        <p className="px-4 text-neutral-400 text-sm">Cargando tus predicciones...</p>
      )}
      {error && (
        <p className="px-4 text-rose-400 text-sm">
          No se pudieron cargar tus predicciones.
        </p>
      )}

      {!cargando && !error && todas.length === 0 && (
        <p className="px-4 text-neutral-400 text-sm">
          Aun no has hecho ninguna prediccion.
        </p>
      )}

      {jugados.length > 0 && (
        <Seccion titulo="Jugados" filas={jugados} />
      )}
      {proximos.length > 0 && (
        <Seccion titulo="Proximos (ya pronosticados)" filas={proximos} />
      )}
    </div>
  );
}

function Seccion({ titulo, filas }: { titulo: string; filas: MiPrediccion[] }) {
  return (
    <section className="px-4 mt-2 mb-5">
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

function PrediccionCard({ p }: { p: MiPrediccion }) {
  const navigate = useNavigate();
  const jugado = p.estado === "final";
  const cat = jugado && p.resultado ? RESULTADO[p.resultado] : null;
  // Borde por resultado (rojo falla / verde el resto); si no hay resultado, neutro.
  const borde = jugado && p.resultado ? BORDE[p.resultado] : "border-borde";

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

        {cat && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${cat.clase}`}>
              {cat.texto}
            </span>
            <span className={`text-xs font-bold tabular-nums ${p.resultado ? PUNTOS[p.resultado] : "text-oro"}`}>
              +{p.puntos ?? 0} pts
            </span>
          </div>
        )}
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
