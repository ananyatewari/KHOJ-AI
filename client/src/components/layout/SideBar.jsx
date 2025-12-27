import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useAlerts } from "../../context/AlertsContext";
import { LayoutDashboard, Search, FileText, Mic, MessageSquare, History, LogOut, User, AlertTriangle, Sun, Moon, Bell } from "lucide-react";

export default function SideBar() {
  const { logout, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useAlerts();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    logout();
  };

  const cancelLogout = () => {
    setShowLogoutModal(false);
  };

  const linkBase =
    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition";

  return (
    <>
    <aside className={`w-64 h-screen border-r flex flex-col ${
      theme === "dark"
        ? "bg-gradient-to-b from-slate-950 to-slate-900 border-white/10"
        : "bg-white/80 backdrop-blur-xl border-purple-100 shadow-lg"
    }`}>
      {/* App Name */}
      <div className={`p-6 border-b ${
        theme === "dark" ? "border-white/10" : "border-purple-100"
      }`}>
        <Link to="/" className="flex items-center gap-3 group">
          {/* Logo - Legal/Justice themed */}
          <div className="relative w-10 h-10 flex-shrink-0">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              {/* Shield outline - represents protection and law */}
              <path 
                d="M20 4 L32 10 L32 18 C32 26 26 32 20 36 C14 32 8 26 8 18 L8 10 Z" 
                stroke={theme === "dark" ? "#6366f1" : "#4f46e5"}
                strokeWidth="1.8" 
                fill="none"
                className="transition-all duration-300 group-hover:stroke-[2.2]"
              />
              
              {/* Document/file icon inside shield */}
              <rect 
                x="15" 
                y="13" 
                width="10" 
                height="13" 
                rx="1"
                stroke={theme === "dark" ? "#6366f1" : "#4f46e5"}
                strokeWidth="1.5"
                fill="none"
              />
              
              {/* Document lines */}
              <line x1="17" y1="16" x2="23" y2="16" stroke={theme === "dark" ? "#6366f1" : "#4f46e5"} strokeWidth="1" strokeLinecap="round" />
              <line x1="17" y1="19" x2="23" y2="19" stroke={theme === "dark" ? "#6366f1" : "#4f46e5"} strokeWidth="1" strokeLinecap="round" />
              <line x1="17" y1="22" x2="21" y2="22" stroke={theme === "dark" ? "#6366f1" : "#4f46e5"} strokeWidth="1" strokeLinecap="round" />
              
              {/* Small AI indicator dots - subtle */}
              <circle cx="12" cy="12" r="1" fill={theme === "dark" ? "#6366f1" : "#4f46e5"} opacity="0.6" />
              <circle cx="28" cy="12" r="1" fill={theme === "dark" ? "#6366f1" : "#4f46e5"} opacity="0.6" />
              <circle cx="12" cy="28" r="1" fill={theme === "dark" ? "#6366f1" : "#4f46e5"} opacity="0.6" />
              <circle cx="28" cy="28" r="1" fill={theme === "dark" ? "#6366f1" : "#4f46e5"} opacity="0.6" />
            </svg>
          </div>
          
          <div className="flex-1">
            <h1 className={`text-2xl font-bold transition-all duration-300 ${
              theme === "dark" 
                ? "text-indigo-400 group-hover:text-indigo-300" 
                : "text-indigo-600 group-hover:text-indigo-700"
            }`}>
              KHOJ AI
            </h1>
            <p className={`text-xs mt-0.5 ${
              theme === "dark" ? "text-slate-500" : "text-slate-600"
            }`}>Intelligence Platform</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavLink
          to="/app/dashboard"
          className={({ isActive }) =>
            `${linkBase} ${
              isActive
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg"
                : theme === "dark"
                ? "text-slate-300 hover:bg-white/5"
                : "text-slate-600 hover:bg-purple-50"
            }`
          }
        >
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>

        <NavLink
          to="/app/search"
          className={({ isActive }) =>
            `${linkBase} ${
              isActive
                ? "bg-gradient-to-r from-teal-400 to-cyan-600 text-white shadow-lg"
                : theme === "dark"
                ? "text-slate-300 hover:bg-white/5"
                : "text-slate-600 hover:bg-purple-50"
            }`
          }
        >
          <Search size={18} />
          Intelligence Search
        </NavLink>

        <NavLink
          to="/app/ocr"
          className={({ isActive }) =>
            `${linkBase} ${
              isActive
                ? "bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg"
                : theme === "dark"
                ? "text-slate-300 hover:bg-white/5"
                : "text-slate-600 hover:bg-purple-50"
            }`
          }
        >
          <FileText size={18} />
          Intelligent OCR
        </NavLink>

        <NavLink
          to="/app/transcription"
          className={({ isActive }) =>
            `${linkBase} ${
              isActive
                ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg"
                : theme === "dark"
                ? "text-slate-300 hover:bg-white/5"
                : "text-slate-600 hover:bg-purple-50"
            }`
          }
        >
          <Mic size={18} />
          Audio Transcription
        </NavLink>

        <NavLink
          to="/app/chatbot"
          className={({ isActive }) =>
            `${linkBase} ${
              isActive
                ? "bg-gradient-to-r from-cyan-400 to-blue-600 text-white shadow-lg"
                : theme === "dark"
                ? "text-slate-300 hover:bg-white/5"
                : "text-slate-600 hover:bg-purple-50"
            }`
          }
        >
          <MessageSquare size={18} />
          Collaboration Chatbot
        </NavLink>

        <NavLink
          to="/app/history"
          className={({ isActive }) =>
            `${linkBase} ${
              isActive
                ? "bg-gradient-to-r from-green-600 to-emerald-700 text-white shadow-lg"
                : theme === "dark"
                ? "text-slate-300 hover:bg-white/5"
                : "text-slate-600 hover:bg-purple-50"
            }`
          }
        >
          <History size={18} />
          History
        </NavLink>

        <NavLink
          to="/app/alerts"
          className={({ isActive }) =>
            `${linkBase} relative ${
              isActive
                ? "bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg"
                : theme === "dark"
                ? "text-slate-300 hover:bg-white/5"
                : "text-slate-600 hover:bg-purple-50"
            }`
          }
        >
          <Bell size={18} />
          AI Alerts
          {unreadCount > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </NavLink>
      </nav>

      {/* Theme Toggle */}
      <div className="px-4 pb-4">
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition ${
            theme === "dark"
              ? "bg-slate-800/50 hover:bg-slate-800 text-slate-300"
              : "bg-purple-50 hover:bg-purple-100 text-slate-700 border border-purple-200"
          }`}
        >
          <span className="flex items-center gap-3">
            {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
            {theme === "dark" ? "Dark Mode" : "Light Mode"}
          </span>
          <div className={`w-10 h-5 rounded-full relative transition ${
            theme === "dark" ? "bg-slate-700" : "bg-purple-200"
          }`}>
            <div className={`absolute top-0.5 w-4 h-4 bg-indigo-500 rounded-full transition-transform duration-200 ${
              theme === "dark" ? "left-0.5" : "left-5"
            }`} />
          </div>
        </button>
      </div>

      {/* Profile & Logout */}
      <div className={`p-4 border-t ${
        theme === "dark" ? "border-white/10" : "border-purple-100"
      }`}>
        {/* Logout button */}
        <button
          onClick={handleLogoutClick}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mb-2 ${
            theme === "dark"
              ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
              : "text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200"
          }`}
        >
          <LogOut size={18} />
          Logout
        </button>

        {/* Profile card */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
          theme === "dark"
            ? "bg-slate-800/50"
            : "bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100"
        }`}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <User size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${
              theme === "dark" ? "text-white" : "text-slate-800"
            }`}>{user?.username}</p>
            <p className={`text-xs truncate ${
              theme === "dark" ? "text-slate-400" : "text-slate-500"
            }`}>{user?.agency?.toUpperCase()}</p>
          </div>
        </div>
      </div>
    </aside>

    {/* Logout Confirmation Modal - Outside sidebar for proper full-screen overlay */}
    {showLogoutModal && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]">
        <div className={`rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl ${
          theme === "dark"
            ? "bg-slate-900 border border-slate-700"
            : "bg-white border border-purple-200"
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-400" />
            </div>
            <div>
              <h3 className={`text-lg font-semibold ${
                theme === "dark" ? "text-white" : "text-slate-800"
              }`}>Confirm Logout</h3>
              <p className={`text-sm ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}>Are you sure you want to log out?</p>
            </div>
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={cancelLogout}
              className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition ${
                theme === "dark"
                  ? "bg-slate-800 hover:bg-slate-700 text-white"
                  : "bg-slate-200 hover:bg-slate-300 text-slate-800"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={confirmLogout}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
