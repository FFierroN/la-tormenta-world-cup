import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import BottomTabs from "./components/BottomTabs";
import Login from "./pages/Login";
import Partidos from "./pages/Partidos";
import PartidosWC from "./pages/PartidosWC";
import PartidoDetalle from "./pages/PartidoDetalle";
import Tabla from "./pages/Tabla";
import Copa from "./pages/Copa";
import MiCuenta from "./pages/MiCuenta";
import CambiarPin from "./pages/CambiarPin";
import MisPredicciones from "./pages/MisPredicciones";
import Admin from "./pages/Admin";
import AdminPartido from "./pages/AdminPartido";
import AdminEspeciales from "./pages/AdminEspeciales";
import AdminParticipantes from "./pages/AdminParticipantes";
import PrediccionesEspeciales from "./pages/PrediccionesEspeciales";
import Reglas from "./pages/Reglas";
import { useAuth } from "./lib/auth";
import type { ReactNode } from "react";

// Guard: si no hay sesion, manda al login.
function Privada({ children }: { children: ReactNode }) {
  const { jugador } = useAuth();
  if (!jugador) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Guard: solo el admin entra al panel.
function SoloAdmin({ children }: { children: ReactNode }) {
  const { jugador } = useAuth();
  if (!jugador) return <Navigate to="/login" replace />;
  if (!jugador.es_admin) return <Navigate to="/partidos" replace />;
  return <>{children}</>;
}

export default function App() {
  const location = useLocation();
  const { jugador } = useAuth();
  // El login y el detalle de partido van a pantalla completa (sin bottom tabs).
  const ocultarTabs =
    location.pathname === "/login" ||
    location.pathname.startsWith("/partido/") ||
    location.pathname.startsWith("/admin/") ||
    location.pathname === "/especiales" ||
    location.pathname === "/cambiar-pin" ||
    location.pathname === "/mis-predicciones" ||
    location.pathname === "/reglas";

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
          {/* PILOTO rediseno WC26 (preview, no reemplaza /partidos aun). */}
          <Route path="/partidos-wc" element={<Privada><PartidosWC /></Privada>} />
          <Route path="/partido/:id" element={<Privada><PartidoDetalle /></Privada>} />
          <Route path="/tabla" element={<Privada><Tabla /></Privada>} />
          <Route path="/copa" element={<Privada><Copa /></Privada>} />
          <Route path="/grupos" element={<Navigate to="/copa" replace />} />
          <Route path="/cuenta" element={<Privada><MiCuenta /></Privada>} />
          <Route path="/cambiar-pin" element={<Privada><CambiarPin /></Privada>} />
          <Route path="/mis-predicciones" element={<Privada><MisPredicciones /></Privada>} />
          <Route path="/especiales" element={<Privada><PrediccionesEspeciales /></Privada>} />
          <Route path="/reglas" element={<Privada><Reglas /></Privada>} />
          <Route path="/admin" element={<SoloAdmin><Admin /></SoloAdmin>} />
          <Route path="/admin/especiales" element={<SoloAdmin><AdminEspeciales /></SoloAdmin>} />
          <Route path="/admin/participantes" element={<SoloAdmin><AdminParticipantes /></SoloAdmin>} />
          <Route path="/admin/:id" element={<SoloAdmin><AdminPartido /></SoloAdmin>} />
          <Route path="*" element={<Navigate to="/partidos" replace />} />
        </Routes>
      </main>
      {!ocultarTabs && jugador && <BottomTabs />}
    </div>
  );
}
