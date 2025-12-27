import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import SummaryPanel from "../search/SummaryPanel";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useOcrWorkspace } from "../../context/OcrContext";

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

export default function DocumentUploader() {
  const { theme } = useTheme();
  const {
    selectedFiles,
    setSelectedFiles,
    documents,
    setDocuments,
    summary,
    setSummary,
    summaryLoading,
    setSummaryLoading,
    uploading,
    setUploading,
    analysisMessage,
    setAnalysisMessage,
    clearWorkspace,
  } = useOcrWorkspace();
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
    const validImages = pickedFiles.filter((file) =>
      file.type.startsWith("image/")
    );

    if (pickedFiles.length && !validImages.length) {
      setError("Only image files are supported for OCR intelligence.");
      return;
    }

    if (!validImages.length) return;

    setSelectedFiles((prev) => {
      const merged = [...prev, ...validImages];
      return merged.slice(0, 10); // enforce 10 image cap
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
      setError("Upload at least one image to continue.");
      return;
    }

    setUploading(true);
    setSummaryLoading(true);
    setError("");
    setAnalysisMessage("");

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("images", file));
      if (user?.username) formData.append("userId", user.username);
      if (user?.agency) formData.append("agency", user.agency);

      const response = await apiClient.post("/api/ocr/process", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const processedDocs = response.data?.documents || [];
      setDocuments(processedDocs);
      setSummary(response.data?.aiSummary || null);

      if (processedDocs.length < selectedFiles.length) {
        setAnalysisMessage(
          "Some images could not be processed. View processed results below."
        );
      } else {
        setAnalysisMessage(
          `Intelligence extracted from ${processedDocs.length} image${
            processedDocs.length > 1 ? "s" : ""
          }.`
        );
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.response?.data?.error || "Failed to process images");
    } finally {
      setUploading(false);
      setSummaryLoading(false);
    }
  };

  const downloadSummary = async () => {
    if (!summary) return;

    try {
      const response = await apiClient.post(
        "/api/ocr/download-pdf",
        {
          summary,
          documents,
        },
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          responseType: "blob",
        }
      );

      // Create blob from response
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "khoj-ai-ocr-intelligence-report.pdf";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("PDF download failed:", error);
      // Fallback to JSON if PDF generation fails
      const blob = new Blob([JSON.stringify(summary, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "image-intelligence-summary.json";
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div
      className={`rounded-lg p-6 shadow-md border ${
        theme === "dark"
          ? "bg-gray-800 border-gray-700"
          : "bg-white/80 border-purple-200 shadow-lg"
      }`}
    >
      <h2
        className={`text-xl font-semibold mb-2 ${
          theme === "dark" ? "text-white" : "text-slate-800"
        }`}
      >
        Intelligent Image OCR
      </h2>
      <p
        className={`text-sm mb-6 ${
          theme === "dark" ? "text-gray-400" : "text-slate-600"
        }`}
      >
        Upload up to 10 images to extract text, entities, and AI analyst
        takeaways. PDFs are handled separately in the document ingest flow.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label
            className={`font-medium ${
              theme === "dark" ? "text-gray-300" : "text-slate-700"
            }`}
          >
            Upload Intelligence Images
          </label>
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${
              dragActive
                ? "border-blue-400 bg-blue-500/10"
                : theme === "dark"
                ? "border-gray-600 hover:border-blue-500"
                : "border-purple-300 hover:border-purple-500 bg-purple-50/50"
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
              const validImages = droppedFiles.filter((file) =>
                file.type.startsWith("image/")
              );
              if (!validImages.length) {
                setError(
                  "Only image files are supported for OCR intelligence."
                );
                return;
              }
              setSelectedFiles((prev) => {
                const merged = [...prev, ...validImages];
                return merged.slice(0, 10);
              });
            }}
          >
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            {!selectedFiles.length ? (
              <div className="text-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                    theme === "dark" ? "bg-gray-700" : "bg-purple-100"
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={
                      theme === "dark" ? "text-blue-400" : "text-purple-600"
                    }
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
                <p
                  className={
                    theme === "dark" ? "text-gray-400" : "text-slate-600"
                  }
                >
                  Drag and drop images here or{" "}
                  <span
                    className={
                      theme === "dark"
                        ? "text-blue-400"
                        : "text-purple-600 font-medium"
                    }
                  >
                    browse
                  </span>
                </p>
                <p
                  className={`text-sm mt-1 ${
                    theme === "dark" ? "text-gray-500" : "text-slate-500"
                  }`}
                >
                  Supported formats: JPG, PNG, WEBP • Max 10 images
                </p>
              </div>
            ) : (
              <div
                className={`text-center text-sm ${
                  theme === "dark" ? "text-gray-300" : "text-slate-700"
                }`}
              >
                {selectedFiles.length} image
                {selectedFiles.length > 1 ? "s are" : " is"} queued for
                intelligence extraction. Use the controls below to manage your
                selection.
              </div>
            )}
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div
            className={`border rounded-lg p-4 ${
              theme === "dark"
                ? "bg-gray-900 border-gray-700"
                : "bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <p
                  className={`text-sm font-medium ${
                    theme === "dark" ? "text-gray-200" : "text-slate-800"
                  }`}
                >
                  Selected Images ({selectedFiles.length})
                </p>
                {totalSizeLabel && (
                  <p
                    className={`text-xs ${
                      theme === "dark" ? "text-gray-500" : "text-slate-600"
                    }`}
                  >
                    {totalSizeLabel}
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={clearSelectedFiles}
                  className={`text-xs underline-offset-2 underline ${
                    theme === "dark"
                      ? "text-red-300 hover:text-red-200"
                      : "text-red-600 hover:text-red-700"
                  }`}
                >
                  Clear Selection
                </button>
                <button
                  type="button"
                  onClick={clearWorkspace}
                  className={`text-xs underline-offset-2 underline ${
                    theme === "dark"
                      ? "text-gray-400 hover:text-gray-200"
                      : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  Reset Workspace
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${file.size}-${index}`}
                  className={`flex items-center justify-between border rounded-lg px-3 py-2 text-sm ${
                    theme === "dark"
                      ? "bg-gray-800/60 border-gray-700"
                      : "bg-white/80 border-purple-200"
                  }`}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div
                      className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-semibold ${
                        theme === "dark"
                          ? "bg-gray-700 text-gray-200"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`truncate ${
                          theme === "dark" ? "text-gray-100" : "text-slate-800"
                        }`}
                      >
                        {file.name}
                      </p>
                      <p
                        className={`text-xs ${
                          theme === "dark" ? "text-gray-500" : "text-slate-600"
                        }`}
                      >
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFileAtIndex(index)}
                    className={`text-xs px-2 py-1 rounded border ${
                      theme === "dark"
                        ? "text-red-300 hover:text-red-100 border-red-400/40"
                        : "text-red-600 hover:text-red-700 border-red-300"
                    }`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!selectedFiles.length || uploading}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md ${
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
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>Processing...</span>
              </>
            ) : (
              <>
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
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span>Extract Intelligence</span>
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
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </>
            )}
          </button>
        </div>
      </form>

      {analysisMessage && (
        <div className="mt-4 text-sm text-blue-300">{analysisMessage}</div>
      )}

      {/* AI Summary */}
      {summary && (
        <div className="mt-8 border-t border-gray-700 pt-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            AI Analyst Takeaways
          </h3>
          <SummaryPanel
            summary={summary}
            loading={summaryLoading}
            onDownload={downloadSummary}
          />
        </div>
      )}

      {/* Per-image intelligence */}
      {documents.length > 0 && (
        <div className="mt-8 border-t border-gray-700 pt-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">
            Image Intelligence Breakdown
          </h3>
          <div className="grid gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-gray-900 border border-gray-700 rounded-lg p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-white font-medium">{doc.filename}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(doc.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/app/document/${doc.id}`)}
                    className="text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
                  >
                    Open in Viewer
                  </button>
                </div>

                {doc.originalImage && (
                  <div className="relative mb-4">
                    <img
                      src={`http://localhost:3000${doc.originalImage}`}
                      alt={doc.filename}
                      className="w-full max-h-64 object-contain rounded border border-gray-800"
                    />
                  </div>
                )}

                <div className="mb-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">
                    Intelligence Snippet
                  </p>
                  <p className="text-gray-200 text-sm leading-relaxed">
                    {doc.text?.slice(0, 360) || "No readable text extracted."}
                    {doc.text?.length > 360 ? "…" : ""}
                  </p>
                </div>

                <div className="space-y-2">
                  {entityOrder.map((type) => {
                    const values = doc.entities?.[type] || [];
                    if (!values.length) return null;
                    return (
                      <div key={type}>
                        <p className="text-xs uppercase text-gray-500 mb-1">
                          {entityLabels[type]}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {values.slice(0, 8).map((entity, idx) => (
                            <span
                              key={`${type}-${entity.text || entity}-${idx}`}
                              className={`px-2 py-1 text-xs border rounded ${entityColors[type]}`}
                            >
                              {entity.text || entity}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
