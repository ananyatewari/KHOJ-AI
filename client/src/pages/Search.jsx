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
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("document");
  const [primaryDocId, setPrimaryDocId] = useState(null);
  const [docFilter, setDocFilter] = useState("");
  const [primaryDoc, setPrimaryDoc] = useState({
    text: "",
    entities: {}
  });

  const [previewDoc, setPreviewDoc] = useState(null);

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

    setLoading(true);

    const res = await fetch("http://localhost:3000/api/ingest/pdf", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    setPrimaryDoc({
      text: data.text,
      entities: data.entities || {}
    });

    setPreviewDoc(null);
    setSemanticResults([]);
    setSummary("");
    setActiveTab("document");
    setPrimaryDocId(data.documentId);
    setLoading(false);
  };

  /* ---------- SEARCH ---------- */
  const handleSearch = async (value) => {
    if (searchMode === "keyword") {
      setSearchTerm(value);
      return;
    }

    if (!value.trim()) return;

    setSummaryLoading(true);

    if (semanticScope === "document" && !primaryDocId) {
      alert("Please ingest a document before searching within it.");
      return;
    }

    const data = await semanticSearch(
      value,
      semanticScope,
      primaryDocId
    );


    if (!data.results || !data.results.length) {
      setSummaryLoading(false);
      return;
    }

    setSemanticResults(data.results);
    setSummary(data.summary || "");
    setPreviewDoc(null);
    setActiveTab("semantic");

    setSummaryLoading(false);
  };

  const filteredResults = semanticResults.filter((r) =>
  r.filename.toLowerCase().includes(docFilter)
);

useEffect(() => {
  setSemanticResults([]);
  setPreviewDoc(null);
}, [semanticScope]);


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

      {/* ---------- INGEST ---------- */}
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files[0])}
        className="mb-4"
      />

      <button
        onClick={handleUpload}
        className="bg-blue-600 px-4 py-2 rounded"
      >
        Ingest PDF
      </button>

      {loading && <p className="mt-2">Processing…</p>}

      {/* ---------- MAIN CONTENT ---------- */}
      {primaryDoc.text && (
        <div className="flex mt-10 h-[80vh] gap-4">
          {/* ---------- ENTITIES ---------- */}
          <div className="w-72 shrink-0 overflow-y-auto bg-gray-900 rounded p-3">
            <EntityPanel
              entities={
                activeTab === "semantic" && previewDoc
                  ? previewDoc.entities
                  : primaryDoc.entities
              }
              onSelect={(v) => window.scrollToEntity(v)}
            />
          </div>


          {/* ---------- DOCUMENT TAB ---------- */}
          
          {activeTab === "document" && (
            <PDFViewer
              text={primaryDoc.text}
              entities={primaryDoc.entities}
              searchTerm={searchMode === "keyword" ? searchTerm : ""}
            />
          )}

          {/* ---------- SEMANTIC TAB ---------- */}
            {activeTab === "semantic" && (
              <div className="bg-gray-900 p-4 rounded overflow-y-auto">

                {/* Title */}
                <h2 className="text-lg font-semibold mb-4 text-green-400">
                  Semantic-Similarity Search Results
                </h2>

                {/* Controls Column */}
                <div className="max-w-xl space-y-2 mb-4">

                  {/* Scope Toggle */}
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
                Searching within: <span className="text-blue-400">{file?.name}</span>
              </p>
            )}


                  {/* Document Name Filter */}
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

                  {/* Empty State */}
                  {filteredResults.length === 0 && (
                    <p className="text-sm text-gray-400">
                      No documents match the current filter.
                    </p>
                  )}
                </div>

                {/* Preview */}
                {previewDoc && (
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-end">
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



          {/* ---------- SUMMARY TAB ---------- */}
          {activeTab === "summary" && (
            <SummaryPanel
              summary={summary}
              loading={summaryLoading}
            />
          )}

          {/* ---------- SEARCH CONTROLS ---------- */}
          <SearchPanel
            mode={searchMode}
            setMode={setSearchMode}
            onSearch={handleSearch}
          />
        </div>
      )}
    </div>
  );
}
