import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function ChatPanel() {
  const { token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState("agency");

  const send = async () => {
    if (!input.trim()) return;
    const userMessage = input.trim();
    setMessages((m) => [...m, { role: "user", text: userMessage }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chatbot/converse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessage, scope }),
      });

      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "bot", text: data.reply, docsCount: data.docsCount },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "bot", text: "Error contacting chatbot" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-slate-950/50 border border-white/10 rounded-2xl p-4 backdrop-blur-xl">
      <h2 className="text-lg font-semibold mb-3">Collaboration Chatbot</h2>

      <div className="h-64 overflow-auto mb-3 p-2 bg-slate-900/30 rounded">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">
            Ask the bot to find cross-agency context or suggest collaborators.
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`mb-2 ${m.role === "user" ? "text-right" : "text-left"}`}
          >
            <div
              className={`inline-block p-2 rounded ${
                m.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-white/90"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-2">
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="px-2 py-1 rounded bg-slate-700 text-white text-sm"
        >
          <option value="agency">My Agency Docs</option>
          <option value="cross-agency">Cross-Agency (Approved)</option>
          <option value="mine">My Docs Only</option>
        </select>
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-2 rounded bg-slate-900/40 border border-white/10"
          placeholder="Ask the collaboration assistant..."
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
        />
        <button
          onClick={send}
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 rounded text-white"
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </section>
  );
}
