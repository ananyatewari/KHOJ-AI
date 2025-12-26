import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function SideBar() {
  const { logout } = useAuth();

  const linkBase =
    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition";

  return (
    <aside className="w-64 min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 border-r border-white/10 p-4 flex flex-col">

      <nav className="space-y-2">
        <NavLink
          to="/app/dashboard"
          className={({ isActive }) =>
            `${linkBase} ${
              isActive
                ? "bg-gradient-to-r from-indigo-600/80 to-blue-600/80 text-white shadow"
                : "text-slate-300 hover:bg-white/5"
            }`
          }
        >
          📊 Dashboard
        </NavLink>

        <NavLink
          to="/app/search"
          className={({ isActive }) =>
            `${linkBase} ${
              isActive
                ? "bg-gradient-to-r from-purple-600/80 to-fuchsia-600/80 text-white shadow"
                : "text-slate-300 hover:bg-white/5"
            }`
          }
        >
          🔍 Intelligence Search
        </NavLink>

        <NavLink
          to="/app/ocr"
          className={({ isActive }) =>
            `${linkBase} ${
              isActive
                ? "bg-gradient-to-r from-emerald-600/80 to-teal-600/80 text-white shadow"
                : "text-slate-300 hover:bg-white/5"
            }`
          }
        >
          📄 Intelligent OCR
        </NavLink>

        <NavLink to="/" className={({ isActive }) =>
            `${linkBase} ${
              isActive
                ? "bg-gradient-to-r from-emerald-600/80 to-teal-600/80 text-white shadow"
                : "text-slate-300 hover:bg-white/5"
            }`}>
          <button
        onClick={logout}
        className="mt-auto text-sm text-red-400 hover:text-red-500 transition"
      >
        ⏻ Logout
      </button>
        </NavLink>
      </nav>

      {/* Logout */}
      
    </aside>
  );
}
