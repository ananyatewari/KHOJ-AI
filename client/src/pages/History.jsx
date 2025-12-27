import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNavigate } from "react-router-dom";
import { FileText, Image, Mic, Calendar, User, Eye, Download, Loader2 } from "lucide-react";

export default function History() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  
  const [filterType, setFilterType] = useState("all");
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [filterType]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/history?type=${filterType}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await response.json();
      setHistoryItems(data.items || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadOriginal = async (item) => {
    try {
      const response = await fetch(`http://localhost:3000/api/history/download/${item._id}?type=${item.type}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Failed to download file");
    }
  };

  const handleDownloadAnalysis = async (item) => {
    try {
      const response = await fetch(`http://localhost:3000/api/history/download-analysis/${item._id}?type=${item.type}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      
      if (!response.ok) throw new Error("Download failed");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.filename.replace(/\.[^/.]+$/, "")}_analysis.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading analysis:", error);
      alert("Failed to download analysis");
    }
  };

  const handlePreview = (item) => {
    setSelectedItem(item);
    setShowPreview(true);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "document":
        return <FileText size={20} className="text-blue-400" />;
      case "ocr":
        return <Image size={20} className="text-green-400" />;
      case "transcription":
        return <Mic size={20} className="text-purple-400" />;
      default:
        return <FileText size={20} className="text-slate-400" />;
    }
  };

  const getTypeBadge = (type) => {
    const badges = {
      document: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      ocr: "bg-green-500/20 text-green-400 border-green-500/30",
      transcription: "bg-purple-500/20 text-purple-400 border-purple-500/30"
    };
    return badges[type] || "bg-slate-500/20 text-slate-400 border-slate-500/30";
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className={`min-h-full ${theme === "dark" ? "bg-slate-900" : ""}`}>
      <div className="max-w-[1800px] mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === "dark" ? "text-white" : "text-slate-800"
          }`}>
            History
          </h1>
          <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
            View all your processed documents, images, and audio files
          </p>
        </div>

        {/* Filter Tabs */}
        <div className={`backdrop-blur-sm border rounded-xl p-6 mb-8 ${
          theme === "dark"
            ? "bg-slate-800/50 border-slate-700/50"
            : "bg-white/80 border-purple-200 shadow-lg"
        }`}>
          <div className="flex gap-3 flex-wrap">
            {[
              { id: "all", label: "All Items", icon: FileText },
              { id: "document", label: "Documents", icon: FileText },
              { id: "ocr", label: "Images", icon: Image },
              { id: "transcription", label: "Audio", icon: Mic }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setFilterType(filter.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition ${
                  filterType === filter.id
                    ? "bg-indigo-600 text-white shadow-lg"
                    : theme === "dark"
                    ? "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                    : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                }`}
              >
                <filter.icon size={18} />
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* History Items Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={40} className="animate-spin text-indigo-500" />
          </div>
        ) : historyItems.length === 0 ? (
          <div className={`backdrop-blur-sm border rounded-xl p-12 text-center ${
            theme === "dark"
              ? "bg-slate-800/50 border-slate-700/50"
              : "bg-white/80 border-purple-200 shadow-lg"
          }`}>
            <FileText size={48} className={`mx-auto mb-4 ${
              theme === "dark" ? "text-slate-600" : "text-slate-400"
            }`} />
            <h3 className={`text-xl font-semibold mb-2 ${
              theme === "dark" ? "text-white" : "text-slate-800"
            }`}>
              No History Found
            </h3>
            <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
              Start processing documents, images, or audio files to see them here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {historyItems.map((item) => (
              <div
                key={item._id}
                className={`backdrop-blur-sm border rounded-xl p-5 transition hover:shadow-xl ${
                  theme === "dark"
                    ? "bg-slate-800/50 border-slate-700/50 hover:border-indigo-500/50"
                    : "bg-white/80 border-purple-200 shadow-lg hover:border-indigo-400"
                }`}
              >
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    theme === "dark" ? "bg-slate-700/50" : "bg-purple-100"
                  }`}>
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold break-words ${
                      theme === "dark" ? "text-white" : "text-slate-800"
                    }`}>
                      {item.filename}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded border inline-block mt-1 ${getTypeBadge(item.type)}`}>
                      {item.type.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Metadata */}
                <div className={`space-y-2 mb-4 text-sm ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>
                  <div className="flex items-center gap-2">
                    <Calendar size={14} />
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={14} />
                    <span>{item.uploadedBy}</span>
                  </div>
                </div>

                {/* Preview Info */}
                {item.entities && (
                  <div className={`p-3 rounded-lg mb-4 ${
                    theme === "dark" ? "bg-slate-700/30" : "bg-purple-50"
                  }`}>
                    <p className={`text-xs font-medium mb-2 ${
                      theme === "dark" ? "text-slate-300" : "text-slate-700"
                    }`}>
                      Extracted Entities:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {item.entities.persons?.length > 0 && (
                        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                          {item.entities.persons.length} Persons
                        </span>
                      )}
                      {item.entities.places?.length > 0 && (
                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                          {item.entities.places.length} Places
                        </span>
                      )}
                      {item.entities.organizations?.length > 0 && (
                        <span className="text-xs px-2 py-1 bg-pink-500/20 text-pink-400 rounded">
                          {item.entities.organizations.length} Orgs
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* AI Summary Preview */}
                {item.aiSummary?.executiveSummary && (
                  <div className={`p-3 rounded-lg mb-4 ${
                    theme === "dark" ? "bg-indigo-500/10" : "bg-indigo-50"
                  }`}>
                    <p className={`text-xs font-medium mb-1 ${
                      theme === "dark" ? "text-indigo-400" : "text-indigo-700"
                    }`}>
                      AI Summary:
                    </p>
                    <p className={`text-xs line-clamp-2 ${
                      theme === "dark" ? "text-slate-300" : "text-slate-700"
                    }`}>
                      {item.aiSummary.executiveSummary}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <button
                  onClick={() => handlePreview(item)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    theme === "dark"
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  <Eye size={16} />
                  Preview
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && selectedItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl ${
            theme === "dark"
              ? "bg-slate-900 border border-slate-700"
              : "bg-white border border-purple-200"
          }`}>
            {/* Modal Header */}
            <div className={`sticky top-0 p-6 border-b flex items-center justify-between ${
              theme === "dark"
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-purple-200"
            }`}>
              <div className="flex items-center gap-3">
                {getTypeIcon(selectedItem.type)}
                <div>
                  <h2 className={`text-xl font-bold ${
                    theme === "dark" ? "text-white" : "text-slate-800"
                  }`}>
                    {selectedItem.filename}
                  </h2>
                  <p className={`text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>
                    {formatDate(selectedItem.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${
                  theme === "dark"
                    ? "hover:bg-slate-800 text-slate-400"
                    : "hover:bg-slate-100 text-slate-600"
                }`}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Text Preview */}
              {(selectedItem.text || selectedItem.transcript) && (
                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${
                    theme === "dark" ? "text-white" : "text-slate-800"
                  }`}>
                    {selectedItem.type === "transcription" ? "Transcript" : "Extracted Text"}
                  </h3>
                  <div className={`p-4 rounded-lg max-h-60 overflow-y-auto ${
                    theme === "dark" ? "bg-slate-800" : "bg-slate-50"
                  }`}>
                    <p className={`text-sm whitespace-pre-wrap break-words ${
                      theme === "dark" ? "text-slate-300" : "text-slate-700"
                    }`}>
                      {selectedItem.text || selectedItem.transcript}
                    </p>
                  </div>
                </div>
              )}

              {/* Entities */}
              {selectedItem.entities && (
                <div>
                  <h3 className={`text-lg font-semibold mb-3 ${
                    theme === "dark" ? "text-white" : "text-slate-800"
                  }`}>
                    Extracted Entities
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedItem.entities).map(([key, values]) => {
                      if (!values || values.length === 0) return null;
                      return (
                        <div key={key} className={`p-4 rounded-lg ${
                          theme === "dark" ? "bg-slate-800" : "bg-slate-50"
                        }`}>
                          <h4 className={`text-sm font-semibold mb-2 capitalize ${
                            theme === "dark" ? "text-slate-300" : "text-slate-700"
                          }`}>
                            {key.replace(/([A-Z])/g, " $1").trim()}
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {values.map((entity, idx) => (
                              <span
                                key={idx}
                                className={`text-xs px-2 py-1 rounded break-all ${
                                  theme === "dark"
                                    ? "bg-slate-700 text-slate-300"
                                    : "bg-white text-slate-700 border border-slate-200"
                                }`}
                              >
                                {typeof entity === "string" ? entity : entity.text}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* AI Summary */}
              <div>
                <h3 className={`text-lg font-semibold mb-3 ${
                  theme === "dark" ? "text-white" : "text-slate-800"
                }`}>
                  AI Analysis
                </h3>
                {selectedItem.aiSummary ? (
                  <div className="space-y-4">
                    {selectedItem.aiSummary.executiveSummary && (
                      <div className={`p-4 rounded-lg ${
                        theme === "dark" ? "bg-indigo-500/10" : "bg-indigo-50"
                      }`}>
                        <h4 className={`text-sm font-semibold mb-2 ${
                          theme === "dark" ? "text-indigo-400" : "text-indigo-700"
                        }`}>
                          Executive Summary
                        </h4>
                        <p className={`text-sm break-words ${
                          theme === "dark" ? "text-slate-300" : "text-slate-700"
                        }`}>
                          {selectedItem.aiSummary.executiveSummary}
                        </p>
                      </div>
                    )}

                    {selectedItem.aiSummary.keyFindings?.length > 0 && (
                      <div className={`p-4 rounded-lg ${
                        theme === "dark" ? "bg-slate-800" : "bg-slate-50"
                      }`}>
                        <h4 className={`text-sm font-semibold mb-2 ${
                          theme === "dark" ? "text-slate-300" : "text-slate-700"
                        }`}>
                          Key Findings
                        </h4>
                        <ul className="space-y-1">
                          {selectedItem.aiSummary.keyFindings.map((finding, idx) => (
                            <li key={idx} className={`text-sm flex gap-2 ${
                              theme === "dark" ? "text-slate-400" : "text-slate-600"
                            }`}>
                              <span className="text-indigo-400 flex-shrink-0">•</span>
                              <span className="break-words">{finding}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedItem.aiSummary.analystTakeaways?.length > 0 && (
                      <div className={`p-4 rounded-lg ${
                        theme === "dark" ? "bg-slate-800" : "bg-slate-50"
                      }`}>
                        <h4 className={`text-sm font-semibold mb-2 ${
                          theme === "dark" ? "text-slate-300" : "text-slate-700"
                        }`}>
                          Analyst Takeaways
                        </h4>
                        <ul className="space-y-1">
                          {selectedItem.aiSummary.analystTakeaways.map((takeaway, idx) => (
                            <li key={idx} className={`text-sm flex gap-2 ${
                              theme === "dark" ? "text-slate-400" : "text-slate-600"
                            }`}>
                              <span className="text-purple-400 flex-shrink-0">•</span>
                              <span className="break-words">{takeaway}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedItem.aiSummary.keyDiscussionPoints?.length > 0 && (
                      <div className={`p-4 rounded-lg ${
                        theme === "dark" ? "bg-slate-800" : "bg-slate-50"
                      }`}>
                        <h4 className={`text-sm font-semibold mb-2 ${
                          theme === "dark" ? "text-slate-300" : "text-slate-700"
                        }`}>
                          Key Discussion Points
                        </h4>
                        <ul className="space-y-1">
                          {selectedItem.aiSummary.keyDiscussionPoints.map((point, idx) => (
                            <li key={idx} className={`text-sm flex gap-2 ${
                              theme === "dark" ? "text-slate-400" : "text-slate-600"
                            }`}>
                              <span className="text-indigo-400 flex-shrink-0">•</span>
                              <span className="break-words">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedItem.aiSummary.decisionsMade?.length > 0 && (
                      <div className={`p-4 rounded-lg ${
                        theme === "dark" ? "bg-slate-800" : "bg-slate-50"
                      }`}>
                        <h4 className={`text-sm font-semibold mb-2 ${
                          theme === "dark" ? "text-slate-300" : "text-slate-700"
                        }`}>
                          Decisions Made
                        </h4>
                        <ul className="space-y-1">
                          {selectedItem.aiSummary.decisionsMade.map((decision, idx) => (
                            <li key={idx} className={`text-sm flex gap-2 ${
                              theme === "dark" ? "text-slate-400" : "text-slate-600"
                            }`}>
                              <span className="text-green-400 flex-shrink-0">•</span>
                              <span className="break-words">{decision}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedItem.aiSummary.actionItems?.length > 0 && (
                      <div className={`p-4 rounded-lg ${
                        theme === "dark" ? "bg-slate-800" : "bg-slate-50"
                      }`}>
                        <h4 className={`text-sm font-semibold mb-2 ${
                          theme === "dark" ? "text-slate-300" : "text-slate-700"
                        }`}>
                          Action Items
                        </h4>
                        <ul className="space-y-2">
                          {selectedItem.aiSummary.actionItems.map((action, idx) => (
                            <li key={idx} className={`text-sm ${
                              theme === "dark" ? "text-slate-400" : "text-slate-600"
                            }`}>
                              <div className="flex gap-2">
                                <span className="text-amber-400 flex-shrink-0">•</span>
                                <span className="break-words">{action.item || action}</span>
                              </div>
                              {action.assignee && (
                                <div className="ml-4 text-xs mt-1">Assignee: {action.assignee}</div>
                              )}
                              {action.dueDate && (
                                <div className="ml-4 text-xs mt-1">Due: {action.dueDate}</div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`p-6 rounded-lg text-center ${
                    theme === "dark" ? "bg-slate-800" : "bg-slate-50"
                  }`}>
                    <p className={`text-sm ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}>
                      AI analysis not available for this document. The document may have been processed before AI analysis was enabled.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`sticky bottom-0 p-6 border-t flex gap-3 ${
              theme === "dark"
                ? "bg-slate-900 border-slate-700"
                : "bg-white border-purple-200"
            }`}>
              <button
                onClick={() => setShowPreview(false)}
                className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition ${
                  theme === "dark"
                    ? "bg-slate-800 hover:bg-slate-700 text-white"
                    : "bg-slate-200 hover:bg-slate-300 text-slate-800"
                }`}
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadAnalysis(selectedItem)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
              >
                <Download size={18} />
                Download AI Analysis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
