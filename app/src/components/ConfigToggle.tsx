import { useEffect, useState } from "react";

// Toggle de configuracion reutilizable: carga un valor booleano desde
// Supabase, lo muestra como interruptor y lo guarda al cambiarlo.
// Reusado por el panel de Admin (predicciones especiales, foto del ultimo, ...).
export default function ConfigToggle({
  titulo,
  descripcionOn,
  descripcionOff,
  cargar,
  guardar,
}: {
  titulo: string;
  descripcionOn: string;
  descripcionOff: string;
  cargar: () => Promise<boolean>;
  guardar: (on: boolean) => Promise<void>;
}) {
  const [on, setOn] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargar()
      .then(setOn)
      .finally(() => setCargando(false));
  }, [cargar]);

  const cambiar = async () => {
    setGuardando(true);
    const nuevo = !on;
    try {
      await guardar(nuevo);
      setOn(nuevo);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="mx-4 mb-3 bg-carbon-card border border-borde rounded-xl p-4 flex items-center justify-between gap-3">
      <div>
        <div className="text-sm font-semibold">{titulo}</div>
        <div className="text-xs text-neutral-400">
          {cargando ? "..." : on ? descripcionOn : descripcionOff}
        </div>
      </div>
      <button
        onClick={cambiar}
        disabled={cargando || guardando}
        aria-pressed={on}
        aria-label={titulo}
        className={`relative w-14 h-8 rounded-full transition-colors disabled:opacity-50 ${
          on ? "bg-oro" : "bg-carbon-soft border border-borde"
        }`}
      >
        <span
          className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${
            on ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
