import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  MapPin,
  Calendar,
  Brain,
  Activity,
  BarChart3,
  PieChartIcon,
  Target,
  Shield,
  Clock,
} from "lucide-react";
import axios from "axios";

export default function CrimeAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState("trends");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("12months");

  useEffect(() => {
    fetchAnalyticsData();
  }, [activeTab, timeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      let endpoint = "";

      switch (activeTab) {
        case "trends":
          endpoint = `/api/analytics/crime-trends?period=${timeRange}`;
          break;
      }

      const response = await axios.get(`http://localhost:3000${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setData(response.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = [
    "#ef4444",
    "#f59e0b",
    "#eab308",
    "#22c55e",
    "#3b82f6",
    "#8b5cf6",
  ];

  const renderTrendsTab = () => {
    if (!data.trends) return null;

    const monthlyData = data.trends.reduce((acc, trend) => {
      const monthKey = `${trend._id.year}-${trend._id.month
        .toString()
        .padStart(2, "0")}`;
      const existing = acc.find((item) => item.month === monthKey) || {
        month: monthKey,
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      existing.total += trend.count;
      existing[trend._id.riskLevel] =
        (existing[trend._id.riskLevel] || 0) + trend.count;

      if (!acc.find((item) => item.month === monthKey)) {
        acc.push(existing);
      }

      return acc;
    }, []);

    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Crime Trends Over Time
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="critical"
                stackId="1"
                stroke="#ef4444"
                fill="#ef4444"
              />
              <Area
                type="monotone"
                dataKey="high"
                stackId="1"
                stroke="#f59e0b"
                fill="#f59e0b"
              />
              <Area
                type="monotone"
                dataKey="medium"
                stackId="1"
                stroke="#eab308"
                fill="#eab308"
              />
              <Area
                type="monotone"
                dataKey="low"
                stackId="1"
                stroke="#22c55e"
                fill="#22c55e"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Risk Level Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.riskDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ _id, count }) => `${_id}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {(data.riskDistribution || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full bg-gray-50 dark:bg-slate-900">
      <div className="max-w-[1800px] mx-auto p-8">

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div>
            {activeTab === "trends" && renderTrendsTab()}
          </div>
        )}
      </div>
    </div>
  );
}