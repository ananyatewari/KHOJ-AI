import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import SummaryPanel from "../search/SummaryPanel";
import { useAuth } from "../../context/AuthContext";
import { useTranscriptionWorkspace } from "../../context/TranscriptionContext";
import { useTheme } from "../../context/ThemeContext";

const apiClient = axios.create({
  baseURL: "http://localhost:3000",
});

const getEntityColors = (theme) => ({
  persons: theme === "dark" 
    ? "bg-indigo-500/20 text-indigo-200 border-indigo-400/60" 
    : "bg-indigo-100 text-indigo-700 border-indigo-300",
  places: theme === "dark"
    ? "bg-emerald-500/20 text-emerald-100 border-emerald-400/60"
    : "bg-emerald-100 text-emerald-700 border-emerald-300",
  organizations: theme === "dark"
    ? "bg-amber-500/20 text-amber-100 border-amber-400/60"
    : "bg-amber-100 text-amber-700 border-amber-300",
  phoneNumbers: theme === "dark"
    ? "bg-rose-500/20 text-rose-100 border-rose-400/60"
    : "bg-rose-100 text-rose-700 border-rose-300",
  dates: theme === "dark"
    ? "bg-purple-500/20 text-purple-100 border-purple-400/60"
    : "bg-purple-100 text-purple-700 border-purple-300",
});

const entityLabels = {
  persons: "Persons",
  places: "Locations",
  organizations: "Organizations",
  phoneNumbers: "Phone Numbers",
  dates: "Dates",
};

const entityOrder = [
  "persons",
  "places",
  "organizations",
  "phoneNumbers",
  "dates",
];

