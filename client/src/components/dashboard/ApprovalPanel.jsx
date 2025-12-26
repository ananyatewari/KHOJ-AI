import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

export default function ApprovalPanel() {
  const { token, user } = useAuth();
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
    <section className="bg-slate-950/50 border border-yellow-500/20 rounded-2xl p-4 mt-6">
      <h3 className="font-semibold mb-2 text-yellow-400">
        ⚡ Admin: Cross-Agency Approval Queue
      </h3>
      <p className="text-xs text-slate-400 mb-3">
        Review and approve documents for cross-agency chatbot visibility.
      </p>

      {loading && (
        <p className="text-sm text-slate-400">Loading pending approvals...</p>
      )}

      {pending.length === 0 && !loading && (
        <p className="text-sm text-slate-500">No pending approvals.</p>
      )}

      <ul className="space-y-2 max-h-72 overflow-auto">
        {pending.map((share) => (
          <li
            key={share._id}
            className="bg-slate-900/60 border border-yellow-500/10 p-3 rounded flex items-start justify-between"
          >
            <div className="flex-1">
              <div className="font-medium text-sm">
                {share.documentId?.filename}
              </div>
              <div className="text-xs text-slate-400">
                {share.uploadedByAgency.toUpperCase()} · Shared by{" "}
                {share.uploadedBy}
              </div>
              <div className="text-xs text-slate-500 mt-1 max-w-xs truncate">
                {share.documentId?.text?.slice(0, 100)}...
              </div>
              <div className="text-xs text-yellow-500 mt-1">
                Pending {share.scope} approval
              </div>
            </div>
            <div className="flex gap-1 ml-2">
              <button
                onClick={() => approve(share._id)}
                disabled={approving[share._id]}
                className="px-2 py-1 bg-emerald-600 text-white text-xs rounded"
              >
                {approving[share._id] ? "..." : "✓"}
              </button>
              <button
                onClick={() => reject(share._id)}
                disabled={approving[share._id]}
                className="px-2 py-1 bg-red-600 text-white text-xs rounded"
              >
                {approving[share._id] ? "..." : "✕"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
