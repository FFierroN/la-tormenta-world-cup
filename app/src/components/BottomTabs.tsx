import { NavLink } from "react-router-dom";

type Tab = { to: string; label: string; path: string };

const tabs: Tab[] = [
  // icono pelota
  {
    to: "/partidos",
    label: "Partidos",
    path: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 3l2.5 1.8-1 3h-3l-1-3L12 5zm-6 5.5l3 .5 1 3-2 2.4-2.7-1.2L6 10.5zm12 0l.7 4.7-2.7 1.2-2-2.4 1-3 3-.5z",
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
