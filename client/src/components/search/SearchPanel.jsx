export default function SearchPanel({ onSearch, mode, setMode }) {
  return (
    <div className="bg-gray-900 p-4 rounded h-fit">
      <h2 className="text-lg font-semibold mb-2">Search</h2>

      <div className="flex gap-2 mb-3">
        <button
          className={`px-3 py-1 rounded ${
            mode === "keyword" ? "bg-blue-600" : "bg-gray-700"
          }`}
          onClick={() => setMode("keyword")}
        >
          Keyword
        </button>

        <button
          className={`px-3 py-1 rounded ${
            mode === "semantic" ? "bg-green-600" : "bg-gray-700"
          }`}
          onClick={() => setMode("semantic")}
        >
          Semantic
        </button>
      </div>

      <input
        type="text"
        placeholder={
          mode === "semantic"
            ? "Search by meaning (e.g. meeting guidelines)"
            : "Search exact keyword"
        }
        onChange={(e) => onSearch(e.target.value)}
        className="w-full p-2 rounded bg-gray-800 text-white"
      />

      {mode === "semantic" && (
        <p className="text-xs text-gray-400 mt-2">
          Semantic search uses AI embeddings (server-side)
        </p>
      )}
    </div>
  );
}
