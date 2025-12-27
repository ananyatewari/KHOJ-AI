import { useState, useEffect } from "react";
import { useAlerts } from "../context/AlertsContext";
import { useTheme } from "../context/ThemeContext";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Bell,
  X,
  Check,
  Filter,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AlertsPage() {
  const { alerts, markAsRead, acknowledgeAlert, dismissAlert, fetchAlerts } =
    useAlerts();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [selectedAlert, setSelectedAlert] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionTaken, setActionTaken] = useState("");

  useEffect(() => {
    fetchAlerts();
  }, []);

  const severityConfig = {
    critical: {
      icon: AlertTriangle,
      color: "red",
      bgClass: "bg-red-500/20",
      textClass: "text-red-600 dark:text-red-400",
      borderClass: "border-red-500/50",
    },
    high: {
      icon: AlertCircle,
      color: "orange",
      bgClass: "bg-orange-500/20",
      textClass: "text-orange-600 dark:text-orange-400",
      borderClass: "border-orange-500/50",
    },
    medium: {
      icon: Info,
      color: "yellow",
      bgClass: "bg-yellow-500/20",
      textClass: "text-yellow-600 dark:text-yellow-400",
      borderClass: "border-yellow-500/50",
    },
    low: {
      icon: Bell,
      color: "blue",
      bgClass: "bg-blue-500/20",
      textClass: "text-blue-600 dark:text-blue-400",
      borderClass: "border-blue-500/50",
    },
  };

  const filteredAlerts = alerts.filter((alert) => {
    if (filterStatus !== "all" && alert.status !== filterStatus) return false;
    if (filterSeverity !== "all" && alert.severity !== filterSeverity)
      return false;
    if (
      searchQuery &&
      !alert.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !alert.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  const handleAlertClick = async (alert) => {
    setSelectedAlert(alert);
    if (alert.status === "unread") {
      await markAsRead(alert._id);
    }
  };

  const handleAcknowledge = async () => {
    if (selectedAlert) {
      await acknowledgeAlert(selectedAlert._id, actionTaken);
      setActionTaken("");
      setSelectedAlert(null);
    }
  };

  const handleDismiss = async () => {
    if (selectedAlert) {
      await dismissAlert(selectedAlert._id);
      setSelectedAlert(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      unread: {
        label: "Unread",
        class: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
      },
      read: {
        label: "Read",
        class: "bg-gray-500/20 text-gray-600 dark:text-gray-400",
      },
      acknowledged: {
        label: "Acknowledged",
        class: "bg-green-500/20 text-green-600 dark:text-green-400",
      },
      resolved: {
        label: "Resolved",
        class: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
      },
      dismissed: {
        label: "Dismissed",
        class: "bg-slate-500/20 text-slate-600 dark:text-slate-400",
      },
    };
    const config = statusConfig[status] || statusConfig.unread;
    return (
      <span
        className={`text-xs px-2 py-1 rounded-full font-medium ${config.class}`}
      >
        {config.label}
      </span>
    );
  };

  return (
    <div
      className={`h-full flex ${
        theme === "dark"
          ? "bg-slate-900"
          : "bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50"
      }`}
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        <div
          className={`p-6 border-b ${
            theme === "dark" ? "border-slate-700" : "border-purple-200"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1
                className={`text-3xl font-bold ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                AI Alerts & Notifications
              </h1>
              <p
                className={`text-sm mt-1 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Real-time intelligence alerts triggered by AI analysis
              </p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search
                  className={`absolute left-3 top-1/2 -translate-y-1/2 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`}
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search alerts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    theme === "dark"
                      ? "bg-slate-800 border-slate-700 text-white"
                      : "bg-white border-purple-200 text-slate-900"
                  }`}
                />
              </div>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                theme === "dark"
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-white border-purple-200 text-slate-900"
              }`}
            >
              <option value="all">All Status</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="dismissed">Dismissed</option>
            </select>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className={`px-4 py-2 rounded-lg border ${
                theme === "dark"
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-white border-purple-200 text-slate-900"
              }`}
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {filteredAlerts.length === 0 ? (
            <div
              className={`text-center py-12 ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}
            >
              <Bell size={48} className="mx-auto mb-4 opacity-50" />
              <p>No alerts found</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAlerts.map((alert) => {
                const config =
                  severityConfig[alert.severity] || severityConfig.medium;
                const Icon = config.icon;

                return (
                  <div
                    key={alert._id}
                    onClick={() => handleAlertClick(alert)}
                    className={`p-4 rounded-lg border-l-4 cursor-pointer transition-all ${
                      config.borderClass
                    } ${
                      theme === "dark"
                        ? "bg-slate-800 hover:bg-slate-750"
                        : "bg-white hover:shadow-lg"
                    } ${
                      selectedAlert?._id === alert._id
                        ? "ring-2 ring-indigo-500"
                        : ""
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-full ${config.bgClass} flex items-center justify-center flex-shrink-0`}
                      >
                        <Icon className={config.textClass} size={24} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3
                            className={`font-semibold ${
                              theme === "dark" ? "text-white" : "text-slate-900"
                            }`}
                          >
                            {alert.title}
                          </h3>
                          {getStatusBadge(alert.status)}
                        </div>

                        <p
                          className={`text-sm mb-3 ${
                            theme === "dark"
                              ? "text-slate-400"
                              : "text-slate-600"
                          }`}
                        >
                          {alert.description}
                        </p>

                        <div className="flex items-center gap-3 flex-wrap">
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${config.bgClass} ${config.textClass}`}
                          >
                            {alert.severity.toUpperCase()}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              theme === "dark"
                                ? "bg-slate-700 text-slate-300"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {alert.type.replace(/_/g, " ").toUpperCase()}
                          </span>
                          <span
                            className={`text-xs ${
                              theme === "dark"
                                ? "text-slate-500"
                                : "text-slate-500"
                            }`}
                          >
                            {new Date(alert.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedAlert && (
        <div
          className={`w-96 border-l overflow-y-auto ${
            theme === "dark"
              ? "bg-slate-800 border-slate-700"
              : "bg-white border-purple-200"
          }`}
        >
          <div
            className={`p-4 border-b ${
              theme === "dark" ? "border-slate-700" : "border-purple-200"
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <h2
                className={`text-xl font-bold ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                Alert Details
              </h2>
              <button
                onClick={() => setSelectedAlert(null)}
                className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {getStatusBadge(selectedAlert.status)}
          </div>

          <div className="p-4 space-y-4">
            <div>
              <h3
                className={`text-sm font-semibold mb-2 ${
                  theme === "dark" ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Title
              </h3>
              <p
                className={`${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}
              >
                {selectedAlert.title}
              </p>
            </div>

            <div>
              <h3
                className={`text-sm font-semibold mb-2 ${
                  theme === "dark" ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Description
              </h3>
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {selectedAlert.description}
              </p>
            </div>

            {selectedAlert.details && (
              <div>
                <h3
                  className={`text-sm font-semibold mb-2 ${
                    theme === "dark" ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  Details
                </h3>
                <div className="space-y-2 text-sm">
                  {selectedAlert.details.entityName && (
                    <div>
                      <span
                        className={`font-medium ${
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`}
                      >
                        Entity:{" "}
                      </span>
                      <span
                        className={
                          theme === "dark" ? "text-white" : "text-slate-900"
                        }
                      >
                        {selectedAlert.details.entityName}
                      </span>
                    </div>
                  )}
                  {selectedAlert.details.matchCount && (
                    <div>
                      <span
                        className={`font-medium ${
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`}
                      >
                        Match Count:{" "}
                      </span>
                      <span
                        className={
                          theme === "dark" ? "text-white" : "text-slate-900"
                        }
                      >
                        {selectedAlert.details.matchCount}
                      </span>
                    </div>
                  )}
                  {selectedAlert.details.agencies &&
                    selectedAlert.details.agencies.length > 0 && (
                      <div>
                        <span
                          className={`font-medium ${
                            theme === "dark"
                              ? "text-slate-400"
                              : "text-slate-600"
                          }`}
                        >
                          Agencies:{" "}
                        </span>
                        <span
                          className={
                            theme === "dark" ? "text-white" : "text-slate-900"
                          }
                        >
                          {selectedAlert.details.agencies.join(", ")}
                        </span>
                      </div>
                    )}
                  {selectedAlert.details.riskScore && (
                    <div>
                      <span
                        className={`font-medium ${
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`}
                      >
                        Risk Score:{" "}
                      </span>
                      <span
                        className={
                          theme === "dark" ? "text-white" : "text-slate-900"
                        }
                      >
                        {selectedAlert.details.riskScore}
                      </span>
                    </div>
                  )}
                  {selectedAlert.details.geoFence && (
                    <div>
                      <span
                        className={`font-medium ${
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`}
                      >
                        Location:{" "}
                      </span>
                      <span
                        className={
                          theme === "dark" ? "text-white" : "text-slate-900"
                        }
                      >
                        {selectedAlert.details.geoFence.location}
                      </span>
                      <br />
                      <span
                        className={`font-medium ${
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`}
                      >
                        Incidents:{" "}
                      </span>
                      <span
                        className={
                          theme === "dark" ? "text-white" : "text-slate-900"
                        }
                      >
                        {selectedAlert.details.geoFence.incidentCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedAlert.status === "unread" ||
            selectedAlert.status === "read" ? (
              <div className="space-y-3">
                <textarea
                  placeholder="Describe action taken..."
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  className={`w-full p-3 rounded-lg border ${
                    theme === "dark"
                      ? "bg-slate-700 border-slate-600 text-white"
                      : "bg-white border-purple-200 text-slate-900"
                  }`}
                  rows={3}
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleAcknowledge}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    Acknowledge
                  </button>
                  <button
                    onClick={handleDismiss}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      theme === "dark"
                        ? "bg-slate-700 hover:bg-slate-600 text-white"
                        : "bg-slate-200 hover:bg-slate-300 text-slate-900"
                    }`}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : (
              selectedAlert.actionTaken && (
                <div>
                  <h3
                    className={`text-sm font-semibold mb-2 ${
                      theme === "dark" ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    Action Taken
                  </h3>
                  <p
                    className={`text-sm ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    {selectedAlert.actionTaken}
                  </p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
