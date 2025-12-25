export default function SearchPanel({
  onSearch,
  mode,
  setMode,
  input,
  setInput
}) {
  return (
    <div className="bg-gray-900 p-4 rounded">
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
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSearch();
          }
        }}
        className="w-full p-2 rounded bg-gray-800 text-white mb-2"
      />

      {mode === "semantic" && (
        <button
          onClick={onSearch}
          className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
        >
          Search
        </button>
      )}

      {mode === "semantic" && (
        <p className="text-xs text-gray-400 mt-2">
          Semantic search uses AI embeddings (server-side)
        </p>
      )}
    </div>
  );
}
