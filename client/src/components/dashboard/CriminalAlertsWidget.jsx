import { AlertTriangle, Gavel, TrendingUp, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import axios from "axios";
import CriminalProfileModal from "../criminal/CriminalProfileModal";
import { useTheme } from "../../context/ThemeContext";

export default function CriminalAlertsWidget() {
  const { theme } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState(null);

  useEffect(() => {
    fetchCriminalStats();
  }, []);

  const fetchCriminalStats = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:3000/api/criminals/stats",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching criminal stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: "text-red-600",
      high: "text-orange-600",
      medium: "text-yellow-600",
      low: "text-blue-600",
    };
    return colors[severity] || "text-gray-600";
  };

  if (loading) {
    return (
      <div
        className={`rounded-lg shadow-lg p-6 ${
          theme === "dark"
            ? "bg-slate-800/50 border-slate-700/50"
            : "bg-white/90 border-purple-200"
        }`}
      >
        <div className="animate-pulse space-y-4">
          <div
            className={`h-6 rounded w-1/2 ${
              theme === "dark" ? "bg-slate-700" : "bg-gray-200"
            }`}
          ></div>
          <div
            className={`h-20 rounded ${
              theme === "dark" ? "bg-slate-700" : "bg-gray-200"
            }`}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`rounded-lg shadow-lg p-6 ${
          theme === "dark"
            ? "bg-slate-800/50 border-slate-700/50"
            : "bg-white/90 border-purple-200"
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <h3
            className={`text-lg font-bold flex items-center gap-2 ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}
          >
            <Gavel className="w-5 h-5 text-red-600" />
            Criminal Records Alerts
          </h3>
          <a
            href="/app/alerts?type=criminal_match"
            className={`text-sm hover:underline ${
              theme === "dark" ? "text-indigo-400" : "text-indigo-600"
            }`}
          >
            View All →
          </a>
        </div>

        {stats && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div
                className={`rounded-lg p-4 ${
                  theme === "dark" ? "bg-red-900/20" : "bg-red-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <p
                    className={`text-xs font-medium ${
                      theme === "dark" ? "text-red-400" : "text-red-600"
                    }`}
                  >
                    Critical
                  </p>
                </div>
                <p
                  className={`text-2xl font-bold ${
                    theme === "dark" ? "text-red-300" : "text-red-700"
                  }`}
                >
                  {stats.criticalAlerts}
                </p>
              </div>

              <div
                className={`rounded-lg p-4 ${
                  theme === "dark" ? "bg-blue-900/20" : "bg-blue-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <p
                    className={`text-xs font-medium ${
                      theme === "dark" ? "text-blue-400" : "text-blue-600"
                    }`}
                  >
                    Today
                  </p>
                </div>
                <p
                  className={`text-2xl font-bold ${
                    theme === "dark" ? "text-blue-300" : "text-blue-700"
                  }`}
                >
                  {stats.todayAlerts}
                </p>
              </div>

              <div
                className={`rounded-lg p-4 ${
                  theme === "dark" ? "bg-purple-900/20" : "bg-purple-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <p
                    className={`text-xs font-medium ${
                      theme === "dark" ? "text-purple-400" : "text-purple-600"
                    }`}
                  >
                    Total
                  </p>
                </div>
                <p
                  className={`text-2xl font-bold ${
                    theme === "dark" ? "text-purple-300" : "text-purple-700"
                  }`}
                >
                  {stats.totalAlerts}
                </p>
              </div>
            </div>

            {/* Recent Matches */}
            <div>
              <h4
                className={`text-sm font-semibold mb-3 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Recent Matches
              </h4>
              <div className="space-y-2">
                {stats.recentMatches && stats.recentMatches.length > 0 ? (
                  stats.recentMatches.map((match, idx) => (
                    <div
                      key={idx}
                      className={`rounded-lg p-3 transition-colors cursor-pointer ${
                        theme === "dark"
                          ? "bg-slate-900/50 hover:bg-slate-800/50"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                      onClick={() => setSelectedPerson(match.personName)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              match.severity === "critical"
                                ? "bg-red-500"
                                : match.severity === "high"
                                ? "bg-orange-500"
                                : match.severity === "medium"
                                ? "bg-yellow-500"
                                : "bg-blue-500"
                            }`}
                          ></div>
                          <div>
                            <p
                              className={`font-medium ${
                                theme === "dark"
                                  ? "text-white"
                                  : "text-gray-900"
                              }`}
                            >
                              {match.personName}
                            </p>
                            <p
                              className={`text-xs ${
                                theme === "dark"
                                  ? "text-gray-400"
                                  : "text-gray-500"
                              }`}
                            >
                              {match.caseCount} court case
                              {match.caseCount > 1 ? "s" : ""} •{" "}
                              {new Date(match.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          className={`text-sm hover:underline ${
                            theme === "dark"
                              ? "text-indigo-400"
                              : "text-indigo-600"
                          }`}
                        >
                          View →
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    className={`text-center py-6 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    <Gavel className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {stats.uniquePersons > 0
                        ? `${stats.uniquePersons} person${
                            stats.uniquePersons !== 1 ? "s" : ""
                          } with criminal records tracked`
                        : "No criminal records found yet"}
                    </p>
                    {stats.uniquePersons > 0 && (
                      <p
                        className={`text-xs mt-1 ${
                          theme === "dark" ? "text-gray-500" : "text-gray-400"
                        }`}
                      >
                        No recent alerts generated
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Unique Persons Tracked */}
            <div
              className={`mt-4 pt-4 border-t ${
                theme === "dark" ? "border-slate-700" : "border-gray-200"
              }`}
            >
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}
              >
                <strong>{stats.uniquePersons}</strong> unique person
                {stats.uniquePersons !== 1 ? "s" : ""} with criminal records
                tracked
              </p>
            </div>
          </>
        )}
      </div>

      {/* Criminal Profile Modal */}
      {selectedPerson && (
        <CriminalProfileModal
          personName={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </>
  );
}
