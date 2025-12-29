import { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import {
  Twitter,
  Facebook,
  Instagram,
  AlertTriangle,
  TrendingUp,
  Users,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Filter,
  Eye,
  EyeOff,
  Activity,
  MapPin,
  Target,
} from "lucide-react";

export default function SocialMediaWidget() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [crimeAnalytics, setCrimeAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("crime"); // "all", "crime", "events", "analytics"
  const [showDetails, setShowDetails] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSocialMediaData = async () => {
    try {
      const [postsRes, eventsRes, statsRes, trendsRes, predictionsRes] =
        await Promise.all([
          fetch("http://localhost:3000/api/social-media/posts/crime?limit=10", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://localhost:3000/api/social-media/events?limit=5", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("http://localhost:3000/api/social-media/stats", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(
            "http://localhost:3000/api/analytics/crime-trends?period=30days",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
          fetch(
            "http://localhost:3000/api/analytics/predictions?type=recidivism",
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
        ]);

      const postsData = await postsRes.json();
      const eventsData = await eventsRes.json();
      const statsData = statsRes.ok ? await statsRes.json() : { overview: {} };
      const trendsData = trendsRes.ok ? await trendsRes.json() : { trends: [] };
      const predictionsData = predictionsRes.ok
        ? await predictionsRes.json()
        : { predictions: [] };

      setPosts(postsData.posts || []);
      setEvents(eventsData.events || []);
      setStats(statsData);
      setCrimeAnalytics({
        trends: trendsData,
        predictions: predictionsData,
      });
    } catch (error) {
      console.error("Error fetching social media data:", error);
      setStats({
        overview: {
          totalPosts: 0,
          crimePosts24h: 0,
          activeEvents: 0,
          highSeverityEvents: 0,
        },
      });
      setCrimeAnalytics({
        trends: { trends: [], hotspots: [] },
        predictions: { predictions: [] },
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSocialMediaData();
  };

  useEffect(() => {
    fetchSocialMediaData();
  }, [token]);

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case "twitter":
        return <Twitter className="w-4 h-4" />;
      case "facebook":
        return <Facebook className="w-4 h-4" />;
      case "instagram":
        return <Instagram className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "text-red-500 bg-red-500/10 border-red-500/20";
      case "high":
        return "text-orange-500 bg-orange-500/10 border-orange-500/20";
      case "medium":
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      case "low":
        return "text-green-500 bg-green-500/10 border-green-500/20";
      default:
        return "text-gray-500 bg-gray-500/10 border-gray-500/20";
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const calculateCrimeIncrease = () => {
    if (!crimeAnalytics?.trends?.trends)
      return { percentage: 0, trend: "neutral" };

    const trends = crimeAnalytics.trends.trends;
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
    if (!crimeAnalytics?.predictions?.predictions) return 0;
    return crimeAnalytics.predictions.predictions.filter(
      (p) => p.avgRiskLevel === "high" || p.avgRiskLevel === "critical"
    ).length;
  };

  const getTopHotspot = () => {
    if (!crimeAnalytics?.trends?.hotspots?.length) return null;
    return crimeAnalytics.trends.hotspots[0];
  };

  if (loading) {
    return (
      <section
        className={`backdrop-blur-sm border rounded-xl p-5 transition-all duration-300 hover:shadow-xl ${
          theme === "dark"
            ? "bg-slate-800/50 border-slate-700/50 shadow-lg"
            : "bg-white/90 border-purple-200 shadow-md"
        }`}
      >
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-300 rounded"></div>
            <div className="h-20 bg-gray-300 rounded"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2
          className={`text-base font-semibold flex items-center gap-2 ${
            theme === "dark" ? "text-white" : "text-slate-800"
          }`}
        >
          <Activity className="w-4 h-4 text-indigo-500" />
          Intelligence Analytics
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className={`p-1.5 rounded-lg transition-all ${
              theme === "dark"
                ? "hover:bg-slate-700 text-slate-400"
                : "hover:bg-purple-100 text-slate-600"
            }`}
          >
            {showDetails ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`p-1.5 rounded-lg transition-all ${
              refreshing ? "animate-spin" : ""
            } ${
              theme === "dark"
                ? "hover:bg-slate-700 text-slate-400"
                : "hover:bg-purple-100 text-slate-600"
            }`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        className={`space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-thin ${
          theme === "dark"
            ? "scrollbar-thumb-slate-700"
            : "scrollbar-thumb-purple-300"
        } scrollbar-track-transparent`}
      >
        {filter === "crime" && (
          <>
            {posts.length === 0 ? (
              <p
                className={`text-center py-8 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}
              >
                No crime-related posts detected
              </p>
            ) : (
              posts.map((post, index) => (
                <div
                  key={post.postId}
                  className={`border rounded-lg p-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
                    theme === "dark"
                      ? "bg-slate-900/50 border-slate-700/50 hover:border-indigo-500/50"
                      : "bg-gradient-to-r from-red-50/50 to-orange-50/50 border-red-200 hover:border-red-400"
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Post Header */}
                      <div className="flex items-center gap-2 mb-2">
                        {getPlatformIcon(post.platform)}
                        <span
                          className={`text-xs font-medium ${
                            theme === "dark" ? "text-white" : "text-slate-800"
                          }`}
                        >
                          @{post.author.username}
                        </span>
                        {post.author.verified && (
                          <span className="text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">
                            ✓
                          </span>
                        )}
                        <span
                          className={`text-xs ${
                            theme === "dark"
                              ? "text-slate-500"
                              : "text-slate-500"
                          }`}
                        >
                          {formatTimeAgo(post.metadata.createdAt)}
                        </span>
                      </div>

                      {/* Severity Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full border ${getSeverityColor(
                            post.analysis.severity
                          )}`}
                        >
                          {post.analysis.severity.toUpperCase()}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            theme === "dark"
                              ? "bg-slate-700 text-slate-300"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {post.analysis.crimeType?.replace("_", " ") ||
                            "UNKNOWN"}
                        </span>
                        <span
                          className={`text-xs ${
                            theme === "dark"
                              ? "text-slate-400"
                              : "text-slate-600"
                          }`}
                        >
                          {post.analysis.confidence}% confidence
                        </span>
                      </div>

                      {/* Post Content */}
                      {showDetails && (
                        <>
                          <p
                            className={`text-sm mb-2 line-clamp-3 ${
                              theme === "dark"
                                ? "text-slate-300"
                                : "text-slate-700"
                            }`}
                          >
                            {post.content.text}
                          </p>

                          {post.analysis.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {post.analysis.keywords
                                .slice(0, 5)
                                .map((keyword, idx) => (
                                  <span
                                    key={idx}
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      theme === "dark"
                                        ? "bg-slate-700 text-slate-300"
                                        : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {keyword}
                                  </span>
                                ))}
                            </div>
                          )}

                          {/* Engagement Metrics */}
                          <div className="flex items-center gap-3 text-xs text-slate-500">
                            <span>💗 {post.metadata.likes}</span>
                            <span>🔄 {post.metadata.shares}</span>
                            <span>💬 {post.metadata.comments}</span>
                            {post.metadata.location?.name && (
                              <span>📍 {post.metadata.location.name}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {filter === "events" && (
          <>
            {events.length === 0 ? (
              <p
                className={`text-center py-8 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}
              >
                No active events
              </p>
            ) : (
              events.map((event, index) => (
                <div
                  key={event.eventId}
                  className={`border rounded-lg p-3 transition-all duration-300 hover:scale-[1.02] hover:shadow-md ${
                    theme === "dark"
                      ? "bg-slate-900/50 border-slate-700/50 hover:border-indigo-500/50"
                      : "bg-gradient-to-r from-orange-50/50 to-red-50/50 border-orange-200 hover:border-orange-400"
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Event Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span
                          className={`text-sm font-medium ${
                            theme === "dark" ? "text-white" : "text-slate-800"
                          }`}
                        >
                          {event.title}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-full border ${getSeverityColor(
                            event.severity
                          )}`}
                        >
                          {event.severity.toUpperCase()}
                        </span>
                      </div>

                      {showDetails && (
                        <>
                          <p
                            className={`text-sm mb-2 ${
                              theme === "dark"
                                ? "text-slate-300"
                                : "text-slate-700"
                            }`}
                          >
                            {event.description}
                          </p>

                          <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                            <span>📊 {event.confidence}% confidence</span>
                            <span>📝 {event.posts.length} posts</span>
                            <span>
                              👥 {event.aggregatedMetrics?.uniqueAuthors || 0}{" "}
                              authors
                            </span>
                            <span>🕒 {formatTimeAgo(event.createdAt)}</span>
                          </div>

                          {event.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {event.keywords
                                .slice(0, 5)
                                .map((keyword, idx) => (
                                  <span
                                    key={idx}
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      theme === "dark"
                                        ? "bg-slate-700 text-slate-300"
                                        : "bg-orange-100 text-orange-700"
                                    }`}
                                  >
                                    {keyword}
                                  </span>
                                ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {filter === "analytics" && (
          <>
            {!crimeAnalytics ? (
              <p
                className={`text-center py-8 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Loading crime analytics...
              </p>
            ) : (
              <div className="space-y-4">
                {/* Crime Trend Card */}
                {(() => {
                  const crimeChange = calculateCrimeIncrease();
                  const highRiskCount = getHighRiskCount();
                  const topHotspot = getTopHotspot();

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Crime Trend */}
                      <div
                        className={`p-3 rounded-lg border ${
                          crimeChange.trend === "increase"
                            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                            : crimeChange.trend === "decrease"
                            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                            : "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Crime Rate (30d)
                          </span>
                          <TrendingUp
                            className={`w-4 h-4 ${
                              crimeChange.trend === "increase"
                                ? "text-red-600"
                                : crimeChange.trend === "decrease"
                                ? "text-green-600"
                                : "text-gray-600"
                            }`}
                          />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`text-lg font-bold ${
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
                            className={`text-xs ${
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
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            High Risk Individuals
                          </span>
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-bold text-orange-700 dark:text-orange-300">
                            {highRiskCount}
                          </span>
                          <span className="text-xs text-orange-600 dark:text-orange-400">
                            persons
                          </span>
                        </div>
                      </div>

                      {/* Top Hotspot */}
                      {topHotspot && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              Top Hotspot
                            </span>
                            <MapPin className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-blue-700 dark:text-blue-300 truncate">
                              {topHotspot._id}
                            </span>
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                              {topHotspot.count} cases
                            </span>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })()}

              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}