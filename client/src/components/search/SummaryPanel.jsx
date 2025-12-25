export default function SummaryPanel({ summary, loading, onDownload }) {
  if (loading) {
    return <p className="text-gray-400">Generating intelligence summary…</p>;
  }

  if (!summary) {
    return <p className="text-gray-400">No summary available.</p>;
  }

  const {
    executiveSummary,
    keyFindings = [],
    entityInsights = {},
    analystTakeaways = []
  } = summary;

  return (
    <div className="bg-slate-900 rounded-xl p-6 space-y-6">

      {/* EXECUTIVE SUMMARY */}
      <section>
        <h3 className="text-lg font-semibold mb-2 text-blue-400">
          Executive Summary
        </h3>
        <p className="text-gray-200 leading-relaxed">
          {executiveSummary}
        </p>
      </section>

      {/* KEY FINDINGS */}
      <section>
        <h3 className="text-lg font-semibold mb-2 text-green-400">
          Key Findings
        </h3>
        <ul className="list-disc ml-6 space-y-1 text-gray-200">
          {keyFindings.map((k, i) => (
            <li key={i}>{k}</li>
          ))}
        </ul>
      </section>

      {/* ENTITY INSIGHTS */}
      <section>
        <h3 className="text-lg font-semibold mb-2 text-yellow-400">
          Entity Insights
        </h3>

        <div className="space-y-1 text-sm text-gray-300">
          {entityInsights.persons?.length > 0 && (
            <div>
              <b>Persons:</b> {entityInsights.persons.join(", ")}
            </div>
          )}

          {entityInsights.places?.length > 0 && (
            <div>
              <b>Places:</b> {entityInsights.places.join(", ")}
            </div>
          )}

          {entityInsights.organizations?.length > 0 && (
            <div>
              <b>Organizations:</b> {entityInsights.organizations.join(", ")}
            </div>
          )}
        </div>
      </section>

      {/* ANALYST TAKEAWAYS */}
      <section>
        <h3 className="text-lg font-semibold mb-2 text-purple-400">
          Analyst Takeaways
        </h3>
        <ul className="list-disc ml-6 space-y-1 text-gray-200">
          {analystTakeaways.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </section>

      {/* EXPORT */}
      <button
      onClick={onDownload}
  disabled={!summary}
        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-medium"
      >
        Download Intelligence Report
      </button>
    </div>
  );
}
