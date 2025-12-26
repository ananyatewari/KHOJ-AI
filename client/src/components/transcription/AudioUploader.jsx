import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import SummaryPanel from "../search/SummaryPanel";
import { useAuth } from "../../context/AuthContext";
import { useTranscriptionWorkspace } from "../../context/TranscriptionContext";

const apiClient = axios.create({
  baseURL: "http://localhost:3000",
});

const entityColors = {
  persons: "bg-indigo-500/20 text-indigo-200 border-indigo-400/60",
  places: "bg-emerald-500/20 text-emerald-100 border-emerald-400/60",
  organizations: "bg-amber-500/20 text-amber-100 border-amber-400/60",
  phoneNumbers: "bg-rose-500/20 text-rose-100 border-rose-400/60",
  dates: "bg-purple-500/20 text-purple-100 border-purple-400/60",
};

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

  const downloadSummary = () => {
    if (!summary) return;
    const blob = new Blob([JSON.stringify(summary, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audio-transcription-summary.json";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-md border border-gray-700">
      <h2 className="text-xl font-semibold text-white mb-2">
        Audio Transcription & Analysis
      </h2>
      <p className="text-gray-400 text-sm mb-6">
        Upload up to 5 audio files to transcribe, extract entities, and get AI
        analyst takeaways including key points, decisions, and action items.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label className="text-gray-300 font-medium">
            Upload Audio Files
          </label>
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
              dragActive
                ? "border-blue-400 bg-blue-500/10"
                : "border-gray-600 hover:border-blue-500"
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
                className="w-12 h-12 text-gray-400 mx-auto mb-2"
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
              <p className="text-gray-300 font-medium">
                Drag audio files here or click to browse
              </p>
              <p className="text-gray-500 text-sm">
                MP3, WAV, M4A, or MP4 · Max 5 files
              </p>
            </div>
          </div>
        </div>

        {totalSizeLabel && (
          <p className="text-gray-400 text-sm">Total size: {totalSizeLabel}</p>
        )}

        {selectedFiles.length > 0 && (
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-300 font-medium">
                Selected Files ({selectedFiles.length})
              </h3>
              <button
                type="button"
                onClick={clearSelectedFiles}
                className="text-gray-400 hover:text-red-400 transition text-sm"
              >
                Clear All
              </button>
            </div>
            <ul className="space-y-2">
              {selectedFiles.map((file, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between bg-gray-600/50 p-2 rounded"
                >
                  <span className="text-gray-300 text-sm truncate">
                    🎵 {file.name}
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
          className={`w-full py-2 px-4 rounded-lg font-medium transition ${
            !selectedFiles.length || uploading
              ? "bg-gray-600 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {uploading ? "Processing... 🔄" : "Transcribe & Analyze 🚀"}
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
              <div
                key={idx}
                className="mb-8 p-4 bg-gray-700/50 rounded-lg border border-gray-600"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white font-medium">
                    {transcription.filename}
                  </h4>
                  <button
                    onClick={() =>
                      navigate(`/app/transcription/${transcription.id}`)
                    }
                    className="text-blue-400 hover:text-blue-300 text-sm transition"
                  >
                    View Full →
                  </button>
                </div>

                {/* Transcript Preview */}
                <div className="mb-4">
                  <h5 className="text-gray-300 text-sm font-medium mb-2">
                    📝 Transcript (Preview)
                  </h5>
                  <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
                    {transcription.transcript?.substring(0, 300)}
                    {transcription.transcript?.length > 300 ? "..." : ""}
                  </p>
                </div>

                {/* Entities */}
                {transcription.entities &&
                  Object.keys(transcription.entities).some(
                    (key) => transcription.entities[key].length > 0
                  ) && (
                    <div className="mb-4">
                      <h5 className="text-gray-300 text-sm font-medium mb-2">
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

                {/* AI Summary */}
                {transcription.aiSummary && (
                  <SummaryPanel summary={transcription.aiSummary} />
                )}
              </div>
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
