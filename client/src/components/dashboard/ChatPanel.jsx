import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";

export default function ChatPanel() {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(`chatHistory_${user?.username}`);
    if (savedHistory) {
      try {
        setChatHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load chat history", e);
      }
    }
  }, [user]);

  // Save current conversation to history
  const saveToHistory = () => {
    if (messages.length === 0) return;
    
    const conversation = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      messages: messages,
      preview: messages[0]?.text?.slice(0, 50) || "Conversation"
    };
    
    const updatedHistory = [conversation, ...chatHistory].slice(0, 20); // Keep last 20
    setChatHistory(updatedHistory);
    localStorage.setItem(`chatHistory_${user?.username}`, JSON.stringify(updatedHistory));
  };

  // Load a conversation from history
  const loadConversation = (conversation) => {
    setMessages(conversation.messages);
    setShowHistory(false);
  };

  // Clear current chat
  const clearChat = () => {
    if (messages.length > 0) {
      saveToHistory();
    }
    setMessages([]);
  };

  // Delete a conversation from history
  const deleteFromHistory = (id) => {
    const updatedHistory = chatHistory.filter(c => c.id !== id);
    setChatHistory(updatedHistory);
    localStorage.setItem(`chatHistory_${user?.username}`, JSON.stringify(updatedHistory));
  };

  const viewDocument = async (docId) => {
    try {
      const res = await fetch(`/api/document/${docId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const doc = await res.json();
      setViewingDoc(doc);
    } catch (err) {
      console.error("Failed to load document:", err);
      alert("Failed to load document");
    }
  };

  const closeDocViewer = () => {
    setViewingDoc(null);
  };

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
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: data.reply,
          docsCount: data.docsCount,
          sources: data.sources || [],
          scannedDocs: data.scannedDocs || 0,
        },
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
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold">Cross-Agency Chat</h2>
          <p className="text-xs text-slate-400">
            Answers are grounded in cross-agency approved shared documents.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded"
          >
            {showHistory ? "Hide History" : "History"}
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded"
            >
              New Chat
            </button>
          )}
        </div>
      </div>

      {showHistory && (
        <div className="mb-3 p-3 bg-slate-900/60 rounded border border-white/5 max-h-48 overflow-auto">
          <h3 className="text-sm font-semibold mb-2 text-white">Chat History</h3>
          {chatHistory.length === 0 ? (
            <p className="text-xs text-slate-400">No saved conversations</p>
          ) : (
            <ul className="space-y-1">
              {chatHistory.map((conv) => (
                <li
                  key={conv.id}
                  className="flex items-center justify-between bg-slate-800/50 p-2 rounded hover:bg-slate-800"
                >
                  <button
                    onClick={() => loadConversation(conv)}
                    className="flex-1 text-left"
                  >
                    <p className="text-xs text-white truncate">{conv.preview}</p>
                    <p className="text-[10px] text-slate-500">
                      {new Date(conv.timestamp).toLocaleString()}
                    </p>
                  </button>
                  <button
                    onClick={() => deleteFromHistory(conv.id)}
                    className="ml-2 px-2 py-1 text-red-400 hover:text-red-300 text-xs"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="h-64 overflow-auto mb-3 p-2 bg-slate-900/30 rounded space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-slate-400">
            Ask about topics that may exist in shared documents. The assistant
            will cite every document it references.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={`inline-block p-2 rounded mb-1 ${
                m.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-white/5 text-white/90"
              }`}
            >
              {m.text}
            </div>
            {m.role === "bot" && m.sources?.length > 0 && (
              <div className="text-xs text-slate-400 space-y-1">
                <p>
                  Sources ({m.sources.length} of {m.scannedDocs} scanned):
                </p>
                <ul className="space-y-1">
                  {m.sources.map((source) => (
                    <li
                      key={source.id}
                      className="bg-slate-900/60 border border-white/5 rounded p-2 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">
                            {source.filename} · {source.agency?.toUpperCase()}
                          </p>
                          <p className="text-[11px] text-slate-400 line-clamp-3">
                            "{source.snippet}"
                          </p>
                        </div>
                        <button
                          onClick={() => viewDocument(source.id)}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] rounded whitespace-nowrap"
                        >
                          View Doc
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-2 rounded bg-slate-900/40 border border-white/10"
          placeholder="Ask the cross-agency assistant…"
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

      {viewingDoc && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-white/20 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {viewingDoc.filename}
                </h3>
                <p className="text-xs text-slate-400">
                  {viewingDoc.agency?.toUpperCase()} · Uploaded by{" "}
                  {viewingDoc.uploadedBy}
                </p>
              </div>
              <button
                onClick={closeDocViewer}
                className="w-8 h-8 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded text-lg font-bold"
                title="Close"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-slate-200 font-mono bg-slate-950/50 p-4 rounded">
                  {viewingDoc.text}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
