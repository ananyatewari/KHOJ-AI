import { useTheme } from "../../context/ThemeContext";

export default function SummaryPanel({ summary, loading, onDownload }) {
  const { theme } = useTheme();
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <svg className="animate-spin h-12 w-12 text-indigo-500 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className={`text-lg font-medium ${
          theme === "dark" ? "text-slate-400" : "text-slate-600"
        }`}>Generating intelligence summary...</p>
        <p className={`text-sm mt-2 ${
          theme === "dark" ? "text-slate-500" : "text-slate-500"
        }`}>This may take a few moments</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="text-center py-12">
        <svg className={`w-16 h-16 mx-auto mb-4 ${
          theme === "dark" ? "text-slate-600" : "text-purple-300"
        }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className={`text-lg ${
          theme === "dark" ? "text-slate-400" : "text-slate-600"
        }`}>No summary available</p>
        <p className={`text-sm mt-2 ${
          theme === "dark" ? "text-slate-500" : "text-slate-500"
        }`}>Upload and process a document to generate a summary</p>
      </div>
    );
  }

  const {
    executiveSummary,
    keyFindings = [],
    entityInsights = {},
    analystTakeaways = [],
  } = summary;

  return (
    <div className="space-y-6">
      {/* EXECUTIVE SUMMARY */}
      <section className={`border rounded-xl p-6 ${
        theme === "dark"
          ? "bg-slate-700/30 border-slate-600/50"
          : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-md"
      }`}>
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-blue-400">
            Executive Summary
          </h3>
        </div>
        <p className={`leading-relaxed ${
          theme === "dark" ? "text-slate-200" : "text-slate-700"
        }`}>{executiveSummary}</p>
      </section>

      {/* KEY FINDINGS */}
      {keyFindings.length > 0 && (
        <section className={`border rounded-xl p-6 ${
          theme === "dark"
            ? "bg-slate-700/30 border-slate-600/50"
            : "bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 shadow-md"
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="text-lg font-semibold text-emerald-400">
              Key Findings
            </h3>
          </div>
          <ul className="space-y-3">
            {keyFindings.map((k, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-emerald-400 font-bold mt-0.5">•</span>
                <span className={`flex-1 ${
                  theme === "dark" ? "text-slate-200" : "text-slate-700"
                }`}>{k}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ENTITY INSIGHTS */}
      {(entityInsights.persons?.length > 0 || entityInsights.places?.length > 0 || entityInsights.organizations?.length > 0) && (
        <section className={`border rounded-xl p-6 ${
          theme === "dark"
            ? "bg-slate-700/30 border-slate-600/50"
            : "bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 shadow-md"
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <h3 className="text-lg font-semibold text-amber-400">
              Entity Insights
            </h3>
          </div>

          <div className="space-y-3">
            {entityInsights.persons?.length > 0 && (
              <div className="flex gap-3">
                <span className={`font-semibold min-w-[120px] ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>👤 Persons:</span>
                <div className="flex flex-wrap gap-2">
                  {entityInsights.persons.map((person, i) => (
                    <span key={i} className={`px-2 py-1 rounded text-sm ${
                      theme === "dark"
                        ? "bg-slate-600/50 text-slate-200"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {person}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {entityInsights.places?.length > 0 && (
              <div className="flex gap-3">
                <span className={`font-semibold min-w-[120px] ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>📍 Places:</span>
                <div className="flex flex-wrap gap-2">
                  {entityInsights.places.map((place, i) => (
                    <span key={i} className={`px-2 py-1 rounded text-sm ${
                      theme === "dark"
                        ? "bg-slate-600/50 text-slate-200"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {place}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {entityInsights.organizations?.length > 0 && (
              <div className="flex gap-3">
                <span className={`font-semibold min-w-[120px] ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>🏢 Organizations:</span>
                <div className="flex flex-wrap gap-2">
                  {entityInsights.organizations.map((org, i) => (
                    <span key={i} className={`px-2 py-1 rounded text-sm ${
                      theme === "dark"
                        ? "bg-slate-600/50 text-slate-200"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {org}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ANALYST TAKEAWAYS */}
      {analystTakeaways.length > 0 && (
        <section className={`border rounded-xl p-6 ${
          theme === "dark"
            ? "bg-slate-700/30 border-slate-600/50"
            : "bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 shadow-md"
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="text-lg font-semibold text-purple-400">
              Analyst Takeaways
            </h3>
          </div>
          <ul className="space-y-3">
            {analystTakeaways.map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="text-purple-400 font-bold mt-0.5">•</span>
                <span className={`flex-1 ${
                  theme === "dark" ? "text-slate-200" : "text-slate-700"
                }`}>{t}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* EXPORT */}
      {onDownload && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onDownload}
            disabled={!summary}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition flex items-center gap-2 shadow-lg hover:shadow-xl text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Intelligence Report
          </button>
        </div>
      )}
    </div>
  );
}
