import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Loader2 } from "lucide-react";

export default function SharePanel({ docs = [], onUpdate }) {
  const { token } = useAuth();
  const { theme } = useTheme();
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
    <section className={`border rounded-2xl p-4 ${
      theme === "dark"
        ? "bg-slate-950/50 border-white/10"
        : "bg-white/80 border-purple-200 shadow-lg"
    }`}>
      <h3 className={`font-semibold mb-3 ${
        theme === "dark" ? "text-white" : "text-slate-800"
      }`}>Cross-Agency Sharing</h3>
      <p className={`text-xs mb-3 ${
        theme === "dark" ? "text-slate-400" : "text-slate-600"
      }`}>
        Share documents into the cross-agency collaboration pool so the chatbot
        can answer with their context. Documents are immediately available after sharing.
      </p>
      {localDocs.length === 0 && (
        <p className={`text-sm ${
          theme === "dark" ? "text-slate-400" : "text-slate-600"
        }`}>No documents available.</p>
      )}
      <ul className="space-y-2 max-h-64 overflow-auto">
        {localDocs.map((d) => (
          <li
            key={d._id}
            className={`flex items-center justify-between p-2 rounded ${
              theme === "dark"
                ? "bg-slate-900/40"
                : "bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100"
            }`}
          >
            <div>
              <div className={`font-medium text-sm ${
                theme === "dark" ? "text-white" : "text-slate-800"
              }`}>{d.filename}</div>
              <div className={`text-xs ${
                theme === "dark" ? "text-slate-500" : "text-slate-600"
              }`}>
                {new Date(d.createdAt).toLocaleDateString()}
              </div>
              {d.shareStatus && (
                <div className={`text-[11px] uppercase tracking-wide ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>
                  Status: {d.shareStatus}
                </div>
              )}
            </div>
            <div className="text-right">
              <button
                onClick={() => shareCrossAgency(d._id)}
                disabled={sharing[d._id] || d.sharedWithChatbot}
                className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                  d.sharedWithChatbot
                    ? "bg-emerald-600 text-white cursor-not-allowed opacity-75"
                    : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                }`}
              >
                {sharing[d._id] ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Sharing...
                  </>
                ) : d.sharedWithChatbot ? (
                  "✓ Shared"
                ) : (
                  "Share Cross-Agency"
                )}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
