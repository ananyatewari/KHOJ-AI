import { useState, useEffect } from "react";
import PDFViewer from "../components/PDFViewer";
import SearchPanel from "../components/search/SearchPanel";
import EntityPanel from "../components/search/EntityPanel";
import SummaryPanel from "../components/search/SummaryPanel";
import { useAuth } from "../context/AuthContext";
import { semanticSearch } from "../services/api";

export default function Search() {
  const { user } = useAuth();
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
  const [semanticInput, setSemanticInput] = useState("");
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
    if (searchMode !== "semantic") return;
    if (!semanticInput.trim()) return;

    if (semanticScope === "document" && !primaryDocId) {
      alert("Please ingest a document before searching within it.");
      return;
    }

    setSummaryLoading(true);

    const data = await semanticSearch(
      semanticInput,
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
        query: semanticInput,
        results: data.results,
      }
    }));

    setSemanticResults(data.results);
    setPreviewDoc(null);
    setActiveTab("semantic");
    setSummaryLoading(false);
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
  a.download = "intelligence-report.txt";
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


  return (
    <div className="min-h-screen bg-slate-900 text-white p-10">
      <h1 className="text-3xl font-bold mb-6">
        Intelligence Search — {agency.toUpperCase()}
      </h1>

      {/* ---------- TABS ---------- */}
      <div className="flex gap-2 mb-6">
        {["document", "semantic", "summary"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1 rounded ${
              activeTab === tab
                ? "bg-blue-600"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ---------- INGEST CARD ---------- */}
<div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-8 max-w-3xl">
  <h2 className="text-lg font-semibold mb-3">
    Upload Intelligence Document
  </h2>

  {uploadedFileName && (
    <div className="mb-4 p-3 bg-green-900/30 border border-green-500/50 rounded">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-green-400 font-medium">Current Document:</p>
          <p className="text-xs text-gray-300 mt-1">{uploadedFileName}</p>
        </div>
        <button
          onClick={handleClearDocument}
          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-medium"
        >
          Clear Document
        </button>
      </div>
    </div>
  )}

  <div className="flex items-center gap-4">
    <input
      type="file"
      accept="application/pdf"
      onChange={(e) => setFile(e.target.files[0])}
      className="text-sm text-gray-300"
    />

    <button
      onClick={handleUpload}
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 ml-70 px-5 py-2 rounded font-medium"
    >
      {loading ? "Processing…" : "Ingest PDF"}
    </button>
  </div>

  {file && (
    <p className="text-xs text-gray-400 mt-2">
      Selected: <span className="text-blue-400">{file.name}</span>
    </p>
  )}
</div>

      {loading && <p className="mt-2">Processing…</p>}

      {/* ---------- MAIN CONTENT ---------- */}
      {primaryDoc.text && (
  <div className="grid grid-cols-[1fr_320px] gap-4 mt-10">


    {/* ================= MAIN CONTENT ================= */}
    <div className="row-span-2 bg-gray-900 rounded overflow-y-auto">

      {/* DOCUMENT TAB */}
      {activeTab === "document" && (
        <PDFViewer
          text={primaryDoc.text}
          entities={primaryDoc.entities}
          searchTerm={searchMode === "keyword" ? searchTerm : ""}
        />
      )}

      {/* SEMANTIC TAB */}
      {activeTab === "semantic" && (
        <div>

          <h2 className="text-lg font-semibold mb-4 text-green-400">
            Semantic-Similarity Search Results
          </h2>

          {/* Scope + Filters */}
          <div className="space-y-2 mb-4 max-w-xl">
            <div className="flex gap-2">
              <button
                onClick={() => setSemanticScope("document")}
                className={`px-3 py-1 rounded text-sm ${
                  semanticScope === "document"
                    ? "bg-blue-600"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                Current Document
              </button>

              <button
                onClick={() => setSemanticScope("agency")}
                className={`px-3 py-1 rounded text-sm ${
                  semanticScope === "agency"
                    ? "bg-blue-600"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                Agency Intelligence
              </button>
            </div>

            {semanticScope === "document" && primaryDocId && (
              <p className="text-xs text-gray-400">
                Searching within:{" "}
                <span className="text-blue-400">{uploadedFileName || file?.name}</span>
              </p>
            )}

            <input
              type="text"
              placeholder="Filter by document name"
              value={docFilter}
              onChange={(e) => setDocFilter(e.target.value.toLowerCase())}
              className="w-full bg-gray-800 px-3 py-2 rounded text-sm"
            />
          </div>

          {/* Results */}
          <div className="space-y-4">
            {filteredResults.map((r, idx) => (
              <div
                key={idx}
                className="p-4 bg-gray-800 rounded cursor-pointer hover:bg-gray-700"
                onClick={() =>
                  setPreviewDoc({
                    text: r.text,
                    entities: r.entities || {}
                  })
                }
              >
                <div className="text-blue-400 font-medium">
                  📄 Source: {r.filename}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Relevance score: {r.score.toFixed(2)}
                </div>
                <div className="text-sm mt-2 text-gray-200">
                  {r.snippet?.slice(0, 220)}…
                </div>
              </div>
            ))}

            {filteredResults.length === 0 && (
              <p className="text-sm text-gray-400">
                No documents match the current filter.
              </p>
            )}
          </div>

          {/* Preview */}
          {previewDoc && (
            <div className="mt-6 space-y-3">
              <div className="flex ">
                <button
                  className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
                  onClick={() => {
                    setPrimaryDoc(previewDoc);
                    setPreviewDoc(null);
                    setActiveTab("document");
                  }}
                >
                  Promote to Primary Document
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
        <SummaryPanel summary={summary} loading={summaryLoading} onDownload={downloadReport} />
      )}
    </div>

    {/* ================= RIGHT PANEL ================= */}
<div className="flex flex-col gap-3 h-full">

  {/* SEARCH */}
  <div className="bg-gray-900 rounded p-4 h-[35vh] overflow-y-hidden">
    <SearchPanel
      mode={searchMode}
      setMode={setSearchMode}
      input={semanticInput}
      setInput={setSemanticInput}
      onSearch={handleSearch}
    />
  </div>

  {/* ENTITIES */}
  <div className="bg-yellow-500/10 border border-yellow-500/30 h-[45vh] rounded p-3 overflow-y-scroll">
    <h3 className="text-sm font-semibold text-yellow-400 mb-2">
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
  );
}
