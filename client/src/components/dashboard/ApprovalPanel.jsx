import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Loader2 } from "lucide-react";

export default function ApprovalPanel() {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState({});

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    if (user?.role !== "admin") return;
    setLoading(true);
    try {
      const res = await fetch("/api/chatbot/pending-approval", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPending(data.pending || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (shareId) => {
    setApproving((s) => ({ ...s, [shareId]: true }));
    try {
      await fetch("/api/chatbot/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shareId, approve: true }),
      });
      setPending((items) => items.filter((d) => d._id !== shareId));
    } catch (err) {
      console.error(err);
    } finally {
      setApproving((s) => ({ ...s, [shareId]: false }));
    }
  };

  const reject = async (shareId) => {
    setApproving((s) => ({ ...s, [shareId]: true }));
    try {
      await fetch("/api/chatbot/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ shareId, approve: false }),
      });
      setPending((items) => items.filter((d) => d._id !== shareId));
    } catch (err) {
      console.error(err);
    } finally {
      setApproving((s) => ({ ...s, [shareId]: false }));
    }
  };

  if (user?.role !== "admin") return null;

  return (
    <section
      className={`border rounded-2xl p-4 mt-6 ${
        theme === "dark"
          ? "bg-slate-950/50 border-yellow-500/20"
          : "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 shadow-lg"
      }`}
    >
      <h3
        className={`font-semibold mb-2 ${
          theme === "dark" ? "text-yellow-400" : "text-amber-700"
        }`}
      >
        ⚡ Admin: Cross-Agency Approval Queue
      </h3>
      <p
        className={`text-xs mb-3 ${
          theme === "dark" ? "text-slate-400" : "text-amber-700/70"
        }`}
      >
        Review and approve documents for cross-agency chatbot visibility.
      </p>

      {loading && (
        <div
          className={`flex items-center gap-2 text-sm py-4 ${
            theme === "dark" ? "text-slate-400" : "text-amber-700"
          }`}
        >
          <Loader2 size={16} className="animate-spin" />
          Loading pending approvals...
        </div>
      )}

      {pending.length === 0 && !loading && (
        <p
          className={`text-sm ${
            theme === "dark" ? "text-slate-500" : "text-amber-600"
          }`}
        >
          No pending approvals.
        </p>
      )}

      <ul className="space-y-2 max-h-72 overflow-auto">
        {pending.map((share) => (
          <li
            key={share._id}
            className={`border p-3 rounded flex items-start justify-between ${
              theme === "dark"
                ? "bg-slate-900/60 border-yellow-500/10"
                : "bg-white/80 border-amber-200"
            }`}
          >
            <div className="flex-1">
              <div
                className={`font-medium text-sm ${
                  theme === "dark" ? "text-white" : "text-slate-800"
                }`}
              >
                {share.documentId?.filename}
              </div>
              <div
                className={`text-xs ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {share.uploadedByAgency.toUpperCase()} · Shared by{" "}
                {share.uploadedBy}
              </div>
              <div
                className={`text-xs mt-1 max-w-xs truncate ${
                  theme === "dark" ? "text-slate-500" : "text-slate-600"
                }`}
              >
                {share.documentId?.text?.slice(0, 100)}...
              </div>
              <div
                className={`text-xs mt-1 ${
                  theme === "dark"
                    ? "text-yellow-500"
                    : "text-amber-600 font-medium"
                }`}
              >
                Pending {share.scope} approval
              </div>
            </div>
            <div className="flex gap-1 ml-2">
              <button
                onClick={() => approve(share._id)}
                disabled={approving[share._id]}
                className="px-2 py-1 bg-emerald-600 text-white text-xs rounded flex items-center justify-center disabled:opacity-50"
              >
                {approving[share._id] ? <Loader2 size={12} className="animate-spin" /> : "✓"}
              </button>
              <button
                onClick={() => reject(share._id)}
                disabled={approving[share._id]}
                className="px-2 py-1 bg-red-600 text-white text-xs rounded flex items-center justify-center disabled:opacity-50"
              >
                {approving[share._id] ? <Loader2 size={12} className="animate-spin" /> : "✕"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
