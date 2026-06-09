import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function MiCuenta() {
  const navigate = useNavigate();
  const { jugador, salir } = useAuth();

  const cerrar = () => {
    salir();
    navigate("/login");
  };

  return (
    <div className="max-w-md mx-auto px-4">
      <header className="pt-5 pb-3">
        <h1 className="text-xl font-bold">Mi cuenta</h1>
      </header>

      <div className="bg-carbon-card border border-borde rounded-2xl p-4">
        <div className="text-lg font-bold">{jugador?.nombre ?? "-"}</div>
        {jugador?.alias && (
          <div className="text-sm text-neutral-400">alias: {jugador.alias}</div>
        )}
        {jugador?.es_admin && (
          <span className="inline-block mt-2 text-xs font-semibold bg-oro text-carbon px-2 py-0.5 rounded-full">
            Admin
          </span>
        )}
      </div>

      {jugador?.es_admin && (
        <button
          onClick={() => navigate("/admin")}
          className="mt-4 w-full bg-oro text-carbon font-bold rounded-2xl py-3 active:scale-[0.99] transition-transform"
        >
          Panel de admin
        </button>
      )}

      <div className="mt-4 bg-carbon-card border border-borde rounded-2xl p-4 text-neutral-400 text-sm">
        Proximamente: editar alias, tus 3 avatares, cambiar PIN y tus
        predicciones especiales pre-mundial.
      </div>

      <button
        onClick={cerrar}
        className="mt-6 w-full border border-borde rounded-xl py-3 text-neutral-300 active:bg-carbon-soft"
      >
        Cerrar sesion
      </button>
    </div>
  );
}
