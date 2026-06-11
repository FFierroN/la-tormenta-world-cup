import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Flag from "../components/Flag";
import { listarPartidos } from "../lib/data";
import { useAsync } from "../lib/useAsync";
import { ESTADO_LABEL, enCurso } from "../lib/estados";
import { fmtFechaHora, claveDia, claveHoy } from "../lib/fechas";
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

  // 1) Pestana "Proximos": SOLO la jornada activa (rola sola en el 'desde').
  const f = fechaActiva();
  const lista = partidos
    .filter((p) => {
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
  const { data: partidos, cargando, error } = useAsync(listarPartidos, []);
  const tabs = useMemo(() => (partidos ? construirTabs(partidos) : []), [partidos]);

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

  return (
    <div className="max-w-md mx-auto">
      <header className="px-4 pt-5 pb-3">
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
          <Panel tab={tabActiva} />
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
function Panel({ tab }: { tab: Tab }) {
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
          {tab.mostrarFase
            ? "No hay partidos en esta fecha."
            : "Aun no hay partidos en esta fase."}
        </p>
      ) : (
        <ul className="px-4 flex flex-col gap-3">
          {tab.partidos.map((p) => (
            <PartidoCard key={p.id} p={p} mostrarFase={tab.mostrarFase} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PartidoCard({ p, mostrarFase }: { p: Partido; mostrarFase?: boolean }) {
  const navigate = useNavigate();
  return (
    <li>
      <button
        onClick={() => navigate(`/partido/${p.id}`)}
        className="w-full text-left bg-carbon-card border border-borde rounded-2xl p-4 active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-3">
          <span>{fmtFechaHora(p.fecha)}</span>
          <span
            className={
              enCurso(p.estado) ? "text-oro font-semibold" : "text-neutral-400"
            }
          >
            {ESTADO_LABEL[p.estado]}
          </span>
        </div>
        {mostrarFase && (
          <div className="text-[11px] text-neutral-500 mb-2">
            {p.grupo ? `Grupo ${p.grupo}` : p.fase}
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
  return (
    <div className="text-2xl font-black tabular-nums">
      {p.goles_local ?? 0} - {p.goles_visita ?? 0}
    </div>
  );
}
