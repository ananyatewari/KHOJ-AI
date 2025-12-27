import { useTheme } from "../../context/ThemeContext";

export default function EntityPanel({ entities, onSelect }) {
  const { theme } = useTheme();
  const entityIcons = {
    PERSON: "👤",
    LOCATION: "📍",
    ORGANIZATION: "🏢",
    DATE: "📅",
    TIME: "⏰",
    MONEY: "💰",
    PERCENT: "📊",
    PHONE: "📞",
    EMAIL: "📧",
    URL: "🔗"
  };

  const hasEntities = Object.values(entities).some(values => values?.length > 0);

  if (!hasEntities) {
    return (
      <div className="text-center py-8">
        <svg className={`w-12 h-12 mx-auto mb-3 ${
          theme === "dark" ? "text-slate-600" : "text-purple-300"
        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className={`text-sm ${
          theme === "dark" ? "text-slate-400" : "text-slate-600"
        }`}>No entities extracted yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(entities).map(([type, values]) =>
        values?.length ? (
          <div key={type}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{entityIcons[type] || "🏷️"}</span>
              <h4 className={`text-xs font-semibold uppercase tracking-wider ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}>
                {type}
              </h4>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                theme === "dark"
                  ? "text-slate-500 bg-slate-700/50"
                  : "text-purple-700 bg-purple-100"
              }`}>
                {values.length}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {values.map((v, i) => (
                <button
                  key={i}
                  onClick={() => onSelect(v)}
                  className={`px-3 py-1.5 border rounded-lg text-xs transition-all duration-200 ${
                    theme === "dark"
                      ? "bg-slate-700/50 hover:bg-indigo-600/30 border-slate-600 hover:border-indigo-500/50 text-slate-200 hover:text-white"
                      : "bg-purple-50 hover:bg-indigo-100 border-purple-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-700"
                  }`}
                  title="Click to highlight in document"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
