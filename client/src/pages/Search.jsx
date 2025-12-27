import { useState, useEffect } from "react";
import PDFViewer from "../components/PDFViewer";
import SearchPanel from "../components/search/SearchPanel";
import EntityPanel from "../components/search/EntityPanel";
import SummaryPanel from "../components/search/SummaryPanel";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { semanticSearch } from "../services/api";
import { Loader2, Upload as UploadIcon } from "lucide-react";

export default function Search() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const agency = user.agency;

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const [searchMode, setSearchMode] = useState("keyword");
  const [searchTerm, setSearchTerm] = useState("");
  const [semanticScope, setSemanticScope] = useState("document");
  const [semanticResults, setSemanticResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("document");
  const [primaryDocId, setPrimaryDocId] = useState(null);
  const [docFilter, setDocFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [uploadedFileName, setUploadedFileName] = useState(null);

  const [semanticCache, setSemanticCache] = useState({
    document: null,
    agency: null
  });

  const [primaryDoc, setPrimaryDoc] = useState({
    text: "",
    entities: {}
  });

  const [previewDoc, setPreviewDoc] = useState(null);

  // Restore document context from localStorage on mount
  useEffect(() => {
    const savedContext = localStorage.getItem('intelligenceSearchContext');
    if (savedContext) {
      try {
        const { fileName, primaryDoc: savedDoc, primaryDocId: savedId } = JSON.parse(savedContext);
        setUploadedFileName(fileName);
        setPrimaryDoc(savedDoc);
        setPrimaryDocId(savedId);
      } catch (error) {
        console.error('Failed to restore document context:', error);
        localStorage.removeItem('intelligenceSearchContext');
      }
    }
  }, []);

  window.scrollToEntity = (value) => {
    const container = document.getElementById("pdf-scroll-container");
    if (!container) return;

    const el = container.querySelector(
      `[data-entity="${CSS.escape(value)}"]`
    );
    if (!el) return;

    container.scrollTo({
      top: el.offsetTop - 60,
      behavior: "smooth",
    });
  };

  const handleUpload = async () => {
  if (!file) return alert("Select a PDF");

  const formData = new FormData();
  formData.append("file", file);
  formData.append("agency", agency);
  formData.append("uploadedBy", user.username);

  // 🔥 RESET DOCUMENT CONTEXT
  setSummary(null);
  setSummaryLoading(false);
  setPrimaryDocId(null);
  setSemanticResults([]);
  setPreviewDoc(null);
  setActiveTab("document");

  setLoading(true);

  const res = await fetch("http://localhost:3000/api/ingest/pdf", {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  const newPrimaryDoc = {
    text: data.text,
    entities: data.entities || {}
  };

  setPrimaryDoc(newPrimaryDoc);
  setPrimaryDocId(data.documentId);
  setUploadedFileName(file.name);

  // Save to localStorage for persistence
  localStorage.setItem('intelligenceSearchContext', JSON.stringify({
    fileName: file.name,
    primaryDoc: newPrimaryDoc,
    primaryDocId: data.documentId
  }));

  setLoading(false);
};

  const handleClearDocument = () => {
    if (confirm('Are you sure you want to clear the current document? This will remove all saved context.')) {
      // Clear all document-related state
      setFile(null);
      setUploadedFileName(null);
      setPrimaryDoc({ text: "", entities: {} });
      setPrimaryDocId(null);
      setSummary(null);
      setSemanticResults([]);
      setPreviewDoc(null);
      setActiveTab("document");
      
      // Clear localStorage
      localStorage.removeItem('intelligenceSearchContext');
    }
  };


  const handleSearch = async () => {
    if (searchMode === "keyword") {
      setSearchTerm(searchInput);
      setActiveTab("document");
      return;
    }

    if (searchMode === "semantic") {
      if (!searchInput.trim()) return;

      if (semanticScope === "document" && !primaryDocId) {
        alert("Please ingest a document before searching within it.");
        return;
      }

      setSummaryLoading(true);

      const data = await semanticSearch(
        searchInput,
        semanticScope,
        primaryDocId
      );

      if (!data?.results) {
        setSummaryLoading(false);
        return;
      }

      setSemanticCache(prev => ({
        ...prev,
        [semanticScope]: {
          query: searchInput,
          results: data.results,
        }
      }));

      setSemanticResults(data.results);
      setPreviewDoc(null);
      setActiveTab("semantic");
      setSummaryLoading(false);
    }
  };

  const fetchSummary = async () => {
  if (!primaryDocId) return;

  setSummaryLoading(true);

  const res = await fetch("http://localhost:3000/api/search/summary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({
      documentId: primaryDocId // 🔥 THIS FIXES EVERYTHING
    })
  });

  const data = await res.json();
  setSummary(data);
  setSummaryLoading(false);
};

useEffect(() => {
  if (activeTab === "summary" && primaryDocId && !summary) {
    fetchSummary();
  }
}, [activeTab, primaryDocId]);


const downloadReport = async () => {
  if (!summary) return;

  const res = await fetch("http://localhost:3000/api/report/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    },
    body: JSON.stringify({ summary })
  });

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "intelligence-report.pdf";
  document.body.appendChild(a);
  a.click();

  a.remove();
  window.URL.revokeObjectURL(url);
};




  const filteredResults = semanticResults.filter((r) =>
    r.filename.toLowerCase().includes(docFilter)
  );

  useEffect(() => {
    const cached = semanticCache[semanticScope];

    if (cached) {
      setSemanticResults(cached.results);
    } else {
      setSemanticResults([]);
    }

    setPreviewDoc(null);
  }, [semanticScope, semanticCache]);

  useEffect(() => {
    if (searchMode === "keyword") {
      setSearchTerm(searchInput);
    } else {
      setSearchTerm("");
    }
  }, [searchMode, searchInput]);


  return (
    <div className={`min-h-full ${
      theme === "dark" ? "bg-slate-900" : ""
    }`}>
      <div className="max-w-[1800px] mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${
            theme === "dark" ? "text-white" : "text-slate-800"
          }`}>
            Intelligence Search
          </h1>
          <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
            Agency: <span className="text-indigo-400 font-medium">{agency.toUpperCase()}</span>
          </p>
        </div>

        {/* Upload Section */}
        <div className={`backdrop-blur-sm border rounded-xl p-6 mb-8 ${
          theme === "dark"
            ? "bg-slate-800/50 border-slate-700/50"
            : "bg-white/80 border-purple-200 shadow-lg"
        }`}>
          <h2 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${
            theme === "dark" ? "text-white" : "text-slate-800"
          }`}>
            <svg className={`w-5 h-5 ${
              theme === "dark" ? "text-indigo-400" : "text-purple-600"
            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload Intelligence Document
          </h2>

          {uploadedFileName && (
            <div className={`mb-4 p-4 border rounded-lg ${
              theme === "dark"
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-emerald-50 border-emerald-200"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    theme === "dark" ? "bg-emerald-500/20" : "bg-emerald-100"
                  }`}>
                    <svg className={`w-5 h-5 ${
                      theme === "dark" ? "text-emerald-400" : "text-emerald-600"
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      theme === "dark" ? "text-emerald-400" : "text-emerald-700"
                    }`}>Current Document</p>
                    <p className={`text-sm mt-0.5 ${
                      theme === "dark" ? "text-slate-300" : "text-slate-700"
                    }`}>{uploadedFileName}</p>
                  </div>
                </div>
                <button
                  onClick={handleClearDocument}
                  className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Clear Document
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <label className="flex-1 cursor-pointer">
              <div className={`flex items-center gap-3 px-4 py-3 border rounded-lg transition ${
                theme === "dark"
                  ? "bg-slate-700/50 border-slate-600 hover:border-indigo-500/50"
                  : "bg-purple-50 border-purple-200 hover:border-purple-400"
              }`}>
                <svg className={`w-5 h-5 ${
                  theme === "dark" ? "text-slate-400" : "text-purple-600"
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className={`text-sm ${
                  theme === "dark" ? "text-slate-300" : "text-slate-700"
                }`}>
                  {file ? file.name : "Choose PDF file..."}
                </span>
              </div>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
              />
            </label>

            <button
              onClick={handleUpload}
              disabled={loading || !file}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition flex items-center gap-2 text-white shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <UploadIcon size={18} />
                  Ingest PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        {primaryDoc.text && (
          <div className="flex gap-2 mb-6">
            {[
              { id: "document", label: "Document", icon: "📄" },
              { id: "semantic", label: "Semantic Search", icon: "🔍" },
              { id: "summary", label: "Summary", icon: "📊" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-lg font-medium transition flex items-center gap-2 ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-lg"
                    : theme === "dark"
                    ? "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 border border-slate-700/50"
                    : "bg-white text-slate-700 hover:bg-purple-50 border border-purple-200 shadow-md"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Main Content */}
        {primaryDoc.text && (
          <div className="grid grid-cols-[1fr_380px] gap-6">
            {/* Main Content Area */}
            <div className={`backdrop-blur-sm border rounded-xl overflow-hidden ${
              theme === "dark"
                ? "bg-slate-800/50 border-slate-700/50"
                : "bg-white/80 border-purple-200 shadow-lg"
            }`}>

              {/* DOCUMENT TAB */}
              {activeTab === "document" && (
                <div className="p-6">
                  <PDFViewer
                    text={primaryDoc.text}
                    entities={primaryDoc.entities}
                    searchTerm={searchMode === "keyword" ? searchTerm : ""}
                  />
                </div>
              )}

              {/* SEMANTIC TAB */}
              {activeTab === "semantic" && (
                <div className="p-6">

                  <h2 className={`text-xl font-semibold mb-6 ${
                    theme === "dark" ? "text-white" : "text-slate-800"
                  }`}>
                    Semantic Search Results
                  </h2>

                  {/* Scope + Filters */}
                  <div className="space-y-4 mb-6">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSemanticScope("document")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          semanticScope === "document"
                            ? "bg-indigo-600 text-white shadow-md"
                            : theme === "dark"
                            ? "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                            : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                        }`}
                      >
                        Current Document
                      </button>

                      <button
                        onClick={() => setSemanticScope("agency")}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          semanticScope === "agency"
                            ? "bg-indigo-600 text-white shadow-md"
                            : theme === "dark"
                            ? "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                            : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                        }`}
                      >
                        Agency Intelligence
                      </button>
                    </div>

                    {semanticScope === "document" && primaryDocId && (
                      <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                        <p className="text-xs text-slate-400">
                          Searching within: <span className="text-indigo-400 font-medium">{uploadedFileName || file?.name}</span>
                        </p>
                      </div>
                    )}

                    <input
                      type="text"
                      placeholder="Filter by document name..."
                      value={docFilter}
                      onChange={(e) => setDocFilter(e.target.value.toLowerCase())}
                      className={`w-full border px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-indigo-500 transition ${
                        theme === "dark"
                          ? "bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
                          : "bg-white border-purple-200 text-slate-800 placeholder-slate-500"
                      }`}
                    />
                  </div>

                  {/* Results */}
                  <div className="space-y-3">
                    {filteredResults.map((r, idx) => (
                      <div
                        key={idx}
                        className={`p-4 border rounded-lg cursor-pointer transition ${
                          theme === "dark"
                            ? "bg-slate-700/30 border-slate-600/50 hover:border-indigo-500/50 hover:bg-slate-700/50"
                            : "bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 hover:border-indigo-400 shadow-sm hover:shadow-md"
                        }`}
                        onClick={() =>
                          setPreviewDoc({
                            text: r.text,
                            entities: r.entities || {}
                          })
                        }
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-center gap-2 text-indigo-400 font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {r.filename}
                          </div>
                          <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 rounded text-xs font-medium">
                            {r.score.toFixed(2)}
                          </span>
                        </div>
                        <p className={`text-sm line-clamp-3 ${
                          theme === "dark" ? "text-slate-300" : "text-slate-700"
                        }`}>
                          {r.snippet?.slice(0, 220)}…
                        </p>
                      </div>
                    ))}

                    {filteredResults.length === 0 && (
                      <div className="text-center py-8">
                        <p className={`text-sm ${
                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                        }`}>
                          No documents match the current filter.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  {previewDoc && (
                    <div className="mt-6 space-y-4">
                      <div className="flex justify-between items-center p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                        <p className="text-sm text-emerald-400 font-medium">Document Preview</p>
                        <button
                          className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-sm font-medium transition"
                          onClick={() => {
                            setPrimaryDoc(previewDoc);
                            setPreviewDoc(null);
                            setActiveTab("document");
                          }}
                        >
                          Set as Primary Document
                        </button>
                      </div>

                      <PDFViewer
                        text={previewDoc.text}
                        entities={previewDoc.entities}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* SUMMARY TAB */}
              {activeTab === "summary" && (
                <div className="p-6">
                  <SummaryPanel summary={summary} loading={summaryLoading} onDownload={downloadReport} />
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="flex flex-col gap-6">
              {/* SEARCH */}
              <div className={`backdrop-blur-sm border rounded-xl ${
                theme === "dark"
                  ? "bg-slate-800/50 border-slate-700/50"
                  : "bg-white/80 border-purple-200 shadow-lg"
              }`}>
                <SearchPanel
                  mode={searchMode}
                  setMode={setSearchMode}
                  input={searchInput}
                  setInput={setSearchInput}
                  onSearch={handleSearch}
                />
              </div>

              {/* ENTITIES */}
              <div className={`backdrop-blur-sm border rounded-xl p-5 max-h-[600px] overflow-y-auto ${
                theme === "dark"
                  ? "bg-slate-800/50 border-slate-700/50"
                  : "bg-white/80 border-purple-200 shadow-lg"
              }`}>
                <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
                  theme === "dark" ? "text-white" : "text-slate-800"
                }`}>
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Extracted Entities
                </h3>

                <EntityPanel
                  entities={
                    activeTab === "semantic" && previewDoc
                      ? previewDoc.entities
                      : primaryDoc.entities
                  }
                  onSelect={(v) => window.scrollToEntity(v)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
