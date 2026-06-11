import { NavLink } from "react-router-dom";

type Tab = { to: string; label: string; path: string };

const tabs: Tab[] = [
  // icono trofeo (Copa: grupos + llaves del mundial)
  {
    to: "/copa",
    label: "Copa",
    path: "M7 4h10v2h3v3a4 4 0 01-4 4h-.3A5 5 0 0113 16v2h3v2H8v-2h3v-2a5 5 0 01-2.7-3H8a4 4 0 01-4-4V6h3V4zm0 4H6v1a2 2 0 002 2V8zm10 0v3a2 2 0 002-2V8h-2z",
  },
  // icono pelota de futbol
  {
    to: "/partidos",
    label: "Partidos",
    path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z",
  },
  // icono tabla / ranking
  { to: "/tabla", label: "Tabla", path: "M4 13h4v7H4v-7zm6-9h4v16h-4V4zm6 5h4v11h-4V9z" },
  // icono persona
  {
    to: "/cuenta",
    label: "Mi cuenta",
    path: "M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4 0-7 2-7 5v1h14v-1c0-3-3-5-7-5z",
  },
];

export default function BottomTabs() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 border-t border-borde bg-carbon-soft/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex">
        {tabs.map((t) => (
          <li key={t.to} className="flex-1">
            <NavLink
              to={t.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${
                  isActive ? "text-oro" : "text-neutral-400"
                }`
              }
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d={t.path} />
              </svg>
              <span>{t.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
