import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { Send, History, Plus, Trash2, X, FileText, Users, Shield, Sparkles } from "lucide-react";

export default function ChatPanel() {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    <div className={`h-full flex ${
      theme === "dark" ? "bg-slate-900" : "bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50"
    }`}>
      {/* History Sidebar */}
      <div className={`${
        showHistory ? "w-80" : "w-0"
      } transition-all duration-300 overflow-hidden border-r flex flex-col ${
        theme === "dark"
          ? "border-slate-700/50 bg-slate-950/50"
          : "border-purple-200 bg-white/80 backdrop-blur-xl shadow-lg"
      }`}>
        {showHistory && (
          <>
            <div className={`p-6 border-b ${
              theme === "dark" ? "border-slate-700/50" : "border-purple-200"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold flex items-center gap-2 ${
                  theme === "dark" ? "text-white" : "text-slate-800"
                }`}>
                  <History size={20} className="text-indigo-400" />
                  Chat History
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className={`p-1.5 rounded-lg transition ${
                    theme === "dark" ? "hover:bg-slate-800" : "hover:bg-purple-100"
                  }`}
                >
                  <X size={18} className={theme === "dark" ? "text-slate-400" : "text-slate-600"} />
                </button>
              </div>
              <button
                onClick={clearChat}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition shadow-md hover:shadow-lg"
              >
                <Plus size={18} />
                New Conversation
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {chatHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History size={48} className={`mx-auto mb-3 ${
                    theme === "dark" ? "text-slate-600" : "text-purple-300"
                  }`} />
                  <p className={`text-sm ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>No saved conversations</p>
                  <p className={`text-xs mt-1 ${
                    theme === "dark" ? "text-slate-500" : "text-slate-500"
                  }`}>Start chatting to create history</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chatHistory.map((conv) => (
                    <div
                      key={conv.id}
                      className={`group border rounded-lg p-3 cursor-pointer transition ${
                        theme === "dark"
                          ? "bg-slate-800/50 hover:bg-slate-800 border-slate-700/50"
                          : "bg-purple-50 hover:bg-purple-100 border-purple-200"
                      }`}
                    >
                      <button
                        onClick={() => loadConversation(conv)}
                        className="w-full text-left"
                      >
                        <p className={`text-sm truncate mb-1 ${
                          theme === "dark" ? "text-white" : "text-slate-800"
                        }`}>{conv.preview}...</p>
                        <p className={`text-xs ${
                          theme === "dark" ? "text-slate-500" : "text-slate-600"
                        }`}>
                          {new Date(conv.timestamp).toLocaleDateString()} at {new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFromHistory(conv.id);
                        }}
                        className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded text-xs transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className={`backdrop-blur-sm border-b p-6 ${
          theme === "dark"
            ? "bg-slate-950/50 border-slate-700/50"
            : "bg-white/60 border-purple-200 shadow-sm"
        }`}>
          <div className="max-w-5xl mx-auto">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                      <Users size={24} className="text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-slate-950 flex items-center justify-center">
                      <Shield size={12} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <h1 className={`text-2xl font-bold flex items-center gap-2 ${
                      theme === "dark" ? "text-white" : "text-slate-800"
                    }`}>
                      Cross-Agency Intelligence Chat
                      <Sparkles size={20} className="text-amber-400" />
                    </h1>
                    <p className={`text-sm mt-1 ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}>
                      AI-powered assistant grounded in cross-agency approved shared documents
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-indigo-300 font-medium">Secure Connection</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full">
                    <Shield size={12} className="text-purple-400" />
                    <span className="text-purple-300 font-medium">Agency: {user?.agency?.toUpperCase()}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg font-medium transition shadow-md hover:shadow-lg ${
                  theme === "dark"
                    ? "bg-slate-800 hover:bg-slate-700 border-slate-700 text-white"
                    : "bg-white hover:bg-purple-50 border-purple-200 text-slate-700"
                }`}
              >
                <History size={18} />
                {showHistory ? "Hide" : "History"}
              </button>
            </div>
          </div>
        </div>


        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-6">
            {messages.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Sparkles size={40} className="text-white" />
                </div>
                <h2 className={`text-2xl font-bold mb-3 ${
                  theme === "dark" ? "text-white" : "text-slate-800"
                }`}>Welcome to Cross-Agency Intelligence Chat</h2>
                <p className={`mb-6 max-w-2xl mx-auto ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>
                  Ask questions about topics in shared documents. The AI assistant will provide answers grounded in cross-agency approved intelligence and cite every document it references.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                  <div className={`border rounded-xl p-4 ${
                    theme === "dark"
                      ? "bg-slate-800/50 border-slate-700/50"
                      : "bg-white/80 border-purple-200 shadow-md"
                  }`}>
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center mb-3">
                      <Shield size={20} className="text-indigo-400" />
                    </div>
                    <h3 className={`text-sm font-semibold mb-1 ${
                      theme === "dark" ? "text-white" : "text-slate-800"
                    }`}>Secure & Verified</h3>
                    <p className={`text-xs ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}>All responses are based on approved shared documents</p>
                  </div>
                  <div className={`border rounded-xl p-4 ${
                    theme === "dark"
                      ? "bg-slate-800/50 border-slate-700/50"
                      : "bg-white/80 border-purple-200 shadow-md"
                  }`}>
                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-3">
                      <Users size={20} className="text-purple-400" />
                    </div>
                    <h3 className={`text-sm font-semibold mb-1 ${
                      theme === "dark" ? "text-white" : "text-slate-800"
                    }`}>Cross-Agency</h3>
                    <p className={`text-xs ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}>Access intelligence from multiple agencies</p>
                  </div>
                  <div className={`border rounded-xl p-4 ${
                    theme === "dark"
                      ? "bg-slate-800/50 border-slate-700/50"
                      : "bg-white/80 border-purple-200 shadow-md"
                  }`}>
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-3">
                      <FileText size={20} className="text-emerald-400" />
                    </div>
                    <h3 className={`text-sm font-semibold mb-1 ${
                      theme === "dark" ? "text-white" : "text-slate-800"
                    }`}>Source Citations</h3>
                    <p className={`text-xs ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}>Every answer includes document references</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-3xl ${m.role === "user" ? "w-auto" : "w-full"}`}>
                    {m.role === "user" ? (
                      <div className="flex items-start gap-3 justify-end">
                        <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-5 py-3 shadow-lg">
                          <p className="text-sm leading-relaxed">{m.text}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-semibold text-sm">{user?.username?.charAt(0).toUpperCase()}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                          <Sparkles size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <div className={`border rounded-2xl rounded-tl-sm px-5 py-3 shadow-lg ${
                            theme === "dark"
                              ? "bg-slate-800/50 border-slate-700/50 text-white"
                              : "bg-white/90 border-purple-200 text-slate-800"
                          }`}>
                            <p className="text-sm leading-relaxed">{m.text}</p>
                          </div>
                          {m.sources?.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className={`text-xs font-medium ${
                                theme === "dark" ? "text-slate-400" : "text-slate-600"
                              }`}>
                                📚 Sources ({m.sources.length} of {m.scannedDocs} documents scanned)
                              </p>
                              <div className="space-y-2">
                                {m.sources.map((source) => (
                                  <div
                                    key={source.id}
                                    className={`border rounded-lg p-3 transition ${
                                      theme === "dark"
                                        ? "bg-slate-900/50 border-slate-700/50 hover:border-indigo-500/50"
                                        : "bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 hover:border-indigo-400 shadow-sm"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <FileText size={14} className="text-indigo-400" />
                                          <p className={`text-sm font-medium ${
                                            theme === "dark" ? "text-white" : "text-slate-800"
                                          }`}>{source.filename}</p>
                                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs font-medium">
                                            {source.agency?.toUpperCase()}
                                          </span>
                                        </div>
                                        <p className={`text-xs line-clamp-2 italic ${
                                          theme === "dark" ? "text-slate-400" : "text-slate-600"
                                        }`}>"{source.snippet}"</p>
                                      </div>
                                      <button
                                        onClick={() => viewDocument(source.id)}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg font-medium transition whitespace-nowrap shadow-md"
                                      >
                                        View
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
                      <Sparkles size={20} className="text-white" />
                    </div>
                    <div className={`border rounded-2xl rounded-tl-sm px-5 py-3 ${
                      theme === "dark"
                        ? "bg-slate-800/50 border-slate-700/50"
                        : "bg-white/90 border-purple-200 shadow-lg"
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className={`border-t backdrop-blur-sm p-6 ${
          theme === "dark"
            ? "border-slate-700/50 bg-slate-950/50"
            : "border-purple-200 bg-white/60 shadow-lg"
        }`}>
          <div className="max-w-5xl mx-auto">
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className={`w-full px-5 py-4 pr-12 rounded-xl border focus:outline-none focus:border-indigo-500 transition resize-none ${
                    theme === "dark"
                      ? "bg-slate-800 border-slate-700 text-white placeholder-slate-400"
                      : "bg-white border-purple-200 text-slate-800 placeholder-slate-500 shadow-md"
                  }`}
                  placeholder="Ask about cross-agency intelligence..."
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  style={{ minHeight: '56px', maxHeight: '200px' }}
                />
                <div className={`absolute right-4 bottom-4 text-xs ${
                  theme === "dark" ? "text-slate-500" : "text-slate-400"
                }`}>
                  Press Enter to send
                </div>
              </div>
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition flex items-center gap-2 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
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
    </div>
  );
}
