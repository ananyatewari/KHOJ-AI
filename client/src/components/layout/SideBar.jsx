import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function SideBar() {
  const { logout } = useAuth();

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 p-4 flex flex-col min-h-full">
      <nav className="space-y-2">
        <NavLink
          to="/app/dashboard"
          className={({ isActive }) =>
            `block px-4 py-2 rounded ${
              isActive ? "bg-blue-600" : "hover:bg-slate-800"
            }`
          }
        >
          📊 Dashboard
        </NavLink>

        <NavLink
          to="/app/search"
          className={({ isActive }) =>
            `block px-4 py-2 rounded ${
              isActive ? "bg-blue-600" : "hover:bg-slate-800"
            }`
          }
        >
          🔍 Intelligence Search
        </NavLink>
      </nav>

      {/* Logout always at bottom */}
      <button
        onClick={logout}
        className="mt-auto text-red-400 hover:text-red-500 text-sm"
      >
        ⏻ Logout
      </button>
    </aside>
  );
}
