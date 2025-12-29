import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useSearchParams } from "react-router-dom";
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
  Search,
  Calendar,
  MapPin,
  Eye,
  EyeOff,
  Download,
  Settings,
} from "lucide-react";

export default function SocialMediaPage() {
  const { theme } = useTheme();
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get tab from URL params, default to "posts"
  const initialTab = searchParams.get("tab") || "posts";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [filter, setFilter] = useState({
    severity: "",
    crimeType: "",
    platform: "",
    startDate: "",
    endDate: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchSocialMediaData = async () => {
    try {
      const queryParams = new URLSearchParams();

      // Add filters to query params
      if (filter.severity) queryParams.append("severity", filter.severity);
      if (filter.crimeType) queryParams.append("crimeType", filter.crimeType);
      if (filter.platform) queryParams.append("platform", filter.platform);
      if (filter.startDate) queryParams.append("startDate", filter.startDate);
      if (filter.endDate) queryParams.append("endDate", filter.endDate);
      if (searchTerm) queryParams.append("search", searchTerm);

      const [postsRes, eventsRes, statsRes] = await Promise.all([
        fetch(
          `http://localhost:3000/api/social-media/posts/crime?${queryParams.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
        fetch(
          `http://localhost:3000/api/social-media/events?${queryParams.toString()}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
        fetch("http://localhost:3000/api/social-media/stats", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const postsData = await postsRes.json();
      const eventsData = await eventsRes.json();
      const statsData = await statsRes.json();

      setPosts(postsData.posts || []);
      setEvents(eventsData.events || []);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching social media data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSocialMediaData();
  };

  const handleFilterChange = (key, value) => {
    setFilter((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilter({
      severity: "",
      crimeType: "",
      platform: "",
      startDate: "",
      endDate: "",
    });
    setSearchTerm("");
  };

  useEffect(() => {
    fetchSocialMediaData();
  }, [token, filter, searchTerm]);

  // Update active tab when URL params change
  useEffect(() => {
    const tab = searchParams.get("tab") || "posts";
    setActiveTab(tab);
  }, [searchParams]);

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case "twitter":
        return <Twitter className="w-5 h-5" />;
      case "facebook":
        return <Facebook className="w-5 h-5" />;
      case "instagram":
        return <Instagram className="w-5 h-5" />;
      default:
        return <MessageSquare className="w-5 h-5" />;
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

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <div
        className={`min-h-screen ${
          theme === "dark"
            ? "bg-slate-900"
            : "bg-gradient-to-br from-slate-50 to-purple-50"
        }`}
      >
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-6 w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-300 rounded"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-32 bg-gray-300 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-slate-900"
          : "bg-gradient-to-br from-slate-50 to-purple-50"
      }`}
    >
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1
            className={`text-3xl font-bold mb-2 flex items-center gap-3 ${
              theme === "dark" ? "text-white" : "text-slate-800"
            }`}
          >
            <TrendingUp className="w-8 h-8 text-indigo-500" />
            Social Media Intelligence
          </h1>
          <p
            className={`text-sm ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Real-time monitoring and analysis of social media for crime-related
            content
          </p>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div
              className={`backdrop-blur-sm border rounded-xl p-4 ${
                theme === "dark"
                  ? "bg-slate-800/50 border-slate-700/50"
                  : "bg-white/90 border-purple-200"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <MessageSquare className="w-8 h-8 text-indigo-500" />
                <span
                  className={`text-2xl font-bold ${
                    theme === "dark" ? "text-white" : "text-slate-800"
                  }`}
                >
                  {stats.overview.totalPosts}
                </span>
              </div>
              <p
                className={`text-sm font-medium ${
                  theme === "dark" ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Total Posts Monitored
              </p>
            </div>

            <div
              className={`backdrop-blur-sm border rounded-xl p-4 ${
                theme === "dark"
                  ? "bg-slate-800/50 border-slate-700/50"
                  : "bg-white/90 border-purple-200"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <AlertTriangle className="w-8 h-8 text-red-500" />
                <span
                  className={`text-2xl font-bold ${
                    theme === "dark" ? "text-white" : "text-slate-800"
                  }`}
                >
                  {stats.overview.crimePosts24h}
                </span>
              </div>
              <p
                className={`text-sm font-medium ${
                  theme === "dark" ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Crime Posts (24h)
              </p>
            </div>

            <div
              className={`backdrop-blur-sm border rounded-xl p-4 ${
                theme === "dark"
                  ? "bg-slate-800/50 border-slate-700/50"
                  : "bg-white/90 border-purple-200"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <Users className="w-8 h-8 text-orange-500" />
                <span
                  className={`text-2xl font-bold ${
                    theme === "dark" ? "text-white" : "text-slate-800"
                  }`}
                >
                  {stats.overview.activeEvents}
                </span>
              </div>
              <p
                className={`text-sm font-medium ${
                  theme === "dark" ? "text-slate-300" : "text-slate-700"
                }`}
              >
                Active Events
              </p>
            </div>

            <div
              className={`backdrop-blur-sm border rounded-xl p-4 ${
                theme === "dark"
                  ? "bg-slate-800/50 border-slate-700/50"
                  : "bg-white/90 border-purple-200"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <AlertTriangle className="w-8 h-8 text-yellow-500" />
                <span
                  className={`text-2xl font-bold ${
                    theme === "dark" ? "text-white" : "text-slate-800"
                  }`}
                >
                  {stats.overview.highSeverityEvents}
                </span>
              </div>
              <p
                className={`text-sm font-medium ${
                  theme === "dark" ? "text-slate-300" : "text-slate-700"
                }`}
              >
                High Severity Events
              </p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div
          className={`backdrop-blur-sm border rounded-xl p-4 mb-6 ${
            theme === "dark"
              ? "bg-slate-800/50 border-slate-700/50"
              : "bg-white/90 border-purple-200"
          }`}
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search posts, keywords, or users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                    theme === "dark"
                      ? "bg-slate-900/50 border-slate-700/50 text-white placeholder-slate-400"
                      : "bg-purple-50/50 border-purple-200 text-slate-800 placeholder-slate-500"
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={filter.severity}
                onChange={(e) => handleFilterChange("severity", e.target.value)}
                className={`px-3 py-2 rounded-lg border ${
                  theme === "dark"
                    ? "bg-slate-900/50 border-slate-700/50 text-white"
                    : "bg-purple-50/50 border-purple-200 text-slate-800"
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={filter.crimeType}
                onChange={(e) =>
                  handleFilterChange("crimeType", e.target.value)
                }
                className={`px-3 py-2 rounded-lg border ${
                  theme === "dark"
                    ? "bg-slate-900/50 border-slate-700/50 text-white"
                    : "bg-purple-50/50 border-purple-200 text-slate-800"
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              >
                <option value="">All Crime Types</option>
                <option value="theft">Theft</option>
                <option value="assault">Assault</option>
                <option value="drugs">Drugs</option>
                <option value="fraud">Fraud</option>
                <option value="vandalism">Vandalism</option>
                <option value="suspicious_activity">Suspicious Activity</option>
              </select>

              <select
                value={filter.platform}
                onChange={(e) => handleFilterChange("platform", e.target.value)}
                className={`px-3 py-2 rounded-lg border ${
                  theme === "dark"
                    ? "bg-slate-900/50 border-slate-700/50 text-white"
                    : "bg-purple-50/50 border-purple-200 text-slate-800"
                } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              >
                <option value="">All Platforms</option>
                <option value="twitter">Twitter</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="reddit">Reddit</option>
              </select>

              <button
                onClick={clearFilters}
                className={`px-4 py-2 rounded-lg transition-all ${
                  theme === "dark"
                    ? "bg-slate-700 text-white hover:bg-slate-600"
                    : "bg-purple-200 text-purple-700 hover:bg-purple-300"
                }`}
              >
                Clear Filters
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                  refreshing ? "animate-spin" : ""
                } ${
                  theme === "dark"
                    ? "bg-indigo-500 text-white hover:bg-indigo-600"
                    : "bg-indigo-500 text-white hover:bg-indigo-600"
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: "posts", label: "All Related Posts", count: posts.length },
            { key: "events", label: "Events", count: events.length },
            { key: "analytics", label: "Analytics", count: null },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.key
                  ? theme === "dark"
                    ? "bg-indigo-500 text-white"
                    : "bg-purple-500 text-white"
                  : theme === "dark"
                  ? "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50"
                  : "bg-white/90 text-purple-700 hover:bg-purple-100"
              }`}
            >
              {tab.label}
              {tab.count !== null && ` (${tab.count})`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div
          className={`backdrop-blur-sm border rounded-xl p-6 ${
            theme === "dark"
              ? "bg-slate-800/50 border-slate-700/50"
              : "bg-white/90 border-purple-200"
          }`}
        >
          {activeTab === "posts" && (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                  <p
                    className={`text-lg ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    No crime-related posts found
                  </p>
                  <p
                    className={`text-sm mt-2 ${
                      theme === "dark" ? "text-slate-500" : "text-slate-500"
                    }`}
                  >
                    Try adjusting your filters or search terms
                  </p>
                </div>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.postId}
                    className={`border rounded-lg p-4 transition-all duration-300 hover:shadow-md ${
                      theme === "dark"
                        ? "bg-slate-900/50 border-slate-700/50 hover:border-indigo-500/50"
                        : "bg-gradient-to-r from-red-50/50 to-orange-50/50 border-red-200 hover:border-red-400"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Post Header */}
                        <div className="flex items-center gap-3 mb-3">
                          {getPlatformIcon(post.platform)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-medium ${
                                  theme === "dark"
                                    ? "text-white"
                                    : "text-slate-800"
                                }`}
                              >
                                @{post.author.username}
                              </span>
                              {post.author.verified && (
                                <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                                  ✓ Verified
                                </span>
                              )}
                              <span
                                className={`text-sm ${
                                  theme === "dark"
                                    ? "text-slate-400"
                                    : "text-slate-600"
                                }`}
                              >
                                {post.author.displayName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <span>
                                {formatTimeAgo(post.metadata.createdAt)}
                              </span>
                              {post.metadata.location?.name && (
                                <>
                                  <MapPin className="w-3 h-3" />
                                  <span>{post.metadata.location.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Severity and Type */}
                        <div className="flex items-center gap-2 mb-3">
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(
                              post.analysis.severity
                            )}`}
                          >
                            {post.analysis.severity.toUpperCase()}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm ${
                              theme === "dark"
                                ? "bg-slate-700 text-slate-300"
                                : "bg-purple-100 text-purple-700"
                            }`}
                          >
                            {post.analysis.crimeType?.replace("_", " ") ||
                              "UNKNOWN"}
                          </span>
                          <span
                            className={`text-sm ${
                              theme === "dark"
                                ? "text-slate-400"
                                : "text-slate-600"
                            }`}
                          >
                            {post.analysis.confidence}% confidence
                          </span>
                        </div>

                        {/* Content */}
                        <div
                          className={`mb-3 p-3 rounded-lg ${
                            theme === "dark" ? "bg-slate-800/50" : "bg-white/50"
                          }`}
                        >
                          <p
                            className={`mb-2 ${
                              theme === "dark"
                                ? "text-slate-300"
                                : "text-slate-700"
                            }`}
                          >
                            {post.content.text}
                          </p>

                          {post.content.imageUrl && (
                            <img
                              src={post.content.imageUrl}
                              alt="Post content"
                              className="rounded-lg mb-2 max-w-md"
                            />
                          )}
                        </div>

                        {/* Keywords */}
                        {post.analysis.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {post.analysis.keywords.map((keyword, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-1 rounded text-sm ${
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
                        <div className="flex items-center gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <span>💗</span> {post.metadata.likes}
                          </span>
                          <span className="flex items-center gap-1">
                            <span>🔄</span> {post.metadata.shares}
                          </span>
                          <span className="flex items-center gap-1">
                            <span>💬</span> {post.metadata.comments}
                          </span>
                          <span className="flex items-center gap-1">
                            <span>👁️</span> {post.metadata.views}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "events" && (
            <div className="space-y-4">
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                  <p
                    className={`text-lg ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    No active events
                  </p>
                </div>
              ) : (
                events.map((event) => (
                  <div
                    key={event.eventId}
                    className={`border rounded-lg p-4 transition-all duration-300 hover:shadow-md ${
                      theme === "dark"
                        ? "bg-slate-900/50 border-slate-700/50 hover:border-indigo-500/50"
                        : "bg-gradient-to-r from-orange-50/50 to-red-50/50 border-orange-200 hover:border-orange-400"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        {/* Event Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <AlertTriangle className="w-5 h-5 text-orange-500" />
                          <h3
                            className={`font-semibold text-lg ${
                              theme === "dark" ? "text-white" : "text-slate-800"
                            }`}
                          >
                            {event.title}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(
                              event.severity
                            )}`}
                          >
                            {event.severity.toUpperCase()}
                          </span>
                        </div>

                        <p
                          className={`mb-3 ${
                            theme === "dark"
                              ? "text-slate-300"
                              : "text-slate-700"
                          }`}
                        >
                          {event.description}
                        </p>

                        {/* Event Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          <div
                            className={`p-2 rounded ${
                              theme === "dark"
                                ? "bg-slate-800/50"
                                : "bg-purple-50/50"
                            }`}
                          >
                            <p
                              className={`text-xs ${
                                theme === "dark"
                                  ? "text-slate-400"
                                  : "text-slate-600"
                              }`}
                            >
                              Confidence
                            </p>
                            <p
                              className={`font-semibold ${
                                theme === "dark"
                                  ? "text-white"
                                  : "text-slate-800"
                              }`}
                            >
                              {event.confidence}%
                            </p>
                          </div>
                          <div
                            className={`p-2 rounded ${
                              theme === "dark"
                                ? "bg-slate-800/50"
                                : "bg-purple-50/50"
                            }`}
                          >
                            <p
                              className={`text-xs ${
                                theme === "dark"
                                  ? "text-slate-400"
                                  : "text-slate-600"
                              }`}
                            >
                              Posts
                            </p>
                            <p
                              className={`font-semibold ${
                                theme === "dark"
                                  ? "text-white"
                                  : "text-slate-800"
                              }`}
                            >
                              {event.posts.length}
                            </p>
                          </div>
                          <div
                            className={`p-2 rounded ${
                              theme === "dark"
                                ? "bg-slate-800/50"
                                : "bg-purple-50/50"
                            }`}
                          >
                            <p
                              className={`text-xs ${
                                theme === "dark"
                                  ? "text-slate-400"
                                  : "text-slate-600"
                              }`}
                            >
                              Authors
                            </p>
                            <p
                              className={`font-semibold ${
                                theme === "dark"
                                  ? "text-white"
                                  : "text-slate-800"
                              }`}
                            >
                              {event.aggregatedMetrics?.uniqueAuthors || 0}
                            </p>
                          </div>
                          <div
                            className={`p-2 rounded ${
                              theme === "dark"
                                ? "bg-slate-800/50"
                                : "bg-purple-50/50"
                            }`}
                          >
                            <p
                              className={`text-xs ${
                                theme === "dark"
                                  ? "text-slate-400"
                                  : "text-slate-600"
                              }`}
                            >
                              Reach
                            </p>
                            <p
                              className={`font-semibold ${
                                theme === "dark"
                                  ? "text-white"
                                  : "text-slate-800"
                              }`}
                            >
                              {event.aggregatedMetrics?.totalReach || 0}
                            </p>
                          </div>
                        </div>

                        {/* Keywords */}
                        {event.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {event.keywords.map((keyword, idx) => (
                              <span
                                key={idx}
                                className={`px-2 py-1 rounded text-sm ${
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
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "analytics" && (
            <div className="space-y-6">
              {stats && (
                <>
                  {/* Platform Distribution */}
                  <div>
                    <h3
                      className={`text-lg font-semibold mb-4 ${
                        theme === "dark" ? "text-white" : "text-slate-800"
                      }`}
                    >
                      Platform Distribution (Last 7 Days)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {stats.platformStats.map((platform, idx) => (
                        <div
                          key={platform._id}
                          className={`p-4 rounded-lg border ${
                            theme === "dark"
                              ? "bg-slate-900/50 border-slate-700/50"
                              : "bg-purple-50/50 border-purple-200"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {getPlatformIcon(platform._id)}
                            <span
                              className={`font-medium ${
                                theme === "dark"
                                  ? "text-white"
                                  : "text-slate-800"
                              }`}
                            >
                              {platform._id.charAt(0).toUpperCase() +
                                platform._id.slice(1)}
                            </span>
                          </div>
                          <p
                            className={`text-2xl font-bold ${
                              theme === "dark" ? "text-white" : "text-slate-800"
                            }`}
                          >
                            {platform.count}
                          </p>
                          <p
                            className={`text-sm ${
                              theme === "dark"
                                ? "text-slate-400"
                                : "text-slate-600"
                            }`}
                          >
                            posts
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Crime Type Distribution */}
                  <div>
                    <h3
                      className={`text-lg font-semibold mb-4 ${
                        theme === "dark" ? "text-white" : "text-slate-800"
                      }`}
                    >
                      Crime Type Distribution (Last 7 Days)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {stats.crimeTypeStats.map((crime, idx) => (
                        <div
                          key={crime._id}
                          className={`p-4 rounded-lg border ${
                            theme === "dark"
                              ? "bg-slate-900/50 border-slate-700/50"
                              : "bg-red-50/50 border-red-200"
                          }`}
                        >
                          <h4
                            className={`font-medium mb-2 ${
                              theme === "dark" ? "text-white" : "text-slate-800"
                            }`}
                          >
                            {crime._id
                              .replace("_", " ")
                              .charAt(0)
                              .toUpperCase() +
                              crime._id.replace("_", " ").slice(1)}
                          </h4>
                          <p
                            className={`text-2xl font-bold ${
                              theme === "dark" ? "text-white" : "text-slate-800"
                            }`}
                          >
                            {crime.count}
                          </p>
                          <p
                            className={`text-sm ${
                              theme === "dark"
                                ? "text-slate-400"
                                : "text-slate-600"
                            }`}
                          >
                            incidents
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