// Separate component for individual transcription items to manage state properly
function TranscriptionItem({ transcription, idx }) {
  const { theme } = useTheme();
  const [expandedTranscript, setExpandedTranscript] = useState(false);
  const entityColors = getEntityColors(theme);

  return (
    <div
      key={idx}
      className={`mb-8 p-4 rounded-lg border ${
        theme === "dark" 
          ? "bg-gray-700/50 border-gray-600" 
          : "bg-white border-gray-200 shadow-sm"
      }`}
    >
      <div className="mb-4">
        <h4 className={`font-medium ${
          theme === "dark" ? "text-white" : "text-slate-800"
        }`}>
          {transcription.filename}
        </h4>
      </div>

      {/* Full Transcript with Toggle */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h5 className={`text-sm font-medium ${
            theme === "dark" ? "text-gray-300" : "text-slate-600"
          }`}>
            📝 Full Transcript
          </h5>
          <button
            onClick={() => setExpandedTranscript(!expandedTranscript)}
            className={`text-xs transition ${
              theme === "dark" 
                ? "text-blue-400 hover:text-blue-300" 
                : "text-blue-600 hover:text-blue-700"
            }`}
          >
            {expandedTranscript ? "Collapse ▲" : "Expand ▼"}
          </button>
        </div>
        <div className={`text-sm leading-relaxed whitespace-pre-wrap overflow-y-auto rounded border p-3 ${
          theme === "dark" 
            ? "text-gray-400 bg-gray-900/30 border-gray-700" 
            : "text-slate-700 bg-gray-50 border-gray-200"
        } ${!expandedTranscript ? "line-clamp-3 max-h-20" : "max-h-96"}`}>
          {transcription.transcript}
        </div>
      </div>

      {/* Entities */}
      {transcription.entities &&
        Object.keys(transcription.entities).some(
          (key) => transcription.entities[key].length > 0
        ) && (
          <div className="mb-4">
            <h5 className={`text-sm font-medium mb-2 ${
              theme === "dark" ? "text-gray-300" : "text-slate-600"
            }`}>
              🏷️ Extracted Entities
            </h5>
            <div className="flex flex-wrap gap-2">
              {entityOrder.map(
                (entityType) =>
                  transcription.entities[entityType]?.length > 0 && (
                    <div
                      key={entityType}
                      className="flex flex-wrap gap-2"
                    >
                      {transcription.entities[entityType].map(
                        (entity, i) => (
                          <span
                            key={i}
                            className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${entityColors[entityType]}`}
                          >
                            {entity.text}
                          </span>
                        )
                      )}
                    </div>
                  )
              )}
            </div>
          </div>
        )}

      {/* AI Summary - Full Analysis */}
      {transcription.aiSummary && (
        <div className="mt-6 space-y-4">
          <h5 className={`text-sm font-semibold mb-3 ${
            theme === "dark" ? "text-gray-300" : "text-slate-700"
          }`}>
            ✨ AI Analysis
          </h5>

          {/* Executive Summary */}
          {transcription.aiSummary.executiveSummary && (
            <div className={`p-4 rounded-lg ${
              theme === "dark" ? "bg-gray-800/50" : "bg-indigo-50"
            }`}>
              <h6 className={`text-xs font-semibold mb-2 ${
                theme === "dark" ? "text-indigo-400" : "text-indigo-700"
              }`}>
                📌 Executive Summary
              </h6>
              <p className={`text-sm leading-relaxed ${
                theme === "dark" ? "text-gray-300" : "text-slate-700"
              }`}>
                {transcription.aiSummary.executiveSummary}
              </p>
            </div>
          )}

          {/* Key Findings */}
          {transcription.aiSummary.keyFindings?.length > 0 && (
            <div className={`p-4 rounded-lg ${
              theme === "dark" ? "bg-gray-800/50" : "bg-slate-50"
            }`}>
              <h6 className={`text-xs font-semibold mb-2 ${
                theme === "dark" ? "text-indigo-400" : "text-slate-700"
              }`}>
                🔍 Key Findings
              </h6>
              <ul className="space-y-1">
                {transcription.aiSummary.keyFindings.map((finding, i) => (
                  <li key={i} className={`flex gap-2 text-sm ${
                    theme === "dark" ? "text-gray-300" : "text-slate-600"
                  }`}>
                    <span className="text-indigo-400 flex-shrink-0">•</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Discussion Points */}
          {transcription.aiSummary.keyDiscussionPoints?.length > 0 && (
            <div className={`p-4 rounded-lg ${
              theme === "dark" ? "bg-gray-800/50" : "bg-blue-50"
            }`}>
              <h6 className={`text-xs font-semibold mb-2 ${
                theme === "dark" ? "text-blue-400" : "text-blue-700"
              }`}>
                💡 Key Discussion Points
              </h6>
              <ul className="space-y-1">
                {transcription.aiSummary.keyDiscussionPoints.map((point, i) => (
                  <li key={i} className={`flex gap-2 text-sm ${
                    theme === "dark" ? "text-gray-300" : "text-slate-600"
                  }`}>
                    <span className="text-blue-400 flex-shrink-0">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Decisions Made */}
          {transcription.aiSummary.decisionsMade?.length > 0 && (
            <div className={`p-4 rounded-lg ${
              theme === "dark" ? "bg-gray-800/50" : "bg-green-50"
            }`}>
              <h6 className={`text-xs font-semibold mb-2 ${
                theme === "dark" ? "text-green-400" : "text-green-700"
              }`}>
                ✅ Decisions Made
              </h6>
              <ul className="space-y-1">
                {transcription.aiSummary.decisionsMade.map((decision, i) => (
                  <li key={i} className={`flex gap-2 text-sm ${
                    theme === "dark" ? "text-gray-300" : "text-slate-600"
                  }`}>
                    <span className="text-green-400 flex-shrink-0">✓</span>
                    <span>{decision}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Items */}
          {transcription.aiSummary.actionItems?.length > 0 && (
            <div className={`p-4 rounded-lg ${
              theme === "dark" ? "bg-gray-800/50" : "bg-amber-50"
            }`}>
              <h6 className={`text-xs font-semibold mb-2 ${
                theme === "dark" ? "text-amber-400" : "text-amber-700"
              }`}>
                🎯 Action Items
              </h6>
              <div className="space-y-2">
                {transcription.aiSummary.actionItems.map((item, i) => (
                  <div key={i} className={`p-2 rounded border ${
                    theme === "dark" 
                      ? "bg-gray-700/50 border-gray-600" 
                      : "bg-white border-gray-200"
                  }`}>
                    <p className={`text-sm font-medium ${
                      theme === "dark" ? "text-gray-300" : "text-slate-700"
                    }`}>
                      {item.item || item}
                    </p>
                    {(item.assignee || item.dueDate) && (
                      <div className={`flex gap-3 text-xs mt-1 ${
                        theme === "dark" ? "text-gray-400" : "text-slate-500"
                      }`}>
                        {item.assignee && <span>👤 {item.assignee}</span>}
                        {item.dueDate && <span>📅 {item.dueDate}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {transcription.aiSummary.nextSteps?.length > 0 && (
            <div className={`p-4 rounded-lg ${
              theme === "dark" ? "bg-gray-800/50" : "bg-purple-50"
            }`}>
              <h6 className={`text-xs font-semibold mb-2 ${
                theme === "dark" ? "text-purple-400" : "text-purple-700"
              }`}>
                📋 Next Steps
              </h6>
              <ul className="space-y-1">
                {transcription.aiSummary.nextSteps.map((step, i) => (
                  <li key={i} className={`flex gap-2 text-sm ${
                    theme === "dark" ? "text-gray-300" : "text-slate-600"
                  }`}>
                    <span className="text-purple-400 flex-shrink-0">→</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Important Deadlines */}
          {transcription.aiSummary.importantDeadlines?.length > 0 && (
            <div className={`p-4 rounded-lg ${
              theme === "dark" ? "bg-gray-800/50" : "bg-red-50"
            }`}>
              <h6 className={`text-xs font-semibold mb-2 ${
                theme === "dark" ? "text-red-400" : "text-red-700"
              }`}>
                ⏰ Important Deadlines
              </h6>
              <ul className="space-y-1">
                {transcription.aiSummary.importantDeadlines.map((deadline, i) => (
                  <li key={i} className={`flex gap-2 text-sm ${
                    theme === "dark" ? "text-gray-300" : "text-slate-600"
                  }`}>
                    <span className="text-red-400 flex-shrink-0">⚠️</span>
                    <span>{deadline}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Analyst Takeaways */}
          {transcription.aiSummary.analystTakeaways?.length > 0 && (
            <div className={`p-4 rounded-lg ${
              theme === "dark" ? "bg-gray-800/50" : "bg-yellow-50"
            }`}>
              <h6 className={`text-xs font-semibold mb-2 ${
                theme === "dark" ? "text-yellow-400" : "text-yellow-700"
              }`}>
                💡 Analyst Takeaways
              </h6>
              <ul className="space-y-1">
                {transcription.aiSummary.analystTakeaways.map((takeaway, i) => (
                  <li key={i} className={`flex gap-2 text-sm ${
                    theme === "dark" ? "text-gray-300" : "text-slate-600"
                  }`}>
                    <span className="text-yellow-400 flex-shrink-0">⭐</span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Takeaways */}
          {transcription.aiSummary.takeaways?.length > 0 && (
            <div className={`p-4 rounded-lg ${
              theme === "dark" ? "bg-gray-800/50" : "bg-cyan-50"
            }`}>
              <h6 className={`text-xs font-semibold mb-2 ${
                theme === "dark" ? "text-cyan-400" : "text-cyan-700"
              }`}>
                🎁 Key Takeaways
              </h6>
              <ul className="space-y-1">
                {transcription.aiSummary.takeaways.map((takeaway, i) => (
                  <li key={i} className={`flex gap-2 text-sm ${
                    theme === "dark" ? "text-gray-300" : "text-slate-600"
                  }`}>
                    <span className="text-cyan-400 flex-shrink-0">✦</span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AudioUploader() {
  const {
    selectedFiles,
    setSelectedFiles,
    transcriptions,
    setTranscriptions,
    summary,
    setSummary,
    summaryLoading,
    setSummaryLoading,
    uploading,
    setUploading,
    analysisMessage,
    setAnalysisMessage,
    clearWorkspace,
  } = useTranscriptionWorkspace();
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user, token } = useAuth() || {};
  const { theme } = useTheme();

  const [dragActive, setDragActive] = useState(false);

  const totalSize = useMemo(() => {
    if (!selectedFiles.length) return 0;
    return selectedFiles.reduce((acc, file) => acc + file.size, 0);
  }, [selectedFiles]);

  const totalSizeLabel = totalSize
    ? `${(totalSize / 1024 / 1024).toFixed(2)} MB total`
    : null;

  const handleFileChange = (e) => {
    const pickedFiles = Array.from(e.target.files || []);
    const validAudio = pickedFiles.filter(
      (file) =>
        file.type.startsWith("audio/") ||
        ["video/mp4", "video/mpeg"].includes(file.type)
    );

    if (pickedFiles.length && !validAudio.length) {
      setError(
        "Only audio files (MP3, WAV, M4A) or MP4 videos are supported for transcription."
      );
      return;
    }

    if (!validAudio.length) return;

    setSelectedFiles((prev) => {
      const merged = [...prev, ...validAudio];
      return merged.slice(0, 5); // enforce 5 file cap
    });
    setError("");
  };

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
    setError("");
  };

  const removeFileAtIndex = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFiles.length) {
      setError("Upload at least one audio file to continue.");
      return;
    }

    setUploading(true);
    setSummaryLoading(true);
    setError("");
    setAnalysisMessage("");

    try {
      const uploadPromises = selectedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("audio", file);
        if (user?.username) formData.append("userId", user.username);
        if (user?.agency) formData.append("agency", user.agency);

        const response = await apiClient.post(
          "/api/transcription/process",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          }
        );

        return response.data?.transcription || null;
      });

      const processedTranscriptions = (
        await Promise.all(uploadPromises)
      ).filter(Boolean);

      setTranscriptions(processedTranscriptions);

      // Combine all summaries
      if (processedTranscriptions.length > 0) {
        setSummary({
          executiveSummary: processedTranscriptions
            .map((t) => t.aiSummary?.executiveSummary || "")
            .join("\n\n"),
          keyDiscussionPoints: processedTranscriptions.flatMap(
            (t) => t.aiSummary?.keyDiscussionPoints || []
          ),
          decisionsMade: processedTranscriptions.flatMap(
            (t) => t.aiSummary?.decisionsMade || []
          ),
          actionItems: processedTranscriptions.flatMap(
            (t) => t.aiSummary?.actionItems || []
          ),
          nextSteps: processedTranscriptions.flatMap(
            (t) => t.aiSummary?.nextSteps || []
          ),
          importantDeadlines: processedTranscriptions.flatMap(
            (t) => t.aiSummary?.importantDeadlines || []
          ),
          takeaways: processedTranscriptions.flatMap(
            (t) => t.aiSummary?.takeaways || []
          ),
        });
      }

      if (processedTranscriptions.length < selectedFiles.length) {
        setAnalysisMessage(
          "Some audio files could not be processed. View processed results below."
        );
      } else {
        setAnalysisMessage(
          `Transcription completed for ${
            processedTranscriptions.length
          } audio file${processedTranscriptions.length > 1 ? "s" : ""}.`
        );
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.response?.data?.error || "Failed to process audio files");
    } finally {
      setUploading(false);
      setSummaryLoading(false);
    }
  };

  const downloadSummary = async () => {
    if (!transcriptions || transcriptions.length === 0) return;
    
    // Download PDF for the first transcription (or combine if multiple)
    const transcriptionId = transcriptions[0].id;
    
    try {
      const response = await fetch(`http://localhost:3000/api/transcription/download-analysis/${transcriptionId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${transcriptions[0].filename.replace(/\.[^/.]+$/, "")}_analysis.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading analysis:", error);
      alert("Failed to download analysis");
    }
  };

  return (
    <div className={`rounded-lg p-6 shadow-md border ${
      theme === "dark" 
        ? "bg-gray-800 border-gray-700" 
        : "bg-white border-gray-200"
    }`}>
      <h2 className={`text-xl font-semibold mb-2 ${
        theme === "dark" ? "text-white" : "text-slate-800"
      }`}>
        Audio Transcription & Analysis
      </h2>
      <p className={`text-sm mb-6 ${
        theme === "dark" ? "text-gray-400" : "text-slate-600"
      }`}>
        Upload up to 5 audio files to transcribe, extract entities, and get AI
        analyst takeaways including key points, decisions, and action items.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label className={`font-medium ${
            theme === "dark" ? "text-gray-300" : "text-slate-700"
          }`}>
            Upload Audio Files
          </label>
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
              dragActive
                ? "border-blue-400 bg-blue-500/10"
                : theme === "dark"
                  ? "border-gray-600 hover:border-blue-500"
                  : "border-gray-300 hover:border-blue-500 bg-gray-50"
            }`}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.currentTarget.contains(e.relatedTarget)) return;
              setDragActive(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragActive(false);
              const droppedFiles = Array.from(e.dataTransfer.files || []);
              const validAudio = droppedFiles.filter(
                (file) =>
                  file.type.startsWith("audio/") ||
                  ["video/mp4", "video/mpeg"].includes(file.type)
              );
              if (!validAudio.length) {
                setError(
                  "Only audio files (MP3, WAV, M4A) or MP4 videos are supported."
                );
              } else {
                handleFileChange({ target: { files: validAudio } });
              }
            }}
          >
            <input
              type="file"
              multiple
              accept="audio/*,video/mp4,video/mpeg"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <div className="text-center">
              <svg
                className={`w-12 h-12 mx-auto mb-2 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <p className={`font-medium ${
                theme === "dark" ? "text-gray-300" : "text-slate-700"
              }`}>
                Drag audio files here or click to browse
              </p>
              <p className={`text-sm ${
                theme === "dark" ? "text-gray-500" : "text-slate-500"
              }`}>
                MP3, WAV, M4A, or MP4 · Max 5 files
              </p>
            </div>
          </div>
        </div>

        {totalSizeLabel && (
          <p className={`text-sm ${
            theme === "dark" ? "text-gray-400" : "text-slate-600"
          }`}>Total size: {totalSizeLabel}</p>
        )}

        {selectedFiles.length > 0 && (
          <div className={`rounded-lg p-4 ${
            theme === "dark" ? "bg-gray-700/50" : "bg-slate-50"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-medium ${
                theme === "dark" ? "text-gray-300" : "text-slate-700"
              }`}>
                Selected Files ({selectedFiles.length})
              </h3>
              <button
                type="button"
                onClick={clearSelectedFiles}
                className={`transition text-sm ${
                  theme === "dark" 
                    ? "text-gray-400 hover:text-red-400" 
                    : "text-slate-600 hover:text-red-600"
                }`}
              >
                Clear All
              </button>
            </div>
            <ul className="space-y-2">
              {selectedFiles.map((file, idx) => (
                <li
                  key={idx}
                  className={`flex items-center justify-between p-2 rounded ${
                    theme === "dark" ? "bg-gray-600/50" : "bg-white border border-gray-200"
                  }`}
                >
                  <span className={`text-sm truncate flex items-center gap-2 ${
                    theme === "dark" ? "text-gray-300" : "text-slate-700"
                  }`}>
                    <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFileAtIndex(idx)}
                    className="text-red-400 hover:text-red-500 transition"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!selectedFiles.length || uploading}
          className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md ${
            !selectedFiles.length || uploading
              ? theme === "dark"
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
              : theme === "dark"
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/50"
                : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-indigo-400/50 hover:shadow-lg hover:shadow-indigo-400/50"
          }`}
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Processing Audio...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <span>Transcribe & Analyze</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </>
          )}
        </button>
      </form>

      {analysisMessage && (
        <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 text-green-200 rounded-lg text-sm">
          {analysisMessage}
        </div>
      )}

      {transcriptions.length > 0 && (
        <div className="mt-8 space-y-6">
          <div className="border-t border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                📊 Transcription Results
              </h3>
              {summary && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadSummary}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm transition"
                  >
                    📥 Download Summary
                  </button>
                </div>
              )}
            </div>

            {transcriptions.map((transcription, idx) => (
              <TranscriptionItem key={idx} transcription={transcription} idx={idx} />
            ))}
          </div>
        </div>
      )}

      {summaryLoading && (
        <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/50 text-blue-200 rounded-lg text-sm text-center">
          🔍 Analyzing transcription... This may take a moment.
        </div>
      )}
    </div>
  );
}
