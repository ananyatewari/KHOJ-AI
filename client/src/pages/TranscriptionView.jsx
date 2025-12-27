import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

// Entity type colors for visual distinction
const entityColors = {
  persons: "#4f46e5", // Indigo
  places: "#059669", // Emerald
  organizations: "#d97706", // Amber
  phoneNumbers: "#dc2626", // Red
  dates: "#7c3aed", // Purple
};

// Human-readable entity type labels
const entityLabels = {
  persons: "Person",
  places: "Location",
  organizations: "Organization",
  phoneNumbers: "Phone Number",
  dates: "Date",
};

const entityBgColors = {
  persons: "bg-indigo-500/20 text-indigo-200 border-indigo-400/60",
  places: "bg-emerald-500/20 text-emerald-100 border-emerald-400/60",
  organizations: "bg-amber-500/20 text-amber-100 border-amber-400/60",
  phoneNumbers: "bg-rose-500/20 text-rose-100 border-rose-400/60",
  dates: "bg-purple-500/20 text-purple-100 border-purple-400/60",
};

const entityOrder = [
  "persons",
  "places",
  "organizations",
  "phoneNumbers",
  "dates",
];

export default function TranscriptionView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transcription, setTranscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("transcript");

  // Fetch transcription details
  useEffect(() => {
    const fetchTranscription = async () => {
      try {
        console.log("Fetching transcription with ID:", id);
        const response = await axios.get(`/api/transcription/${id}`);
        console.log("Transcription data received:", response.data);
        setTranscription(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error loading transcription:", err);
        setError(
          "Failed to load transcription. " +
            (err.response?.data?.error || err.message)
        );
        setLoading(false);
      }
    };

    fetchTranscription();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-gray-400 mt-4">Loading transcription...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-200">
          {error}
        </div>
        <button
          onClick={() => navigate("/app/transcription")}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          ← Back to Transcriptions
        </button>
      </div>
    );
  }

  if (!transcription) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <p className="text-gray-400">Transcription not found</p>
        <button
          onClick={() => navigate("/app/transcription")}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          ← Back to Transcriptions
        </button>
      </div>
    );
  }

  const hasEntities =
    transcription.entities &&
    Object.keys(transcription.entities).some(
      (key) => transcription.entities[key].length > 0
    );

  const renderEntities = (entities, type) => {
    if (!entities || !entities[type] || entities[type].length === 0)
      return null;

    return (
      <div key={type} className="mb-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">
          {entityLabels[type]}
        </h3>
        <div className="flex flex-wrap gap-2">
          {entities[type].map((entity, idx) => (
            <div
              key={idx}
              className={`px-3 py-1 rounded-full text-sm border cursor-default transition hover:shadow-lg ${entityBgColors[type]}`}
              title={`Confidence: ${(entity.confidence * 100).toFixed(0)}%`}
            >
              {entity.text}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/app/transcription")}
          className="text-blue-400 hover:text-blue-300 mb-4 transition flex items-center gap-2"
        >
          ← Back to Transcriptions
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {transcription.filename}
            </h1>
            <div className="flex gap-4 text-gray-400 text-sm">
              <span>📤 Uploaded by: {transcription.uploadedBy}</span>
              <span>
                📅 {new Date(transcription.createdAt).toLocaleDateString()}
              </span>
              <span>🏢 {transcription.agency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab("transcript")}
          className={`px-4 py-2 transition ${
            activeTab === "transcript"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-gray-300"
          }`}
        >
          📝 Transcript
        </button>
        {hasEntities && (
          <button
            onClick={() => setActiveTab("entities")}
            className={`px-4 py-2 transition ${
              activeTab === "entities"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            🏷️ Entities
          </button>
        )}
        {transcription.aiSummary && (
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-4 py-2 transition ${
              activeTab === "summary"
                ? "text-blue-400 border-b-2 border-blue-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            ✨ Analysis
          </button>
        )}
      </div>

      {/* Content */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        {/* Transcript Tab */}
        {activeTab === "transcript" && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              Full Transcript
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                {transcription.transcript}
              </p>
            </div>
          </div>
        )}

        {/* Entities Tab */}
        {activeTab === "entities" && hasEntities && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              🏷️ Extracted Entities
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {entityOrder.map((type) =>
                renderEntities(transcription.entities, type)
              )}
            </div>
          </div>
        )}

        {/* Summary/Analysis Tab */}
        {activeTab === "summary" && transcription.aiSummary && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">
              ✨ AI Analysis
            </h2>
            <div className="space-y-6">
              {/* Executive Summary */}
              {transcription.aiSummary.executiveSummary && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    📌 Executive Summary
                  </h3>
                  <p className="text-gray-300 leading-relaxed">
                    {transcription.aiSummary.executiveSummary}
                  </p>
                </div>
              )}

              {/* Key Discussion Points */}
              {transcription.aiSummary.keyDiscussionPoints?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    💡 Key Discussion Points
                  </h3>
                  <ul className="space-y-2">
                    {transcription.aiSummary.keyDiscussionPoints.map(
                      (point, idx) => (
                        <li key={idx} className="flex gap-3 text-gray-300">
                          <span className="text-blue-400 flex-shrink-0">•</span>
                          <span>{point}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {/* Decisions Made */}
              {transcription.aiSummary.decisionsMade?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    ✅ Decisions Made
                  </h3>
                  <ul className="space-y-2">
                    {transcription.aiSummary.decisionsMade.map(
                      (decision, idx) => (
                        <li key={idx} className="flex gap-3 text-gray-300">
                          <span className="text-green-400 flex-shrink-0">
                            ✓
                          </span>
                          <span>{decision}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {transcription.aiSummary.actionItems?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    🎯 Action Items
                  </h3>
                  <div className="space-y-2">
                    {transcription.aiSummary.actionItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-700/50 p-3 rounded-lg border border-gray-600"
                      >
                        <div className="flex items-start gap-3">
                          <input type="checkbox" className="mt-1 w-4 h-4" />
                          <div className="flex-1">
                            <p className="text-gray-300 font-medium">
                              {item.item}
                            </p>
                            <div className="flex gap-4 text-sm text-gray-400 mt-1">
                              {item.assignee && <span>👤 {item.assignee}</span>}
                              {item.dueDate && (
                                <span>📅 Due: {item.dueDate}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {transcription.aiSummary.nextSteps?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    📋 Next Steps
                  </h3>
                  <ul className="space-y-2">
                    {transcription.aiSummary.nextSteps.map((step, idx) => (
                      <li key={idx} className="flex gap-3 text-gray-300">
                        <span className="text-purple-400 flex-shrink-0">→</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Important Deadlines */}
              {transcription.aiSummary.importantDeadlines?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    ⏰ Important Deadlines
                  </h3>
                  <ul className="space-y-2">
                    {transcription.aiSummary.importantDeadlines.map(
                      (deadline, idx) => (
                        <li key={idx} className="flex gap-3 text-gray-300">
                          <span className="text-red-400 flex-shrink-0">⚠️</span>
                          <span>{deadline}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}

              {/* Takeaways */}
              {transcription.aiSummary.takeaways?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    🎁 Key Takeaways
                  </h3>
                  <ul className="space-y-2">
                    {transcription.aiSummary.takeaways.map((takeaway, idx) => (
                      <li key={idx} className="flex gap-3 text-gray-300">
                        <span className="text-yellow-400 flex-shrink-0">
                          ⭐
                        </span>
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Download Button */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={async () => {
            try {
              const response = await fetch(`http://localhost:3000/api/transcription/download-analysis/${transcription.id}`, {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`
                }
              });
              
              if (!response.ok) throw new Error("Download failed");
              
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${transcription.filename.replace(/\.[^/.]+$/, "")}_analysis.pdf`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } catch (error) {
              console.error("Error downloading analysis:", error);
              alert("Failed to download analysis");
            }
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
        >
          📥 Download Analysis PDF
        </button>
      </div>
    </div>
  );
}
