import { useState } from "react";
import PDFViewer from "../components/PDFViewer";
import SearchPanel from "../components/search/SearchPanel";
import EntityPanel from "../components/search/EntityPanel";
import { useAuth } from "../context/AuthContext";

export default function Search() {
  const { user } = useAuth();

  const [file, setFile] = useState(null);
  const [docText, setDocText] = useState("");
  const [docEntities, setDocEntities] = useState({});
  const [loading, setLoading] = useState(false);
  const [agency] = useState(user.agency);

  const [searchMode, setSearchMode] = useState("keyword");
  const [searchTerm, setSearchTerm] = useState("");
  const [semanticResults, setSemanticResults] = useState([]);

  const [activeTab, setActiveTab] = useState("document");

  /* ---------- ENTITY SCROLL SETUP ---------- */
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

  /* ---------- INGEST ---------- */
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
    setDocText(data.text);
    setDocEntities(data.entities || {});
    setLoading(false);
  };

  /* ---------- SEARCH ---------- */
  const handleSearch = async (value) => {
    if (searchMode === "keyword") {
      setSearchTerm(value);
      return;
    }

    if (!value.trim()) return;

    const res = await fetch("http://localhost:3000/api/search/semantic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: value, agency }),
    });

    const results = await res.json();
    if (!results.length) return;

    setSemanticResults(results);
    setDocText(results[0].text);
    setDocEntities(results[0].entities || {});
    setActiveTab("semantic"); // 🔥 auto-switch
  };

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

      {docText && (
        <div className="grid grid-cols-3 gap-6 mt-10">
          {/* ---------- ENTITIES ---------- */}
          <EntityPanel
            entities={docEntities}
            onSelect={(v) => window.scrollToEntity(v)}
          />

          {/* ---------- MAIN VIEW ---------- */}
          {activeTab === "document" && (
            <PDFViewer
              text={docText}
              searchTerm={searchMode === "keyword" ? searchTerm : ""}
              entities={docEntities}
            />
          )}

          {activeTab === "semantic" && (
            <div className="bg-gray-900 p-4 rounded h-[80vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-3 text-green-400">
                Semantic Search Results
              </h2>

              <div className="space-y-4">
                {semanticResults.map((r, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-800 rounded cursor-pointer hover:bg-gray-700"
                    onClick={() => {
                      setDocText(r.text);
                      setDocEntities(r.entities || {});
                    }}
                  >
                    <div className="text-blue-400 font-medium">
                      📄 {r.filename}
                    </div>

                    <div className="text-xs text-gray-400 mt-1">
                      Relevance score: {r.score.toFixed(2)}
                    </div>

                    <div className="text-sm text-gray-200 mt-2">
                      {r.snippet?.slice(0, 220)}…
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "summary" && (
            <div className="bg-gray-900 p-4 rounded h-[80vh]">
              <h2 className="text-lg font-semibold mb-2">
                AI Summary (Coming Next)
              </h2>
              <p className="text-sm text-gray-400">
                Agency-specific intelligence summaries will appear here.
              </p>
            </div>
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
