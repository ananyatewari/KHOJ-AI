import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

export default function SharePanel({ docs = [], onUpdate }) {
  const { token } = useAuth();
  const [sharing, setSharing] = useState({});
  const [localDocs, setLocalDocs] = useState(docs);

  useEffect(() => {
    setLocalDocs(docs);
  }, [docs]);

  const shareCrossAgency = async (docId) => {
    setSharing((s) => ({ ...s, [docId]: true }));
    try {
      const res = await fetch("/api/chatbot/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ docId, scope: "cross-agency" }),
      });
      const data = await res.json();
      setLocalDocs((docs) =>
        docs.map((d) =>
          d._id === docId
            ? {
                ...d,
                sharedWithChatbot: true,
                shareStatus: data.status,
              }
            : d
        )
      );
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
    } finally {
      setSharing((s) => ({ ...s, [docId]: false }));
    }
  };

  return (
    <section className="bg-slate-950/50 border border-white/10 rounded-2xl p-4">
      <h3 className="font-semibold mb-3">Cross-Agency Sharing</h3>
      <p className="text-xs text-slate-400 mb-3">
        Share documents into the cross-agency collaboration pool so the chatbot
        can answer with their context. Documents are immediately available after sharing.
      </p>
      {localDocs.length === 0 && (
        <p className="text-sm text-slate-400">No documents available.</p>
      )}
      <ul className="space-y-2 max-h-64 overflow-auto">
        {localDocs.map((d) => (
          <li
            key={d._id}
            className="flex items-center justify-between bg-slate-900/40 p-2 rounded"
          >
            <div>
              <div className="font-medium text-sm">{d.filename}</div>
              <div className="text-xs text-slate-500">
                {new Date(d.createdAt).toLocaleDateString()}
              </div>
              {d.shareStatus && (
                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                  Status: {d.shareStatus}
                </div>
              )}
            </div>
            <div className="text-right">
              <button
                onClick={() => shareCrossAgency(d._id)}
                disabled={sharing[d._id] || d.sharedWithChatbot}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  d.sharedWithChatbot
                    ? "bg-emerald-600 text-white cursor-not-allowed opacity-75"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {d.sharedWithChatbot ? "✓ Shared" : "Share Cross-Agency"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
