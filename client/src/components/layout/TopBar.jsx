import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Link } from "react-router-dom";

export default function TopBar() {
  const { user } = useAuth();
  const { theme } = useTheme();

  return (
    <header className={`h-16 backdrop-blur-sm border-b flex items-center justify-between px-8 ${
      theme === "dark"
        ? "bg-slate-950/50 border-slate-800/50 text-white"
        : "bg-white/60 border-purple-100 shadow-sm"
    }`}>
      <div className={`text-sm font-medium ${
        theme === "dark" ? "text-slate-400" : "text-slate-500"
      }`}>
        Secure Intelligence Platform
      </div>

      {user && (
        <div className="flex items-center gap-2 text-sm">
          <span className={theme === "dark" ? "text-slate-400" : "text-slate-500"}>
            Agency:
          </span>
          <span className={`px-3 py-1 rounded-full font-medium ${
            theme === "dark"
              ? "bg-indigo-500/20 text-indigo-300"
              : "bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 border border-purple-200"
          }`}>
            {user.agency.toUpperCase()}
          </span>
        </div>
      )}
    </header>
  );
}
