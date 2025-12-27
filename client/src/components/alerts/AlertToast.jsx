import { X, AlertTriangle, AlertCircle, Info, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

export default function AlertToast({ toast, onClose }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { alert } = toast;

  const severityConfig = {
    critical: {
      icon: AlertTriangle,
      color: "red",
      gradient: "from-red-500 to-rose-600"
    },
    high: {
      icon: AlertCircle,
      color: "orange",
      gradient: "from-orange-500 to-amber-600"
    },
    medium: {
      icon: Info,
      color: "yellow",
      gradient: "from-yellow-500 to-amber-500"
    },
    low: {
      icon: Bell,
      color: "blue",
      gradient: "from-blue-500 to-cyan-600"
    }
  };

  const config = severityConfig[alert.severity] || severityConfig.medium;
  const Icon = config.icon;

  const handleClick = () => {
    navigate("/app/alerts");
    onClose();
  };

  return (
    <div
      onClick={handleClick}
      className={`w-96 rounded-lg shadow-2xl border cursor-pointer transform transition-all duration-300 hover:scale-105 ${
        theme === "dark"
          ? "bg-slate-900 border-slate-700"
          : "bg-white border-gray-200"
      }`}
    >
      <div className={`h-1 bg-gradient-to-r ${config.gradient} rounded-t-lg`} />
      
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full bg-${config.color}-500/20 flex items-center justify-center flex-shrink-0`}>
            <Icon className={`text-${config.color}-500`} size={20} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4 className={`font-semibold text-sm ${
                theme === "dark" ? "text-white" : "text-slate-900"
              }`}>
                {alert.title}
              </h4>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}
              >
                <X size={16} />
              </button>
            </div>
            
            <p className={`text-xs line-clamp-2 ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>
              {alert.description}
            </p>
            
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-${config.color}-500/20 text-${config.color}-600 dark:text-${config.color}-400`}>
                {alert.severity.toUpperCase()}
              </span>
              <span className={`text-xs ${
                theme === "dark" ? "text-slate-500" : "text-slate-500"
              }`}>
                {alert.type.replace(/_/g, " ").toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
