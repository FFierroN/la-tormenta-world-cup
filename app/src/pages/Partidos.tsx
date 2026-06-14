import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Flag from "../components/Flag";
import EstadoBadge from "../components/EstadoBadge";
import RelojVivo from "../components/RelojVivo";
import BotonEspeciales from "../components/BotonEspeciales";
import { listarPartidos, misPronosticos } from "../lib/data";
import { useAsync } from "../lib/useAsync";
import { useAuth } from "../lib/auth";
import { useSwipe } from "../lib/useSwipe";
import { fmtHora, fmtDiaLargo, claveDia, claveHoy } from "../lib/fechas";
import type { Partido } from "../lib/types";

// Orden de las fases de eliminacion (para mostrarlas en secuencia).
const ORDEN_FASE = [
  "Dieciseisavos",
  "Octavos",
  "Cuartos",
  "Semifinales",
  "Tercer Puesto",
  "Final",
];

// Las 3 fechas (jornadas) de la fase de grupos, con su rango (YYYY-MM-DD).
const FECHAS = [
  { id: "fecha1", label: "Fecha 1", desde: "2026-06-11", hasta: "2026-06-17" },
  { id: "fecha2", label: "Fecha 2", desde: "2026-06-18", hasta: "2026-06-23" },
  { id: "fecha3", label: "Fecha 3", desde: "2026-06-24", hasta: "2026-06-27" },
];

type Tab = {
  id: string; // "fecha1".. | "g-A".."g-L" | "f-Octavos"...
  label: string; // texto del chip
  subtitulo?: string; // etiqueta superior (rango de fechas)
  mostrarFase?: boolean; // muestra grupo/fase en cada tarjeta (tabs mixtas)
  partidos: Partido[];
};

const porFecha = (a: Partido, b: Partido) => a.fecha.localeCompare(b.fecha);

// Un partido se puede pronosticar si sigue programado y aun no empieza
// (misma regla que valida el servidor en guardar_pronostico).
function esPronosticable(p: Partido): boolean {
  return p.estado === "programado" && new Date(p.fecha).getTime() > Date.now();
}

// Agrupa una lista (ya ordenada por fecha) en secciones por dia.
function agruparPorDia(partidos: Partido[]): { dia: string; partidos: Partido[] }[] {
  const grupos: { dia: string; partidos: Partido[] }[] = [];
  let claveActual = "";
  for (const p of partidos) {
    const c = claveDia(p.fecha);
    if (c !== claveActual) {
      grupos.push({ dia: fmtDiaLargo(p.fecha), partidos: [] });
      claveActual = c;
    }
    grupos[grupos.length - 1].partidos.push(p);
  }
  return grupos;
}

// "2026-06-11" -> "11/06"
function ddmm(clave: string): string {
  const [, m, d] = clave.split("-");
  return `${d}/${m}`;
}

// Jornada ACTIVA: la ultima fecha cuyo dia de inicio (desde, a las 00:00) ya
// llego. Asi Fecha 2 y Fecha 3 "aparecen" recien cuando arranca su dia.
// Antes del Mundial (hoy < Fecha 1) muestra Fecha 1.
function fechaActiva(): (typeof FECHAS)[number] {
  const hoy = claveHoy();
  let activa = FECHAS[0];
  for (const f of FECHAS) if (hoy >= f.desde) activa = f;
  return activa;
}

function construirTabs(partidos: Partido[]): Tab[] {
  const tabs: Tab[] = [];

  // 0) Pestana "Jugados": TODOS los finalizados, mas reciente arriba.
  //    Va a la izquierda de "Proximos" pero NO es la pestana por defecto.
  //    Se agrupa por dia como el resto (agruparPorDia respeta el orden dado).
  const jugados = partidos
    .filter((p) => p.estado === "final")
    .sort((a, b) => b.fecha.localeCompare(a.fecha)); // desc: lo ultimo primero
  tabs.push({
    id: "jugados",
    label: "Jugados",
    mostrarFase: true,
    partidos: jugados,
  });

  // 1) Pestana "Proximos": SOLO la jornada activa (rola sola en el 'desde').
  //    Ademas escondemos los que ya terminaron: esos viven en su grupo/fase.
  const f = fechaActiva();
  const lista = partidos
    .filter((p) => {
      if (p.estado === "final") return false; // finalizado -> fuera de Proximos
      const d = claveDia(p.fecha);
      return d >= f.desde && d <= f.hasta;
    })
    .sort(porFecha);
  tabs.push({
    id: "proximos",
    label: "Pr\u00f3ximos",
    subtitulo: `${f.label} \u00b7 ${ddmm(f.desde)} al ${ddmm(f.hasta)}`,
    mostrarFase: true,
    partidos: lista,
  });

  // 2) Fase de grupos: una pestana por grupo (A..L).
  const grupos = partidos.filter((p) => p.grupo);
  const letras = [...new Set(grupos.map((p) => p.grupo as string))].sort();
  for (const letra of letras) {
    tabs.push({
      id: `g-${letra}`,
      label: `Grupo ${letra}`,
      partidos: grupos.filter((p) => p.grupo === letra).sort(porFecha),
    });
  }

  // 3) Eliminatorias: una pestana por fase, en orden.
  const llaves = partidos.filter((p) => !p.grupo);
  const fases = [...new Set(llaves.map((p) => p.fase))].sort(
    (a, b) => ORDEN_FASE.indexOf(a) - ORDEN_FASE.indexOf(b)
  );
  for (const fase of fases) {
    tabs.push({
      id: `f-${fase}`,
      label: fase,
      mostrarFase: true,
      partidos: llaves.filter((p) => p.fase === fase).sort(porFecha),
    });
  }

  return tabs;
}

