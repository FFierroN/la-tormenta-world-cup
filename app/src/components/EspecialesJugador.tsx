// Tarjeta-acordeon de un participante para la pestana piloto de especiales.
//
// Colapsada: posicion + mini avatar + alias + vistazo (campeon y finalistas).
// Expandida: nombre/alias arriba (en la cabecera); debajo, avatar GRANDE a la
// izquierda y al lado las banderas organizadas (campeon, finalistas y
// semifinalistas en grilla 2x2 para que caigan prolijos en celular); al pie,
// los premios individuales (texto). Estilo de la app actual (carbon-card / oro).
// Reusa Avatar y Flag (DRY). Controlada desde afuera (un solo acordeon abierto).
//
// Sin emojis a proposito (el proyecto no los permite en archivos): el campeon
// se distingue con un anillo dorado en su bandera; los premios con un punto oro.
import Avatar from "./Avatar";
import Flag from "./Flag";
import { avatarPorPosicion, bordePorPosicion } from "../lib/avatares";
import { codigoPais, type MapaEquipoPais } from "../lib/banderas";
import type { Especiales, FilaTabla } from "../lib/types";

export default function EspecialesJugador({
  fila,
  total,
  especiales,
  mapa,
  esYo,
  abierto,
  onToggle,
}: {
  fila: FilaTabla;
  total: number;
  especiales: Especiales | null;
  mapa: MapaEquipoPais;
  esYo: boolean;
  abierto: boolean;
  onToggle: () => void;
}) {
  const e = especiales;
  const finalistas = [e?.finalista_1, e?.finalista_2];
  const semis = [
    e?.semifinalista_1,
    e?.semifinalista_2,
    e?.semifinalista_3,
    e?.semifinalista_4,
  ];

  return (
    <li
      className={`overflow-hidden rounded-2xl border bg-carbon-card ${
        esYo ? "border-oro/60" : "border-borde"
      }`}
    >
      {/* Cabecera (siempre visible, abre/cierra el acordeon) */}
      <button
        onClick={onToggle}
        aria-expanded={abierto}
        className="w-full flex items-center gap-3 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oro"
      >
        <span className="w-6 shrink-0 text-center font-bold text-oro tabular-nums">
          {fila.posicion}
        </span>

        {/* Mini avatar solo cuando esta colapsado: al expandir, el grande del
            cuerpo toma el relevo (no duplicamos la cara). */}
        {!abierto && (
          <Avatar
            src={avatarPorPosicion(fila, total)}
            nombre={fila.nombre}
            width={40}
            variante={bordePorPosicion(fila.posicion, total)}
          />
        )}

        <span className="flex-1 min-w-0">
          <span className="block font-bold leading-tight truncate">
            {fila.alias ?? fila.nombre}
            {esYo && (
              <span className="ml-1.5 text-[10px] font-bold text-oro">(tú)</span>
            )}
          </span>
          {/* Vistazo: campeon (anillo oro) + finalistas en mini */}
          {!abierto && (
            <span className="mt-1 flex items-center gap-1.5">
              <MiniBandera mapa={mapa} equipo={e?.campeon ?? null} campeon />
              {finalistas.map((t, i) => (
                <MiniBandera key={i} mapa={mapa} equipo={t ?? null} />
              ))}
            </span>
          )}
        </span>

        <Chevron abierto={abierto} />
      </button>

      {/* Cuerpo expandible */}
      {abierto && (
        <div className="px-3 pb-4 pt-1 flex flex-col gap-4">
          {!e ? (
            <p className="text-sm text-neutral-400">
              Este participante no dejó predicciones especiales.
            </p>
          ) : (
            <>
              {/* Avatar grande a la izquierda + banderas organizadas al lado */}
              <div className="flex gap-3">
                <div className="shrink-0">
                  <Avatar
                    src={avatarPorPosicion(fila, total)}
                    nombre={fila.nombre}
                    width={84}
                    variante={bordePorPosicion(fila.posicion, total)}
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                  <BloqueEquipos titulo="Campeón" equipos={[e.campeon]} mapa={mapa} campeon />
                  <BloqueEquipos titulo="Finalistas" equipos={finalistas} mapa={mapa} />
                  {/* Semis en grilla 2x2: siempre caen prolijos en celular */}
                  <BloqueEquipos titulo="Semifinalistas" equipos={semis} mapa={mapa} grid />
                </div>
              </div>

              <div className="border-t border-borde pt-3 grid grid-cols-1 gap-2">
                <Premio label="Goleador" valor={e.goleador} />
                <Premio label="Asistidor" valor={e.asistidor} />
                <Premio label="Mejor jugador" valor={e.mejor_jugador} />
                <Premio label="Mejor arquero" valor={e.mejor_arquero} />
                <Premio label="Mejor joven" valor={e.mejor_joven} />
              </div>
            </>
          )}
        </div>
      )}
    </li>
  );
}

