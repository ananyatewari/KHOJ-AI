export default function SummaryPanel({ summary, loading }) {
  return (
    <div className="bg-gray-900 p-4 rounded h-[80vh] overflow-y-auto">
      <h2 className="text-lg font-semibold mb-2">
        AI-Processed Intelligence Summary
      </h2>

      {loading && <p>Generating summary…</p>}

      {!loading && !summary && (
        <p className="text-sm text-gray-400">
          Generate a summary to view processed intelligence.
        </p>
      )}

      {summary && (
        <div className="whitespace-pre-wrap leading-relaxed text-gray-200">
          {summary}
        </div>
      )}
    </div>
  );
}