export default function Partidos() {
  const { jugador } = useAuth();
  const { data: partidos, cargando, error } = useAsync(listarPartidos, []);
  const tabs = useMemo(() => (partidos ? construirTabs(partidos) : []), [partidos]);

  // IDs de partidos que YO ya pronostique (para la etiqueta).
  const { data: pronIds } = useAsync(
    () => (jugador ? misPronosticos(jugador.id) : Promise.resolve(new Set<string>())),
    [jugador?.id]
  );
  const pronosticadoIds = pronIds ?? new Set<string>();

  // Deep-link desde Grupos: /partidos?grupo=A -> abre esa pestana.
  const [params] = useSearchParams();
  const grupoParam = params.get("grupo");
  const [activo, setActivo] = useState<string>(
    grupoParam ? `g-${grupoParam}` : "proximos"
  );

  // Si llega un ?grupo despues de montar (o cambia), seguimos el deep-link.
  useEffect(() => {
    if (grupoParam) setActivo(`g-${grupoParam}`);
  }, [grupoParam]);

  const tabActiva = tabs.find((t) => t.id === activo) ?? tabs[0];

  // Swipe: desliza a los lados para cambiar de pestana (con tope en los extremos).
  const irRelativo = (delta: number) => {
    const ids = tabs.map((t) => t.id);
    const i = ids.indexOf(tabActiva?.id ?? "");
    const j = Math.min(ids.length - 1, Math.max(0, i + delta));
    if (j !== i) setActivo(ids[j]);
  };
  const swipe = useSwipe(() => irRelativo(1), () => irRelativo(-1));

  return (
    <div className="max-w-md mx-auto">
      <header className="px-4 pt-5 pb-3">
        <BotonEspeciales className="mb-3" />
        <h1 className="text-xl font-bold">Partidos</h1>
      </header>

      {cargando && (
        <p className="px-4 text-neutral-400 text-sm">Cargando partidos...</p>
      )}
      {error && (
        <p className="px-4 text-red-400 text-sm">
          No se pudieron cargar los partidos. Revisa la conexion con Supabase.
        </p>
      )}
      {!cargando && !error && partidos && partidos.length === 0 && (
        <p className="px-4 text-neutral-400 text-sm">Aun no hay partidos.</p>
      )}

      {partidos && partidos.length > 0 && tabActiva && (
        <>
          <BarraPestanas tabs={tabs} activo={tabActiva.id} onSelect={setActivo} />
          <div {...swipe}>
            <Panel tab={tabActiva} pronosticadoIds={pronosticadoIds} />
          </div>
        </>
      )}
    </div>
  );
}

