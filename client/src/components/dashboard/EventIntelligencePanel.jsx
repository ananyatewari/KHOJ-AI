import { useState, useEffect } from "react";
import { AlertTriangle, Clock, FileText, Users, MapPin, Building2, TrendingUp, ChevronRight, X, Shield, Eye } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import io from "socket.io-client";

export default function EventIntelligencePanel() {
  const { token } = useAuth();
  const { theme } = useTheme();
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDetails, setEventDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [previewDocument, setPreviewDocument] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchActiveEvents();
    fetchEventStats();

    const socket = io("http://localhost:3000");

    socket.on("event:updated", (data) => {
      console.log("Event updated:", data);
      fetchActiveEvents();
      fetchEventStats();
      
      if (selectedEvent && data.eventId === selectedEvent._id) {
        fetchEventDetails(data.eventId);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, selectedEvent]);

  const fetchActiveEvents = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/events/active", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventStats = async () => {
    try {
      const res = await fetch("http://localhost:3000/api/events/stats/summary", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch event stats:", error);
    }
  };

  const fetchEventDetails = async (eventId) => {
    setDetailsLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setEventDetails(data);
    } catch (error) {
      console.error("Failed to fetch event details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    fetchEventDetails(event._id);
  };

  const fetchFullDocumentDetails = async (doc) => {
    setPreviewLoading(true);
    
    // Check if document already has text/transcript data from event details
    if (doc.text || doc.transcript || doc.transcription) {
      // Use existing data, no need to fetch
      const normalizedDoc = {
        ...doc,
        text: doc.text || doc.transcript || doc.transcription || null,
        transcription: doc.transcript || doc.transcription || null
      };
      setPreviewDocument(normalizedDoc);
      setPreviewLoading(false);
      return;
    }
    
    // Fallback: try to fetch from API (might fail due to permissions)
    try {
      let endpoint = "";
      switch (doc.type) {
        case "Document":
          endpoint = `http://localhost:3000/api/document/${doc._id}`;
          break;
        case "OcrDocument":
          endpoint = `http://localhost:3000/api/ocr/${doc._id}`;
          break;
        case "Transcription":
          endpoint = `http://localhost:3000/api/transcription/${doc._id}`;
          break;
        default:
          throw new Error("Unknown document type");
      }

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        // If API call fails (403, 404, etc), use what we have
        console.warn(`Failed to fetch document ${doc._id}: ${res.status}`);
        setPreviewDocument(doc);
        setPreviewLoading(false);
        return;
      }
      
      const data = await res.json();
      
      // Normalize the data structure
      const normalizedDoc = {
        ...data,
        _id: data.id || doc._id,
        type: doc.type,
        text: data.text || data.transcript || null,
        transcription: data.transcript || null,
        filename: data.filename || doc.filename,
        createdAt: data.createdAt || doc.createdAt,
        uploadedBy: data.uploadedBy || doc.uploadedBy,
        agency: data.agency || doc.agency
      };
      
      setPreviewDocument(normalizedDoc);
    } catch (error) {
      console.error("Failed to fetch document details:", error);
      // Use whatever data we have from the event details
      setPreviewDocument(doc);
    } finally {
      setPreviewLoading(false);
    }
  };

  const getSeverityColor = (score) => {
    if (score >= 70) return "text-red-500 bg-red-50 border-red-200";
    if (score >= 40) return "text-orange-500 bg-orange-50 border-orange-200";
    return "text-yellow-500 bg-yellow-50 border-yellow-200";
  };

  const getSeverityLabel = (score) => {
    if (score >= 70) return "Critical";
    if (score >= 40) return "High";
    return "Medium";
  };

  const getConfidenceColor = (score) => {
    if (score >= 0.7) return "text-green-600";
    if (score >= 0.4) return "text-yellow-600";
    return "text-gray-600";
  };

  if (loading) {
    return (
      <div className={`rounded-lg shadow-md p-6 ${
        theme === "dark" ? "bg-slate-800" : "bg-white"
      }`}>
        <div className="animate-pulse">
          <div className="h-6 bg-slate-300 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-slate-200 rounded"></div>
            <div className="h-20 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`rounded-lg shadow-md p-6 ${
        theme === "dark" ? "bg-slate-800" : "bg-white"
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold flex items-center gap-2 ${
            theme === "dark" ? "text-white" : "text-slate-800"
          }`}>
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Event Intelligence
          </h2>
          {stats && (
            <div className="flex gap-2 text-xs">
              <span className={`px-2 py-1 rounded ${
                theme === "dark" ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600"
              }`}>
                {stats.activeEvents} Active
              </span>
              <span className="px-2 py-1 rounded bg-red-100 text-red-600">
                {stats.criticalEvents} Critical
              </span>
            </div>
          )}
        </div>

        {events.length === 0 ? (
          <div className={`text-center py-8 ${
            theme === "dark" ? "text-slate-400" : "text-slate-500"
          }`}>
            <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No active events detected</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {events.map((event) => (
              <div
                key={event._id}
                onClick={() => handleEventClick(event)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                  theme === "dark" 
                    ? "bg-slate-700 border-slate-600 hover:border-slate-500" 
                    : "bg-slate-50 border-slate-200 hover:border-indigo-300"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className={`font-semibold text-sm flex-1 ${
                    theme === "dark" ? "text-white" : "text-slate-800"
                  }`}>
                    {event.title}
                  </h3>
                  <ChevronRight className={`w-4 h-4 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-500"
                  }`} />
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${
                    getSeverityColor(event.severityScore)
                  }`}>
                    {getSeverityLabel(event.severityScore)} ({event.severityScore})
                  </span>
                  <span className={`text-xs font-medium ${
                    getConfidenceColor(event.confidenceScore)
                  }`}>
                    {Math.round(event.confidenceScore * 100)}% Confidence
                  </span>
                </div>

                <div className={`flex items-center gap-4 text-xs ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {event.metadata.totalDocuments} docs
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {event.metadata.uniqueEntities} entities
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(event.timeline.lastUpdated).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          details={eventDetails}
          loading={detailsLoading}
          onClose={() => {
            setSelectedEvent(null);
            setEventDetails(null);
          }}
          onPreview={fetchFullDocumentDetails}
          theme={theme}
        />
      )}

      {(previewDocument || previewLoading) && (
        <DocumentPreviewModal
          document={previewDocument}
          loading={previewLoading}
          onClose={() => {
            setPreviewDocument(null);
            setPreviewLoading(false);
          }}
          theme={theme}
        />
      )}
    </>
  );
}

function EventDetailsModal({ event, details, loading, onClose, onPreview, theme }) {
  if (!event) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden ${
        theme === "dark" ? "bg-slate-800" : "bg-white"
      }`}>
        <div className={`flex items-center justify-between p-6 border-b ${
          theme === "dark" ? "border-slate-700" : "border-slate-200"
        }`}>
          <h2 className={`text-xl font-bold ${
            theme === "dark" ? "text-white" : "text-slate-800"
          }`}>
            {event.title}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-opacity-10 hover:bg-slate-500 ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-slate-300 rounded w-3/4"></div>
              <div className="h-4 bg-slate-300 rounded w-1/2"></div>
            </div>
          ) : details ? (
            <div className="space-y-6">
              <div className={`p-4 rounded-lg border-2 ${
                theme === "dark" 
                  ? "bg-slate-700/50 border-slate-600" 
                  : "bg-blue-50 border-blue-200"
              }`}>
                <div className={`text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-slate-200" : "text-slate-700"
                }`}>
                  Agencies Involved:
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.agencies && event.agencies.map((agency, idx) => (
                    <span
                      key={idx}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        theme === "dark"
                          ? "bg-indigo-600 text-white"
                          : "bg-indigo-500 text-white"
                      }`}
                    >
                      {agency.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg ${
                  theme === "dark" ? "bg-slate-700" : "bg-slate-50"
                }`}>
                  <div className={`text-sm mb-1 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>
                    Severity Score
                  </div>
                  <div className="text-2xl font-bold text-red-500">
                    {event.severityScore}
                  </div>
                </div>
                <div className={`p-4 rounded-lg ${
                  theme === "dark" ? "bg-slate-700" : "bg-slate-50"
                }`}>
                  <div className={`text-sm mb-1 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>
                    Confidence Score
                  </div>
                  <div className="text-2xl font-bold text-green-500">
                    {Math.round(event.confidenceScore * 100)}%
                  </div>
                </div>
              </div>

              <div>
                <h3 className={`text-lg font-semibold mb-3 ${
                  theme === "dark" ? "text-white" : "text-slate-800"
                }`}>
                  Linked Entities
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {details.event.linkedEntities.persons?.length > 0 && (
                    <EntityList
                      title="Persons"
                      icon={<Users className="w-4 h-4" />}
                      entities={details.event.linkedEntities.persons}
                      theme={theme}
                    />
                  )}
                  {details.event.linkedEntities.places?.length > 0 && (
                    <EntityList
                      title="Places"
                      icon={<MapPin className="w-4 h-4" />}
                      entities={details.event.linkedEntities.places}
                      theme={theme}
                    />
                  )}
                  {details.event.linkedEntities.organizations?.length > 0 && (
                    <EntityList
                      title="Organizations"
                      icon={<Building2 className="w-4 h-4" />}
                      entities={details.event.linkedEntities.organizations}
                      theme={theme}
                    />
                  )}
                </div>
              </div>

              <div>
                <h3 className={`text-lg font-semibold mb-3 ${
                  theme === "dark" ? "text-white" : "text-slate-800"
                }`}>
                  Connected Documents ({details.documents.length})
                </h3>
                <div className="space-y-3">
                  {(() => {
                    const docsByAgency = {};
                    details.documents.forEach(doc => {
                      const agency = doc.agency || 'unknown';
                      if (!docsByAgency[agency]) {
                        docsByAgency[agency] = [];
                      }
                      docsByAgency[agency].push(doc);
                    });
                    
                    return Object.entries(docsByAgency).map(([agency, docs]) => (
                      <div key={agency} className={`rounded-lg border-2 overflow-hidden ${
                        theme === "dark" 
                          ? "border-slate-600" 
                          : "border-slate-200"
                      }`}>
                        <div className={`px-3 py-2 flex items-center gap-2 ${
                          theme === "dark"
                            ? "bg-slate-700 border-b border-slate-600"
                            : "bg-slate-100 border-b border-slate-200"
                        }`}>
                          <Shield className="w-4 h-4 text-indigo-500" />
                          <span className={`text-sm font-semibold ${
                            theme === "dark" ? "text-slate-200" : "text-slate-700"
                          }`}>
                            {agency.toUpperCase()}
                          </span>
                          <span className={`ml-auto text-xs ${
                            theme === "dark" ? "text-slate-400" : "text-slate-500"
                          }`}>
                            {docs.length} document{docs.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-0">
                          {docs.map((doc, idx) => (
                            <div
                              key={doc._id}
                              className={`p-3 ${
                                idx !== docs.length - 1 ? 'border-b' : ''
                              } ${
                                theme === "dark" 
                                  ? "bg-slate-800/50 border-slate-700" 
                                  : "bg-white border-slate-100"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={`font-medium text-sm truncate ${
                                      theme === "dark" ? "text-white" : "text-slate-800"
                                    }`}>
                                      {doc.filename}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                      theme === "dark"
                                        ? "bg-slate-700 text-slate-300"
                                        : "bg-slate-100 text-slate-600"
                                    }`}>
                                      {doc.type}
                                    </span>
                                    <span className={`text-xs ${
                                      theme === "dark" ? "text-slate-400" : "text-slate-500"
                                    }`}>
                                      {new Date(doc.createdAt).toLocaleString()}
                                    </span>
                                    {doc.uploadedBy && (
                                      <span className={`text-xs ${
                                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                                      }`}>
                                        • by {doc.uploadedBy}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => onPreview(doc)}
                                    className={`p-2 rounded-lg transition-colors ${
                                      theme === "dark"
                                        ? "hover:bg-slate-700 text-slate-400 hover:text-indigo-400"
                                        : "hover:bg-slate-100 text-slate-500 hover:text-indigo-600"
                                    }`}
                                    title="Preview document"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <div className="flex flex-col items-end gap-1">
                                    <div className="text-xs font-semibold text-indigo-500">
                                      {Math.round(doc.relevanceScore * 100)}%
                                    </div>
                                    <div className={`text-[10px] ${
                                      theme === "dark" ? "text-slate-500" : "text-slate-400"
                                    }`}>
                                      match
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EntityList({ title, icon, entities, theme }) {
  return (
    <div className={`p-4 rounded-lg ${
      theme === "dark" ? "bg-slate-700" : "bg-slate-50"
    }`}>
      <div className={`flex items-center gap-2 mb-3 font-semibold ${
        theme === "dark" ? "text-white" : "text-slate-800"
      }`}>
        {icon}
        {title}
      </div>
      <div className="space-y-2">
        {entities.slice(0, 5).map((entity, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between text-sm ${
              theme === "dark" ? "text-slate-300" : "text-slate-700"
            }`}
          >
            <span>{entity.text}</span>
            <span className={`text-xs ${
              theme === "dark" ? "text-slate-500" : "text-slate-500"
            }`}>
              {entity.frequency}x
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentPreviewModal({ document, loading, onClose, theme }) {
  if (loading || !document) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
        <div className={`rounded-lg shadow-2xl w-full max-w-4xl p-12 flex flex-col items-center justify-center ${
          theme === "dark" ? "bg-slate-800" : "bg-white"
        }`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mb-4"></div>
          <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
            Loading document details...
          </p>
        </div>
      </div>
    );
  }

  const hasText = document.text || document.transcription || document.transcript;
  const displayText = document.text || document.transcription || document.transcript || "";
  const hasSummary = document.aiSummary;
  
  // Handle aiSummary - it can be a string or an object
  const renderAiSummary = () => {
    if (!hasSummary) return null;
    
    if (typeof document.aiSummary === 'string') {
      return (
        <p className={`text-sm leading-relaxed ${
          theme === "dark" ? "text-slate-300" : "text-slate-700"
        }`}>
          {document.aiSummary}
        </p>
      );
    }
    
    // Handle object format
    const summary = document.aiSummary;
    return (
      <div className="space-y-3">
        {summary.executiveSummary && (
          <div>
            <h5 className={`text-xs font-semibold mb-1 ${
              theme === "dark" ? "text-indigo-300" : "text-indigo-700"
            }`}>
              Executive Summary
            </h5>
            <p className={`text-sm leading-relaxed ${
              theme === "dark" ? "text-slate-300" : "text-slate-700"
            }`}>
              {summary.executiveSummary}
            </p>
          </div>
        )}
        {summary.keyFindings && summary.keyFindings.length > 0 && (
          <div>
            <h5 className={`text-xs font-semibold mb-1 ${
              theme === "dark" ? "text-indigo-300" : "text-indigo-700"
            }`}>
              Key Findings
            </h5>
            <ul className={`text-sm space-y-1 list-disc list-inside ${
              theme === "dark" ? "text-slate-300" : "text-slate-700"
            }`}>
              {summary.keyFindings.map((finding, idx) => (
                <li key={idx}>{finding}</li>
              ))}
            </ul>
          </div>
        )}
        {summary.analystTakeaways && summary.analystTakeaways.length > 0 && (
          <div>
            <h5 className={`text-xs font-semibold mb-1 ${
              theme === "dark" ? "text-indigo-300" : "text-indigo-700"
            }`}>
              Analyst Takeaways
            </h5>
            <ul className={`text-sm space-y-1 list-disc list-inside ${
              theme === "dark" ? "text-slate-300" : "text-slate-700"
            }`}>
              {summary.analystTakeaways.map((takeaway, idx) => (
                <li key={idx}>{takeaway}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
      <div className={`rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col ${
        theme === "dark" ? "bg-slate-800" : "bg-white"
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          theme === "dark" ? "border-slate-700" : "border-slate-200"
        }`}>
          <div className="flex-1 min-w-0">
            <h3 className={`text-lg font-semibold truncate ${
              theme === "dark" ? "text-white" : "text-slate-800"
            }`}>
              {document.filename || document.originalFilename}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded ${
                theme === "dark"
                  ? "bg-slate-700 text-slate-300"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {document.type || "Document"}
              </span>
              <span className={`text-xs ${
                theme === "dark" ? "text-slate-400" : "text-slate-500"
              }`}>
                {new Date(document.createdAt).toLocaleString()}
              </span>
              {document.uploadedBy && (
                <span className={`text-xs ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}>
                  • by {document.uploadedBy}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-opacity-10 hover:bg-slate-500 ml-4 ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {/* AI Summary Section */}
          {hasSummary && (
            <div className={`p-4 rounded-lg border-2 ${
              theme === "dark"
                ? "bg-indigo-900/20 border-indigo-700"
                : "bg-indigo-50 border-indigo-200"
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className={`w-4 h-4 ${
                  theme === "dark" ? "text-indigo-400" : "text-indigo-600"
                }`} />
                <h4 className={`font-semibold text-sm ${
                  theme === "dark" ? "text-indigo-300" : "text-indigo-700"
                }`}>
                  AI Summary
                </h4>
              </div>
              {renderAiSummary()}
            </div>
          )}

          {/* Extracted Text Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className={`w-4 h-4 ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`} />
              <h4 className={`font-semibold ${
                theme === "dark" ? "text-white" : "text-slate-800"
              }`}>
                {document.type === "Transcription" ? "Transcription" : "Extracted Text"}
              </h4>
            </div>
            <div className={`p-4 rounded-lg border ${
              theme === "dark"
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-slate-200"
            }`}>
              {hasText ? (
                <pre className={`text-sm leading-relaxed whitespace-pre-wrap font-sans ${
                  theme === "dark" ? "text-slate-300" : "text-slate-700"
                }`}>
                  {displayText}
                </pre>
              ) : (
                <div className={`text-center py-8 ${
                  theme === "dark" ? "text-slate-500" : "text-slate-400"
                }`}>
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No extracted text available for this document</p>
                </div>
              )}
            </div>
          </div>

          {/* Entities Section */}
          {document.entities && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className={`w-4 h-4 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`} />
                <h4 className={`font-semibold ${
                  theme === "dark" ? "text-white" : "text-slate-800"
                }`}>
                  Extracted Entities
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {document.entities.persons && document.entities.persons.length > 0 && (
                  <div className={`p-3 rounded-lg ${
                    theme === "dark" ? "bg-slate-900 border border-slate-700" : "bg-slate-50 border border-slate-200"
                  }`}>
                    <div className={`text-xs font-medium mb-2 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}>
                      Persons
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {document.entities.persons.slice(0, 5).map((person, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-0.5 rounded ${
                            theme === "dark"
                              ? "bg-blue-900/40 text-blue-300"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {typeof person === 'string' ? person : person.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {document.entities.places && document.entities.places.length > 0 && (
                  <div className={`p-3 rounded-lg ${
                    theme === "dark" ? "bg-slate-900 border border-slate-700" : "bg-slate-50 border border-slate-200"
                  }`}>
                    <div className={`text-xs font-medium mb-2 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}>
                      Places
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {document.entities.places.slice(0, 5).map((place, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-0.5 rounded ${
                            theme === "dark"
                              ? "bg-green-900/40 text-green-300"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {typeof place === 'string' ? place : place.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {document.entities.organizations && document.entities.organizations.length > 0 && (
                  <div className={`p-3 rounded-lg ${
                    theme === "dark" ? "bg-slate-900 border border-slate-700" : "bg-slate-50 border border-slate-200"
                  }`}>
                    <div className={`text-xs font-medium mb-2 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}>
                      Organizations
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {document.entities.organizations.slice(0, 5).map((org, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-0.5 rounded ${
                            theme === "dark"
                              ? "bg-purple-900/40 text-purple-300"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {typeof org === 'string' ? org : org.text}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

