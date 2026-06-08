import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Flag from "../components/Flag";
import {
  MOCK_PARTIDOS,
  MOCK_EVENTOS,
  MOCK_PRONOSTICOS,
  MOCK_JUGADORES,
} from "../lib/mock";
import type { EventoPartido, Partido, Pronostico } from "../lib/types";

const ESTADO_LABEL: Record<Partido["estado"], string> = {
  programado: "Programado",
  en_vivo: "En vivo",
  medio_tiempo: "Medio tiempo",
  final: "Final del Partido",
};

type Pestana = "detalles" | "pronosticos";

export default function PartidoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pestana, setPestana] = useState<Pestana>("detalles");

  // TODO: reemplazar por fetch a Supabase (+ realtime en partidos y eventos).
  const partido = MOCK_PARTIDOS.find((p) => p.id === id);
  const eventos = (id && MOCK_EVENTOS[id]) || [];
  const pronosticos = (id && MOCK_PRONOSTICOS[id]) || [];

  if (!partido) {
    return (
      <div className="p-8 text-center text-neutral-400">
        Partido no encontrado.
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

  return (
    <div className="min-h-full bg-carbon">
      {/* ---------- Header con fondo de estadio ---------- */}
      <header className="relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(180deg, rgba(10,10,10,.55), rgba(10,10,10,.95)), url('/estadio.jpg')",
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
              <div className="text-xs text-neutral-200">{ESTADO_LABEL[partido.estado]}</div>
              {partido.estado === "programado" ? (
                <div className="text-2xl font-bold mt-1">
                  {new Date(partido.fecha).toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              ) : (
                <div className="text-4xl font-black tabular-nums mt-1">
                  {partido.goles_local ?? 0} - {partido.goles_visita ?? 0}
                </div>
              )}
            </div>
            <TeamHead code={partido.pais_visita} nombre={partido.equipo_visita} />
          </div>

          {minutosGol && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-neutral-300">
              <BallIcon />
              <span>{minutosGol}</span>
            </div>
          )}
        </div>
      </header>

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
            className={`flex items-center py-3 px-4 border-b border-borde last:border-0 ${
              e.equipo === "local" ? "" : "flex-row-reverse text-right"
            }`}
          >
            <div className="flex items-center gap-2">
              {e.tipo === "gol" ? <BallIcon /> : <RedCard />}
              {e.jugador && <span className="text-sm">{e.jugador}</span>}
            </div>
            <span className="flex-1" />
            <span className="text-sm font-semibold tabular-nums text-neutral-300">
              {e.minuto}'
            </span>
          </li>
        ))}
      </ul>
      <div className="text-center text-xs text-neutral-500 py-3">
        {partido.equipo_local} vs {partido.equipo_visita}
      </div>
    </div>
  );
}

/* ---------- Tab 2: pronosticos de los 8 ---------- */
function Pronosticos({
  partido,
  pronosticos,
}: {
  partido: Partido;
  pronosticos: Pronostico[];
}) {
  if (pronosticos.length === 0) {
    return (
      <div className="text-center text-neutral-400 py-10">
        Todavia no hay pronosticos visibles.
      </div>
    );
  }

  const nombreDe = (jid: string) => {
    const j = MOCK_JUGADORES.find((x) => x.id === jid);
    return j?.alias ?? j?.nombre ?? "Jugador";
  };

  const estadoAcierto = (pr: Pronostico): "exacto" | "acierto" | "falla" | null => {
    if (partido.goles_local == null || partido.goles_visita == null) return null;
    const exacto =
      pr.pred_local === partido.goles_local && pr.pred_visita === partido.goles_visita;
    if (exacto) return "exacto";
    const signoReal = Math.sign(partido.goles_local - partido.goles_visita);
    const signoPred = Math.sign(pr.pred_local - pr.pred_visita);
    return signoReal === signoPred ? "acierto" : "falla";
  };

  const BADGE: Record<string, string> = {
    exacto: "bg-oro text-carbon",
    acierto: "bg-emerald-600 text-white",
    falla: "bg-neutral-700 text-neutral-300",
  };
  const BADGE_LABEL: Record<string, string> = {
    exacto: "Exacto",
    acierto: "Acierto",
    falla: "Falla",
  };

  return (
    <ul className="flex flex-col gap-2">
      {pronosticos.map((pr) => {
        const st = estadoAcierto(pr);
        return (
          <li
            key={pr.id}
            className="flex items-center gap-3 bg-carbon-card border border-borde rounded-xl px-4 py-3"
          >
            <span className="flex-1 font-medium">{nombreDe(pr.jugador_id)}</span>
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
  );
}

/* ---------- iconos ---------- */
function BallIcon() {
  return (
    <svg className="w-4 h-4 text-neutral-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7l3 2.2-1.2 3.6h-3.6L9 9.2 12 7z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function RedCard() {
  return <span className="inline-block w-3 h-4 rounded-sm bg-red-600" aria-label="Tarjeta roja" />;
}
