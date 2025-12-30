import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import GeoTaggedMapLeaflet from "../components/geotagging/GeoTaggedMapLeaflet";
import { MapPin, FileText, BarChart3, Filter, RefreshCw } from "lucide-react";
import axios from "axios";

export default function Geotagging() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const agency = user.agency;

  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  const fetchGeotaggedDocuments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:3000/api/geotagging/documents",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setDocuments(response.data.documents);
      setStats(response.data.stats);
    } catch (error) {
      console.error("Error fetching geotagged documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGeotaggedDocuments();
  }, []);

  const handleDocumentClick = (document) => {
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };

  const getDocumentTypeIcon = (fileType) => {
    switch (fileType) {
      case "pdf":
        return "📄";
      case "xlsx":
      case "xls":
        return "📊";
      case "docx":
      case "doc":
        return "📝";
      case "txt":
        return "📃";
      default:
        return "📄";
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-gradient-to-br from-slate-900 to-slate-800"
          : "bg-gradient-to-br from-gray-50 to-blue-50"
      }`}
    >
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1
                className={`text-3xl font-bold mb-2 flex items-center gap-3 ${
                  theme === "dark" ? "text-white" : "text-slate-800"
                }`}
              >
                <MapPin className="w-8 h-8 text-indigo-600" />
                Geotagged Intelligence
              </h1>
              <p
                className={`text-sm ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Agency:{" "}
                <span className="text-indigo-400 font-medium">
                  {agency.toUpperCase()}
                </span>
              </p>
            </div>
            <button
              onClick={fetchGeotaggedDocuments}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all transform hover:scale-105 ${
                theme === "dark"
                  ? "bg-slate-700 hover:bg-slate-600 text-white shadow-lg"
                  : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-md"
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
            <div
              className={`backdrop-blur-sm border rounded-xl p-6 transition-all hover:shadow-lg ${
                theme === "dark"
                  ? "bg-slate-800/60 border-slate-700/50 hover:bg-slate-800/80"
                  : "bg-white/90 border-purple-200/50 shadow-md hover:shadow-xl"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    theme === "dark" ? "bg-blue-500/20" : "bg-blue-100"
                  }`}
                >
                  <FileText
                    className={`w-6 h-6 ${
                      theme === "dark" ? "text-blue-400" : "text-blue-600"
                    }`}
                  />
                </div>
                <div>
                  <p
                    className={`text-2xl font-bold ${
                      theme === "dark" ? "text-white" : "text-slate-800"
                    }`}
                  >
                    {stats.totalDocuments}
                  </p>
                  <p
                    className={`text-sm ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Documents with Locations
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`backdrop-blur-sm border rounded-xl p-6 transition-all hover:shadow-lg ${
                theme === "dark"
                  ? "bg-slate-800/60 border-slate-700/50 hover:bg-slate-800/80"
                  : "bg-white/90 border-purple-200/50 shadow-md hover:shadow-xl"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    theme === "dark" ? "bg-green-500/20" : "bg-green-100"
                  }`}
                >
                  <MapPin
                    className={`w-6 h-6 ${
                      theme === "dark" ? "text-green-400" : "text-green-600"
                    }`}
                  />
                </div>
                <div>
                  <p
                    className={`text-2xl font-bold ${
                      theme === "dark" ? "text-white" : "text-slate-800"
                    }`}
                  >
                    {stats.totalLocations}
                  </p>
                  <p
                    className={`text-sm ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Unique Locations
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`backdrop-blur-sm border rounded-xl p-6 transition-all hover:shadow-lg ${
                theme === "dark"
                  ? "bg-slate-800/60 border-slate-700/50 hover:bg-slate-800/80"
                  : "bg-white/90 border-purple-200/50 shadow-md hover:shadow-xl"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    theme === "dark" ? "bg-purple-500/20" : "bg-purple-100"
                  }`}
                >
                  <BarChart3
                    className={`w-6 h-6 ${
                      theme === "dark" ? "text-purple-400" : "text-purple-600"
                    }`}
                  />
                </div>
                <div>
                  <p
                    className={`text-2xl font-bold ${
                      theme === "dark" ? "text-white" : "text-slate-800"
                    }`}
                  >
                    {stats.mostActiveLocations[0]?.count || 0}
                  </p>
                  <p
                    className={`text-sm ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Most Active Location
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`backdrop-blur-sm border rounded-xl p-6 transition-all hover:shadow-lg ${
                theme === "dark"
                  ? "bg-slate-800/60 border-slate-700/50 hover:bg-slate-800/80"
                  : "bg-white/90 border-purple-200/50 shadow-md hover:shadow-xl"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    theme === "dark" ? "bg-amber-500/20" : "bg-amber-100"
                  }`}
                >
                  <Filter
                    className={`w-6 h-6 ${
                      theme === "dark" ? "text-amber-400" : "text-amber-600"
                    }`}
                  />
                </div>
                <div>
                  <p
                    className={`text-2xl font-bold ${
                      theme === "dark" ? "text-white" : "text-slate-800"
                    }`}
                  >
                    {Object.keys(stats.locationFrequency).length}
                  </p>
                  <p
                    className={`text-sm ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Location Types
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
          <div className="xl:col-span-2">
            <div
              className={`backdrop-blur-sm border rounded-xl overflow-hidden transition-all hover:shadow-xl ${
                theme === "dark"
                  ? "bg-slate-800/60 border-slate-700/50 hover:bg-slate-800/80"
                  : "bg-white/90 border-purple-200/50 shadow-lg hover:shadow-2xl"
              }`}
            >
              <div
                className={`p-4 lg:p-6 border-b ${
                  theme === "dark" ? "border-slate-700" : "border-purple-200"
                }`}
              >
                <h2
                  className={`text-xl font-semibold flex items-center gap-2 ${
                    theme === "dark" ? "text-white" : "text-slate-800"
                  }`}
                >
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  Geographic Distribution
                </h2>
                <p
                  className={`text-sm mt-1 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  Click on markers to view documents from that location
                </p>
              </div>
              <div className="p-4 lg:p-6">
                <GeoTaggedMapLeaflet
                  documents={documents}
                  theme={theme}
                  onDocumentClick={handleDocumentClick}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div
              className={`backdrop-blur-sm border rounded-xl p-6 transition-all hover:shadow-lg ${
                theme === "dark"
                  ? "bg-slate-800/60 border-slate-700/50 hover:bg-slate-800/80"
                  : "bg-white/90 border-purple-200/50 shadow-md hover:shadow-xl"
              }`}
            >
              <h3
                className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
                  theme === "dark" ? "text-white" : "text-slate-800"
                }`}
              >
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Most Active Locations
              </h3>

              {stats?.mostActiveLocations?.length > 0 ? (
                <div className="space-y-3">
                  {stats.mostActiveLocations
                    .slice(0, 8)
                    .map((location, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all transform hover:scale-102 ${
                          theme === "dark"
                            ? "bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/50 hover:border-indigo-500/50"
                            : "bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-indigo-400"
                        }`}
                        onClick={() => {
                          const locationDocs = documents.filter((doc) =>
                            doc.entities?.places?.some((place) =>
                              place
                                .toLowerCase()
                                .includes(location.location.toLowerCase())
                            )
                          );
                          if (locationDocs.length > 0) {
                            handleDocumentClick(locationDocs[0]);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              idx === 0
                                ? "bg-red-500 text-white shadow-lg"
                                : idx === 1
                                ? "bg-amber-500 text-white shadow-md"
                                : idx === 2
                                ? "bg-orange-500 text-white shadow-sm"
                                : theme === "dark"
                                ? "bg-slate-600 text-gray-300"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`font-medium capitalize truncate ${
                                theme === "dark"
                                  ? "text-white"
                                  : "text-slate-800"
                              }`}
                            >
                              {location.location}
                            </p>
                            <p
                              className={`text-xs ${
                                theme === "dark"
                                  ? "text-slate-400"
                                  : "text-slate-600"
                              }`}
                            >
                              {location.count} document
                              {location.count !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <MapPin
                          className={`w-4 h-4 flex-shrink-0 ${
                            theme === "dark"
                              ? "text-slate-400"
                              : "text-slate-600"
                          }`}
                        />
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin
                    className={`w-12 h-12 mx-auto mb-3 opacity-50 ${
                      theme === "dark" ? " text-slate-600" : "text-slate-400"
                    }`}
                  />
                  <p
                    className={`text-sm ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    No location data available yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {showDocumentModal && selectedDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              className={`max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-xl shadow-2xl ${
                theme === "dark" ? "bg-slate-800" : "bg-white"
              }`}
            >
              <div
                className={`p-6 border-b ${
                  theme === "dark" ? "border-slate-700" : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {getDocumentTypeIcon(selectedDocument.fileType)}
                    </span>
                    <div>
                      <h3
                        className={`text-lg font-semibold ${
                          theme === "dark" ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {selectedDocument.filename}
                      </h3>
                      <p
                        className={`text-sm ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        Uploaded by {selectedDocument.uploadedBy} •{" "}
                        {new Date(
                          selectedDocument.createdAt
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDocumentModal(false)}
                    className={`p-2 rounded-lg transition ${
                      theme === "dark"
                        ? "hover:bg-slate-700 text-gray-400"
                        : "hover:bg-gray-100 text-gray-600"
                    }`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {selectedDocument.entities?.places &&
                  selectedDocument.entities.places.length > 0 && (
                    <div className="mb-6">
                      <h4
                        className={`text-md font-semibold mb-3 ${
                          theme === "dark" ? "text-white" : "text-gray-900"
                        }`}
                      >
                        📍 Locations Mentioned
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedDocument.entities.places.map((place, idx) => (
                          <span
                            key={idx}
                            className={`px-3 py-1 text-sm rounded-full ${
                              theme === "dark"
                                ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                : "bg-blue-100 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {place}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedDocument.entities?.persons &&
                    selectedDocument.entities.persons.length > 0 && (
                      <div>
                        <h4
                          className={`text-md font-semibold mb-3 ${
                            theme === "dark" ? "text-white" : "text-gray-900"
                          }`}
                        >
                          👥 Persons
                        </h4>
                        <div className="space-y-1">
                          {selectedDocument.entities.persons
                            .slice(0, 5)
                            .map((person, idx) => (
                              <p
                                key={idx}
                                className={`text-sm ${
                                  theme === "dark"
                                    ? "text-gray-300"
                                    : "text-gray-700"
                                }`}
                              >
                                • {person}
                              </p>
                            ))}
                          {selectedDocument.entities.persons.length > 5 && (
                            <p
                              className={`text-xs ${
                                theme === "dark"
                                  ? "text-gray-400"
                                  : "text-gray-500"
                              }`}
                            >
                              ...and{" "}
                              {selectedDocument.entities.persons.length - 5}{" "}
                              more
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                  {selectedDocument.entities?.organizations &&
                    selectedDocument.entities.organizations.length > 0 && (
                      <div>
                        <h4
                          className={`text-md font-semibold mb-3 ${
                            theme === "dark" ? "text-white" : "text-gray-900"
                          }`}
                        >
                          🏢 Organizations
                        </h4>
                        <div className="space-y-1">
                          {selectedDocument.entities.organizations
                            .slice(0, 5)
                            .map((org, idx) => (
                              <p
                                key={idx}
                                className={`text-sm ${
                                  theme === "dark"
                                    ? "text-gray-300"
                                    : "text-gray-700"
                                }`}
                              >
                                • {org}
                              </p>
                            ))}
                          {selectedDocument.entities.organizations.length >
                            5 && (
                            <p
                              className={`text-xs ${
                                theme === "dark"
                                  ? "text-gray-400"
                                  : "text-gray-500"
                              }`}
                            >
                              ...and{" "}
                              {selectedDocument.entities.organizations.length -
                                5}{" "}
                              more
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                </div>

                {selectedDocument.text && (
                  <div className="mt-6">
                    <h4
                      className={`text-md font-semibold mb-3 ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      📄 Full Document Transcript
                    </h4>
                    <div
                      className={`p-4 rounded-lg max-h-96 overflow-y-auto ${
                        theme === "dark" ? "bg-slate-700/50" : "bg-gray-50"
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {selectedDocument.text}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
