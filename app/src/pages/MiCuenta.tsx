import { useNavigate } from "react-router-dom";

export default function MiCuenta() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto px-4">
      <header className="pt-5 pb-3">
        <h1 className="text-xl font-bold">Mi cuenta</h1>
      </header>

      <div className="bg-carbon-card border border-borde rounded-2xl p-4 text-neutral-300 text-sm">
        Aca van: tus datos, alias editable, tus 3 avatares y predicciones
        especiales pre-mundial. (Pendiente de conectar a Supabase.)
      </div>

      <button
        onClick={() => navigate("/login")}
        className="mt-6 w-full border border-borde rounded-xl py-3 text-neutral-300 active:bg-carbon-soft"
      >
        Cerrar sesion
      </button>
    </div>
  );
}
