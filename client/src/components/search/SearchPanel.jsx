import { useTheme } from "../../context/ThemeContext";

export default function SearchPanel({
  onSearch,
  mode,
  setMode,
  input,
  setInput
}) {
  const { theme } = useTheme();
  
  return (
    <div className="p-5">
      <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${
        theme === "dark" ? "text-white" : "text-slate-800"
      }`}>
        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Search
      </h2>

      <div className="flex gap-2 mb-4">
        <button
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
            mode === "keyword" 
              ? "bg-indigo-600 text-white shadow-lg" 
              : theme === "dark"
              ? "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
              : "bg-purple-100 text-purple-700 hover:bg-purple-200"
          }`}
          onClick={() => setMode("keyword")}
        >
          Keyword
        </button>

        <button
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
            mode === "semantic" 
              ? "bg-indigo-600 text-white shadow-lg" 
              : theme === "dark"
              ? "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
              : "bg-purple-100 text-purple-700 hover:bg-purple-200"
          }`}
          onClick={() => setMode("semantic")}
        >
          Semantic
        </button>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          placeholder={
            mode === "semantic"
              ? "Search by meaning (e.g., meeting guidelines)..."
              : "Search exact keyword..."
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSearch();
            }
          }}
          className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none focus:border-indigo-500 transition ${
            theme === "dark"
              ? "bg-slate-700/50 border-slate-600 text-white placeholder-slate-400"
              : "bg-white border-purple-200 text-slate-800 placeholder-slate-500"
          }`}
        />

        {mode === "semantic" && (
          <>
            <button
              onClick={onSearch}
              className="w-full bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 text-white shadow-md hover:shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Search
            </button>
            <p className={`text-xs ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>
              💡 AI-powered semantic search using embeddings
            </p>
          </>
        )}

        {mode === "keyword" && (
          <p className={`text-xs ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}>
            🔍 Highlights exact keyword matches in the document
          </p>
        )}
      </div>
    </div>
  );
}
