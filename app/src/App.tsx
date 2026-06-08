import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import BottomTabs from "./components/BottomTabs";
import Login from "./pages/Login";
import Partidos from "./pages/Partidos";
import PartidoDetalle from "./pages/PartidoDetalle";
import Tabla from "./pages/Tabla";
import MiCuenta from "./pages/MiCuenta";

export default function App() {
  const location = useLocation();
  // El login y el detalle de partido van a pantalla completa (sin bottom tabs).
  const ocultarTabs =
    location.pathname === "/login" ||
    location.pathname.startsWith("/partido/");

  return (
    <div className="min-h-full flex flex-col">
      <main className={ocultarTabs ? "flex-1" : "flex-1 pb-20"}>
        <Routes>
          <Route path="/" element={<Navigate to="/partidos" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/partidos" element={<Partidos />} />
          <Route path="/partido/:id" element={<PartidoDetalle />} />
          <Route path="/tabla" element={<Tabla />} />
          <Route path="/cuenta" element={<MiCuenta />} />
          <Route path="*" element={<Navigate to="/partidos" replace />} />
        </Routes>
      </main>
      {!ocultarTabs && <BottomTabs />}
    </div>
  );
}
