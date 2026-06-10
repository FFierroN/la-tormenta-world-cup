// Pantalla COPA: pestanas para Grupos + cada fase de eliminacion (llaves).
// Antes era "Grupos". El cuadro de llaves es solo visual (no afecta puntos).
import { useState } from "react";
import Llave from "../components/Llave";
import TablaGrupos from "../components/TablaGrupos";
import { listarPartidos } from "../lib/data";
import { useAsync } from "../lib/useAsync";
import { TABS_COPA } from "../lib/llaves";

export default function Copa() {
  const [tabKey, setTabKey] = useState(TABS_COPA[0].key);
  const { data, cargando, error } = useAsync(listarPartidos, []);
  const partidos = data ?? [];

  const tab = TABS_COPA.find((t) => t.key === tabKey) ?? TABS_COPA[0];
  const esGrupos = tab.fases.length === 0;
  const partidosFase = partidos.filter((p) => tab.fases.includes(p.fase));

  return (
    <div className="max-w-md mx-auto">
      <header className="px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold">Copa</h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          Grupos y llaves del Mundial. Se actualiza solo con cada resultado.
        </p>
      </header>

      {/* Pestanas con scroll horizontal */}
      <div className="overflow-x-auto no-scrollbar border-b border-borde">
        <div className="flex gap-1 px-4 min-w-max">
          {TABS_COPA.map((t) => {
            const activo = t.key === tabKey;
            return (
              <button
                key={t.key}
                onClick={() => setTabKey(t.key)}
                className={`relative py-2.5 px-3 text-sm whitespace-nowrap transition-colors ${
                  activo ? "text-oro font-bold" : "text-neutral-400 font-medium"
                }`}
              >
                {t.label}
                {activo && (
                  <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-oro" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {cargando && (
        <p className="px-4 py-6 text-neutral-400 text-sm">Cargando...</p>
      )}
      {error && (
        <p className="px-4 py-6 text-red-400 text-sm">
          No se pudo cargar. Revisa la conexion con Supabase.
        </p>
      )}

      {!cargando && !error && (
        esGrupos ? <TablaGrupos /> : <Llave partidos={partidosFase} />
      )}
    </div>
  );
}
