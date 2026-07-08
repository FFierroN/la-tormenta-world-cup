// =====================================================================
// LlavesPredicciones.tsx  ·  Sub-pestana "Llaves" dentro de Predicciones.
// =====================================================================
// - Tarjeta fija "Mi pronostico" -> abre TU cuadro editable (/sandbox/:id).
// - 3 cajitas de "podio mas elegido por todos" (resumen global).
// - Lista de OTROS participantes que ya completaron su cuadro (avatar +
//   bandera de su campeon) -> tocar abre su cuadro en solo lectura.
import { useNavigate } from "react-router-dom";
import Flag from "./Flag";
import Avatar from "./Avatar";
import { CajaPosicion, POSICIONES } from "./podioSandbox";
import { useAuth } from "../lib/auth";
import { useAsync } from "../lib/useAsync";
import {
  obtenerTabla,
  obtenerSandboxPodio,
  sandboxParticipantes,
} from "../lib/data";
import { avatarPorPosicion, bordePorPosicion } from "../lib/avatares";
import type { FilaTabla } from "../lib/types";

export default function LlavesPredicciones() {
  const navigate = useNavigate();
  const { jugador } = useAuth();
  const { data: tabla } = useAsync(obtenerTabla, []);
  const { data: participantes } = useAsync(sandboxParticipantes, []);
  const { data: votos } = useAsync(obtenerSandboxPodio, []);

  const filas = tabla ?? [];
  const total = filas.length;
  const porId = new Map<string, FilaTabla>();
  for (const f of filas) porId.set(f.jugador_id, f);

  const miId = jugador ? String(jugador.id) : null;
  const listaParticipantes = participantes ?? [];
  const miParticipacion = miId ? listaParticipantes.find((p) => p.jugadorId === miId) : undefined;
  const otros = listaParticipantes.filter((p) => p.jugadorId !== miId);

  const miFila = miId ? porId.get(miId) : undefined;
  const miNombre = miFila?.alias ?? miFila?.nombre ?? jugador?.nombre ?? "Yo";

  const abrir = (jugadorId: string, nombre: string) =>
    navigate(`/sandbox/${jugadorId}`, { state: { nombre } });

  const votosDe = (key: (typeof POSICIONES)[number]["key"]) =>
    (votos ?? []).filter((v) => v.posicion === key);

  return (
    <div className="pb-10">
      {/* Tarjeta fija: mi pronostico (editable) */}
      {miId && (
        <button
          type="button"
          onClick={() => abrir(miId, miNombre)}
          className="mx-4 mt-4 w-[calc(100%-2rem)] flex items-center gap-3 rounded-2xl border border-neon-menta/40 bg-neon-menta/10 p-3 text-left active:scale-[0.99] transition-transform"
        >
          {miFila && (
            <Avatar
              src={avatarPorPosicion(miFila, total)}
              nombre={miNombre}
              width={44}
              variante={bordePorPosicion(miFila.posicion, total)}
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wide text-neon-menta">
              Mi pronostico
            </div>
            <div className="font-bold truncate">
              {miParticipacion ? "Editar mi cuadro" : "Armar mi cuadro"}
            </div>
          </div>
          {miParticipacion?.campeonPais && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-lg leading-none">{"\u{1F3C6}"}</span>
              <Flag code={miParticipacion.campeonPais} size={22} nombre={miParticipacion.campeon} />
            </div>
          )}
          <span className="text-neon-menta text-xl shrink-0" aria-hidden="true">
            {"\u203A"}
          </span>
        </button>
      )}

      {/* 3 cajitas del podio mas elegido por todos */}
      <div className="mt-6 flex flex-col gap-4">
        {POSICIONES.map((pos) => (
          <CajaPosicion key={pos.key} estilo={pos} filas={votosDe(pos.key)} />
        ))}
      </div>

      {/* Lista de otros participantes */}
      <h3 className="px-4 mt-8 mb-2 text-xs font-bold uppercase tracking-wide text-neutral-300">
        Cuadros de los demas
      </h3>
      {otros.length === 0 ? (
        <p className="px-4 text-sm text-neutral-500">
          Nadie mas ha armado su cuadro todavia.
        </p>
      ) : (
        <ul className="px-4 flex flex-col gap-2">
          {otros.map((p) => {
            const f = porId.get(p.jugadorId);
            const nombre = f?.alias ?? f?.nombre ?? "Participante";
            return (
              <li key={p.jugadorId}>
                <button
                  type="button"
                  onClick={() => abrir(p.jugadorId, nombre)}
                  className="w-full flex items-center gap-3 rounded-2xl border border-borde bg-carbon-card p-3 text-left active:scale-[0.99] transition-transform"
                >
                  {f && (
                    <Avatar
                      src={avatarPorPosicion(f, total)}
                      nombre={nombre}
                      width={40}
                      variante={bordePorPosicion(f.posicion, total)}
                    />
                  )}
                  <span className="min-w-0 flex-1 font-semibold truncate">{nombre}</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <span className="text-base leading-none">{"\u{1F3C6}"}</span>
                    <Flag code={p.campeonPais ?? "XX"} size={22} nombre={p.campeon} />
                  </span>
                  <span className="text-neutral-500 text-xl shrink-0" aria-hidden="true">
                    {"\u203A"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