// ------------------------------------------------------------- barra de tabs
function BarraPestanas({
  tabs,
  activo,
  onSelect,
}: {
  tabs: Tab[];
  activo: string;
  onSelect: (id: string) => void;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  // La pestana activa se desliza sola a la vista (barra horizontal).
  useEffect(() => {
    refs.current[activo]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activo]);

  // Navegacion con teclado (flechas / Home / End) entre pestanas.
  function onKeyDown(e: KeyboardEvent) {
    const ids = tabs.map((t) => t.id);
    const i = ids.indexOf(activo);
    let j = i;
    if (e.key === "ArrowRight") j = (i + 1) % ids.length;
    else if (e.key === "ArrowLeft") j = (i - 1 + ids.length) % ids.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = ids.length - 1;
    else return;
    e.preventDefault();
    onSelect(ids[j]);
    refs.current[ids[j]]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label="Filtrar partidos por grupo o fase"
      onKeyDown={onKeyDown}
      className="sticky top-0 z-20 bg-carbon border-b border-borde flex gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((t) => {
        const sel = t.id === activo;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={sel}
            aria-controls={`panel-${t.id}`}
            tabIndex={sel ? 0 : -1}
            onClick={() => onSelect(t.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-oro ${
              sel
                ? "bg-oro text-carbon"
                : "bg-carbon-card text-neutral-300 border border-borde active:bg-carbon-soft"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------- panel
function Panel({
  tab,
  pronosticadoIds,
}: {
  tab: Tab;
  pronosticadoIds: Set<string>;
}) {
  return (
    <div
      role="tabpanel"
      id={`panel-${tab.id}`}
      aria-labelledby={`tab-${tab.id}`}
      tabIndex={0}
      className="outline-none pt-4 pb-2"
    >
      {tab.subtitulo && (
        <p className="px-4 mb-3 text-sm font-bold text-oro uppercase tracking-wide">
          {tab.subtitulo}
        </p>
      )}

      {tab.partidos.length === 0 ? (
        <p className="px-4 text-neutral-400 text-sm">
          {tab.id === "jugados"
            ? "Aun no se ha jugado ningun partido."
            : tab.mostrarFase
            ? "No hay partidos en esta fecha."
            : "Aun no hay partidos en esta fase."}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {agruparPorDia(tab.partidos).map((g) => (
            <section key={g.dia}>
              <h2 className="px-4 mb-2 flex items-center gap-2 text-sm font-bold text-neutral-200">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-oro" />
                {g.dia}
              </h2>
              <ul className="px-4 flex flex-col gap-3">
                {g.partidos.map((p) => (
                  <PartidoCard
                    key={p.id}
                    p={p}
                    mostrarFase={tab.mostrarFase}
                    pronosticado={pronosticadoIds.has(p.id)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function PartidoCard({
  p,
  mostrarFase,
  pronosticado,
}: {
  p: Partido;
  mostrarFase?: boolean;
  pronosticado?: boolean;
}) {
  const navigate = useNavigate();
  const puedePronosticar = esPronosticable(p);
  const jugado = p.estado === "final";
  const anulado = p.estado === "anulado";
  const enVivo = p.estado === "en_vivo" || p.estado === "alargue";
  return (
    <li>
      <button
        onClick={() => navigate(`/partido/${p.id}`)}
        className="w-full text-left bg-carbon-card border border-borde rounded-2xl p-4 active:scale-[0.99] transition-transform"
      >
        {/* Cronometro en vivo, arriba al centro de la tarjeta */}
        {enVivo && (
          <div className="flex justify-center mb-2">
            <RelojVivo partido={p} />
          </div>
        )}
        <div className="flex items-center justify-between gap-2 text-xs text-neutral-400 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="tabular-nums font-semibold text-neutral-300">
              {fmtHora(p.fecha)}
            </span>
            {puedePronosticar && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  pronosticado
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {pronosticado ? "Pronosticado" : "Pendiente"}
              </span>
            )}
          </div>
          <EstadoBadge estado={p.estado} className="text-xs" />
        </div>
        {mostrarFase && (
          <div className="text-[11px] text-neutral-500 mb-2">
            {p.grupo ? `Grupo ${p.grupo}` : p.fase}
          </div>
        )}
        {jugado && (
          <div className="text-center text-sm font-bold text-neutral-100 mb-2">
            Partido Finalizado
          </div>
        )}
        {anulado && (
          <div className="text-center text-sm font-bold text-neutral-400 mb-2">
            Partido Anulado · no suma puntos
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <Equipo code={p.pais_local} nombre={p.equipo_local} />
          <Marcador p={p} />
          <Equipo code={p.pais_visita} nombre={p.equipo_visita} />
        </div>
      </button>
    </li>
  );
}

function Equipo({ code, nombre }: { code: string; nombre: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-24">
      <Flag code={code} size={44} nombre={nombre} />
      <span className="text-xs text-center font-medium leading-tight">{nombre}</span>
    </div>
  );
}

function Marcador({ p }: { p: Partido }) {
  if (p.estado === "programado") {
    return <div className="text-sm font-semibold text-neutral-500">VS</div>;
  }
  if (p.estado === "anulado") {
    return <div className="text-sm font-semibold text-neutral-500">Anulado</div>;
  }
  return (
    <div className="text-2xl font-black tabular-nums">
      {p.goles_local ?? 0} - {p.goles_visita ?? 0}
    </div>
  );
}