// ---- sub-componentes ----

// Bloque de banderas con titulo (Campeon / Finalistas / Semis).
function BloqueEquipos({
  titulo,
  equipos,
  mapa,
  campeon,
  grid,
}: {
  titulo: string;
  equipos: (string | null | undefined)[];
  mapa: MapaEquipoPais;
  campeon?: boolean;
  grid?: boolean;
}) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
        {titulo}
      </h3>
      <div className={grid ? "grid grid-cols-2 gap-2 justify-items-center" : "flex flex-wrap gap-3"}>
        {equipos.map((t, i) => (
          <BanderaEtiqueta
            key={i}
            mapa={mapa}
            equipo={t ?? null}
            campeon={campeon}
          />
        ))}
      </div>
    </div>
  );
}

// Bandera (rectangular) + nombre del equipo debajo. Placeholder si esta vacio.
// El campeon lleva un anillo dorado para destacarlo (en vez de un icono).
function BanderaEtiqueta({
  mapa,
  equipo,
  campeon,
}: {
  mapa: MapaEquipoPais;
  equipo: string | null;
  campeon?: boolean;
}) {
  if (!equipo) {
    return (
      <div className="flex flex-col items-center gap-1 w-16">
        <div className="w-[44px] h-[31px] rounded-lg border border-dashed border-borde bg-carbon-soft" />
        <span className="text-[10px] text-neutral-500">Sin elegir</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1 w-16">
      <div className={campeon ? "rounded-lg ring-2 ring-oro p-0.5" : ""}>
        <Flag code={codigoPais(mapa, equipo)} nombre={equipo} size={44} rect />
      </div>
      <span className="text-[10px] text-center leading-tight text-neutral-200 line-clamp-2">
        {equipo}
      </span>
    </div>
  );
}

// Bandera mini para el vistazo de la cabecera colapsada.
function MiniBandera({
  mapa,
  equipo,
  campeon,
}: {
  mapa: MapaEquipoPais;
  equipo: string | null;
  campeon?: boolean;
}) {
  if (!equipo) {
    return (
      <span className="inline-block w-[22px] h-[15px] rounded border border-dashed border-borde bg-carbon-soft" />
    );
  }
  return (
    <span className={campeon ? "inline-flex rounded ring-1 ring-oro" : "inline-flex"}>
      <Flag code={codigoPais(mapa, equipo)} nombre={equipo} size={22} rect />
    </span>
  );
}

// Fila de premio individual (punto oro + label + nombre o "Sin elegir").
function Premio({ label, valor }: { label: string; valor: string | null }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className="w-1.5 h-1.5 rounded-full bg-oro shrink-0"
        aria-hidden="true"
      />
      <span className="text-neutral-400 w-28 shrink-0">{label}</span>
      <span className={valor ? "font-semibold" : "text-neutral-500"}>
        {valor ?? "Sin elegir"}
      </span>
    </div>
  );
}

function Chevron({ abierto }: { abierto: boolean }) {
  return (
    <svg
      className={`w-5 h-5 shrink-0 text-neutral-400 transition-transform ${
        abierto ? "rotate-180" : ""
      }`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
