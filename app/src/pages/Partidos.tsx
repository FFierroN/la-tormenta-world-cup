import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Flag from "../components/Flag";
import EstadoBadge from "../components/EstadoBadge";
import TramoVivo from "../components/TramoVivo";
import { listarPartidos, misPronosticos } from "../lib/data";
import { useAsync } from "../lib/useAsync";
import { useScrollRestore, guardarScroll } from "../lib/useScrollRestore";
import { useAuth } from "../lib/auth";
import { useSwipe } from "../lib/useSwipe";
import { fmtHora, fmtDiaLargo, claveDia } from "../lib/fechas";
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

// Etiqueta corta para el chip de cada fase (la data guarda el nombre largo).
const ETIQUETA_FASE: Record<string, string> = {
  Semifinales: "Semis",
  "Tercer Puesto": "3er puesto",
};

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

  // 1) Eliminatorias: una pestana por fase (Dieciseisavos..Final).
  //    REGLA DINAMICA (pedido de Felipe): las fases TODAVIA por jugar van
  //    primero (en orden), y las fases YA TERMINADAS (todos sus partidos
  //    'final') se mueven al final -> quedan "a la derecha de Final".
  const llaves = partidos.filter((p) => !p.grupo);
  const fases = [...new Set(llaves.map((p) => p.fase))].sort(
    (a, b) => ORDEN_FASE.indexOf(a) - ORDEN_FASE.indexOf(b)
  );
  const faseTerminada = (fase: string) => {
    const ps = llaves.filter((p) => p.fase === fase);
    return ps.length > 0 && ps.every((p) => p.estado === "final");
  };
  const pendientes = fases.filter((f) => !faseTerminada(f));
  const terminadas = fases.filter((f) => faseTerminada(f));
  for (const fase of [...pendientes, ...terminadas]) {
    tabs.push({
      id: `f-${fase}`,
      label: ETIQUETA_FASE[fase] ?? fase,
      mostrarFase: true,
      partidos: llaves.filter((p) => p.fase === fase).sort(porFecha),
    });
  }

  // 3) Fase de grupos: una pestana por grupo (A..L), al final (se mantienen).
  const grupos = partidos.filter((p) => p.grupo);
  const letras = [...new Set(grupos.map((p) => p.grupo as string))].sort();
  for (const letra of letras) {
    tabs.push({
      id: `g-${letra}`,
      label: `Grupo ${letra}`,
      partidos: grupos.filter((p) => p.grupo === letra).sort(porFecha),
    });
  }

  return tabs;
}

// Pestana por defecto del menu Partido: la PRIMERA fase eliminatoria que
// todavia no termina (Dieciseisavos -> Octavos -> ... -> Final). Asi la
// pantalla principal va avanzando sola a medida que se cierran las fases.
// Si todas terminaron, muestra la Final; si aun no hay llaves, cae en
// "Jugados".
function tabPorDefecto(partidos: Partido[]): string {
  const llaves = partidos.filter((p) => !p.grupo);
  const terminada = (fase: string) => {
    const ps = llaves.filter((p) => p.fase === fase);
    return ps.length > 0 && ps.every((p) => p.estado === "final");
  };
  for (const fase of ORDEN_FASE) {
    const ps = llaves.filter((p) => p.fase === fase);
    if (ps.length > 0 && !terminada(fase)) return `f-${fase}`;
  }
  return llaves.length ? "f-Final" : "jugados";
}

export default function Partidos() {
  const { jugador } = useAuth();
  const { data: partidos, cargando, error } = useAsync(listarPartidos, []);
  // Al volver de un detalle, reaparecer en la posicion del partido elegido.
  useScrollRestore("scroll:partidos", !cargando);
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

  // Default dinamico: la fase eliminatoria activa (Dieciseisavos -> ... ->
  // Final). 'override' guarda la pestana que el usuario elige a mano (o el
  // deep-link); si no hay override, manda el default calculado.
  const defaultId = useMemo(
    () => (partidos ? tabPorDefecto(partidos) : ""),
    [partidos]
  );
  const [override, setOverride] = useState<string | null>(
    grupoParam ? `g-${grupoParam}` : null
  );

  // Si llega un ?grupo despues de montar (o cambia), seguimos el deep-link.
  useEffect(() => {
    if (grupoParam) setOverride(`g-${grupoParam}`);
  }, [grupoParam]);

  const activo = override ?? defaultId;
  const tabActiva = tabs.find((t) => t.id === activo) ?? tabs[0];

  // Swipe: desliza a los lados para cambiar de pestana (con tope en los extremos).
  const irRelativo = (delta: number) => {
    const ids = tabs.map((t) => t.id);
    const i = ids.indexOf(tabActiva?.id ?? "");
    const j = Math.min(ids.length - 1, Math.max(0, i + delta));
    if (j !== i) setOverride(ids[j]);
  };
  const swipe = useSwipe(() => irRelativo(1), () => irRelativo(-1));

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
          <BarraPestanas tabs={tabs} activo={tabActiva.id} onSelect={setOverride} />
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
  const enJuego = p.estado === "en_vivo" || p.estado === "entretiempo";
  return (
    <li>
      <button
        onClick={() => {
          guardarScroll("scroll:partidos");
          navigate(`/partido/${p.id}`);
        }}
        className="w-full text-left bg-carbon-card border border-borde rounded-2xl p-4 active:scale-[0.99] transition-transform"
      >
        {/* Cronometro en vivo, arriba al centro de la tarjeta */}
        {/* Tramo en vivo (1er/Entretiempo/2do), arriba al centro de la tarjeta */}
        {enJuego && (
          <div className="flex justify-center mb-2">
            <TramoVivo partido={p} />
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
        {p.puntaje_anulado && (
          <div className="text-center text-xs font-bold text-amber-400 mb-2">
            Puntaje anulado · no suma puntos
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
