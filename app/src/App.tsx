import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import BottomTabs from "./components/BottomTabs";
import Login from "./pages/Login";
import Partidos from "./pages/Partidos";
import PartidoDetalle from "./pages/PartidoDetalle";
import Tabla from "./pages/Tabla";
import MiCuenta from "./pages/MiCuenta";
import { useAuth } from "./lib/auth";
import type { ReactNode } from "react";

// Guard: si no hay sesion, manda al login.
function Privada({ children }: { children: ReactNode }) {
  const { jugador } = useAuth();
  if (!jugador) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const location = useLocation();
  const { jugador } = useAuth();
  // El login y el detalle de partido van a pantalla completa (sin bottom tabs).
  const ocultarTabs =
    location.pathname === "/login" ||
    location.pathname.startsWith("/partido/");

  return (
    <div className="min-h-full flex flex-col">
      <main className={ocultarTabs ? "flex-1" : "flex-1 pb-20"}>
        <Routes>
          <Route path="/" element={<Navigate to="/partidos" replace />} />
          <Route
            path="/login"
            element={jugador ? <Navigate to="/partidos" replace /> : <Login />}
          />
          <Route path="/partidos" element={<Privada><Partidos /></Privada>} />
          <Route path="/partido/:id" element={<Privada><PartidoDetalle /></Privada>} />
          <Route path="/tabla" element={<Privada><Tabla /></Privada>} />
          <Route path="/cuenta" element={<Privada><MiCuenta /></Privada>} />
          <Route path="*" element={<Navigate to="/partidos" replace />} />
        </Routes>
      </main>
      {!ocultarTabs && jugador && <BottomTabs />}
    </div>
  );
}
