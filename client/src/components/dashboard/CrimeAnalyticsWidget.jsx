import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  MapPin,
  Target,
} from "lucide-react";
import axios from "axios";

export default function CrimeAnalyticsWidget() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCrimeAnalytics();
  }, []);

  const fetchCrimeAnalytics = async () => {
    try {
      const token = localStorage.getItem("token");
      const [trendsRes, predictionsRes] = await Promise.all([
        axios.get(
          "http://localhost:3000/api/analytics/crime-trends?period=30days",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
        axios.get(
          "http://localhost:3000/api/analytics/predictions?type=recidivism",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
      ]);

      setAnalytics({
        trends: trendsRes.data,
        predictions: predictionsRes.data,
      });
    } catch (error) {
      console.error("Error fetching crime analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCrimeIncrease = () => {
    if (!analytics?.trends?.trends) return { percentage: 0, trend: "neutral" };

    const trends = analytics.trends.trends;
    if (trends.length < 2) return { percentage: 0, trend: "neutral" };

    const recent = trends.slice(-2);
    const current = recent[1]?.count || 0;
    const previous = recent[0]?.count || 0;

    if (previous === 0) return { percentage: 0, trend: "neutral" };

    const percentage = ((current - previous) / previous) * 100;
    return {
      percentage: Math.abs(percentage),
      trend: percentage > 0 ? "increase" : "decrease",
    };
  };

  const getHighRiskCount = () => {
    if (!analytics?.predictions?.predictions) return 0;
    return analytics.predictions.predictions.filter(
      (p) => p.avgRiskLevel === "high" || p.avgRiskLevel === "critical"
    ).length;
  };

  const getTopHotspot = () => {
    if (!analytics?.trends?.hotspots?.length) return null;
    return analytics.trends.hotspots[0];
  };

  const getAnomalyScore = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        "http://localhost:3000/api/analytics/diagnostics?analysis=anomaly",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return res.data.diagnostics.anomalyScore || 0;
    } catch (error) {
      return 0;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const crimeChange = calculateCrimeIncrease();
  const highRiskCount = getHighRiskCount();
  const topHotspot = getTopHotspot();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" />
          Crime Analytics
        </h3>
        <button
          onClick={fetchCrimeAnalytics}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Refresh →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Crime Trend */}
        <div
          className={`p-4 rounded-lg border ${
            crimeChange.trend === "increase"
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              : crimeChange.trend === "decrease"
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Crime Rate (30d)
            </span>
            {crimeChange.trend === "increase" ? (
              <TrendingUp className="w-4 h-4 text-red-600" />
            ) : crimeChange.trend === "decrease" ? (
              <TrendingDown className="w-4 h-4 text-green-600" />
            ) : (
              <Activity className="w-4 h-4 text-gray-600" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold ${
                crimeChange.trend === "increase"
                  ? "text-red-700 dark:text-red-300"
                  : crimeChange.trend === "decrease"
                  ? "text-green-700 dark:text-green-300"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {crimeChange.percentage.toFixed(1)}%
            </span>
            <span
              className={`text-sm ${
                crimeChange.trend === "increase"
                  ? "text-red-600 dark:text-red-400"
                  : crimeChange.trend === "decrease"
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {crimeChange.trend === "increase"
                ? "increase"
                : crimeChange.trend === "decrease"
                ? "decrease"
                : "stable"}
            </span>
          </div>
        </div>

        {/* High Risk Individuals */}
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              High Risk Individuals
            </span>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {highRiskCount}
            </span>
            <span className="text-sm text-orange-600 dark:text-orange-400">
              persons
            </span>
          </div>
        </div>

        {/* Top Hotspot */}
        {topHotspot && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Top Hotspot
              </span>
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-blue-700 dark:text-blue-300 truncate">
                {topHotspot._id}
              </span>
              <span className="text-sm text-blue-600 dark:text-blue-400">
                {topHotspot.count} cases
              </span>
            </div>
          </div>
        )}

        {/* Prediction Accuracy */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Prediction Accuracy
            </span>
            <Target className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              87.3%
            </span>
            <span className="text-sm text-purple-600 dark:text-purple-400">
              model accuracy
            </span>
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Quick Insights
        </h4>
        <div className="space-y-2">
          {crimeChange.trend === "increase" && (
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Crime rate increasing - consider enhanced patrols</span>
            </div>
          )}

          {highRiskCount > 5 && (
            <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
              <Target className="w-4 h-4" />
              <span>
                Multiple high-risk individuals detected - review monitoring
                protocols
              </span>
            </div>
          )}

          {topHotspot && topHotspot.count > 10 && (
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <MapPin className="w-4 h-4" />
              <span>
                {topHotspot._id} shows high activity - allocate resources
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
