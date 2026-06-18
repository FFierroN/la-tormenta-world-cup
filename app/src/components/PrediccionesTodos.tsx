// Lista de las predicciones especiales de TODOS los participantes, en orden de
// tabla. Cuerpo REUTILIZABLE (DRY): lo usan la pestana "Predicciones" de Tabla
// y la ruta /especiales-todos (EspecialesWC). No trae header propio -> cada
// consumidor pone el suyo (o ninguno, como la pestana).
//
// Guardrail anti-copia: si la ventana de edicion sigue ABIERTA, solo se ve tu
// propia tarjeta (para no copiarle a nadie). Cuando el admin cierra la ventana,
// se revelan las de todos.
//
// Acordeon: una sola tarjeta abierta a la vez (mas prolijo en celular).
import { useMemo, useState } from "react";
import EspecialesJugador from "./EspecialesJugador";
import { useAuth } from "../lib/auth";
import { useAsync } from "../lib/useAsync";
import {
  listarPartidos,
  obtenerTabla,
  prediccionesHabilitadas,
  todasEspeciales,
} from "../lib/data";
import { mapaEquipoPais } from "../lib/banderas";
import type { Especiales } from "../lib/types";

export default function PrediccionesTodos() {
  const { jugador } = useAuth();
  const { data: filas, cargando: cargF, error: errF } = useAsync(obtenerTabla, []);
  const { data: especiales } = useAsync(todasEspeciales, []);
  const { data: partidos } = useAsync(listarPartidos, []);
  const { data: ventanaAbierta } = useAsync(prediccionesHabilitadas, []);

  // Cual acordeon esta abierto (jugador_id) -> uno a la vez.
  const [abiertoId, setAbiertoId] = useState<string | null>(null);

  // Mapa nombre-equipo -> ISO para las banderas (se arma una vez).
  const mapa = useMemo(() => mapaEquipoPais(partidos ?? []), [partidos]);

  // Especiales indexadas por jugador_id para cruzar con la tabla.
  const porJugador = useMemo(() => {
    const m = new Map<string, Especiales>();
    for (const e of especiales ?? []) {
      const { jugador_id, ...resto } = e;
      m.set(jugador_id, resto);
    }
    return m;
  }, [especiales]);

  const filasOrdenadas = filas ?? [];
  const total = filasOrdenadas.length;
  const oculto = ventanaAbierta === true; // mientras este abierta, ocultar ajenas

  // Si la ventana sigue abierta, solo mostramos tu propia fila.
  const visibles = oculto
    ? filasOrdenadas.filter((f) => jugador && f.jugador_id === String(jugador.id))
    : filasOrdenadas;

  return (
    <>
      {cargF && <p className="px-4 text-neutral-400 text-sm">Cargando...</p>}
      {errF && (
        <p className="px-4 text-red-400 text-sm">
          No se pudo cargar. Revisa la conexión con Supabase.
        </p>
      )}

      {oculto && (
        <div className="mx-4 mb-4 rounded-xl border border-borde bg-carbon-card p-3 text-sm text-neutral-300">
          Las predicciones de los demás se revelan cuando cierre la ventana de
          edición. Por ahora solo ves las tuyas.
        </div>
      )}

      <ul className="px-4 pb-10 flex flex-col gap-3">
        {visibles.map((f) => (
          <EspecialesJugador
            key={f.jugador_id}
            fila={f}
            total={total}
            especiales={porJugador.get(f.jugador_id) ?? null}
            mapa={mapa}
            esYo={!!jugador && f.jugador_id === String(jugador.id)}
            abierto={abiertoId === f.jugador_id}
            onToggle={() =>
              setAbiertoId((id) => (id === f.jugador_id ? null : f.jugador_id))
            }
          />
        ))}
      </ul>
    </>
  );
}
