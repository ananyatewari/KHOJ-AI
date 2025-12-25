import { useEffect, useRef, useState } from "react";
import socket from "../../services/socket";

const levelStyles = {
  INFO: {
    badge: "bg-blue-500/20 text-blue-400",
    text: "text-blue-300"
  },
  SUCCESS: {
    badge: "bg-green-500/20 text-green-400",
    text: "text-green-300"
  },
  WARNING: {
    badge: "bg-yellow-500/20 text-yellow-400",
    text: "text-yellow-300"
  },
  ERROR: {
    badge: "bg-red-500/20 text-red-400",
    text: "text-red-300"
  }
};

export default function LiveLogPanel() {
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState(true);
  const [paused, setPaused] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    const handler = (log) => {
      if (paused) return;
      setLogs((prev) => [...prev.slice(-99), log]);
    };

    socket.on("system:log", handler);
    return () => socket.off("system:log", handler);
  }, [paused]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (!open) {
    return (
      <div
        className="fixed bottom-0 right-4 bg-slate-900 text-white px-4 py-1 rounded-t cursor-pointer shadow-lg z-50"
        onClick={() => setOpen(true)}
      >
        ▲ Live Logs
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-56 bg-slate-950 border-t border-slate-800 text-sm text-slate-200 z-50 shadow-2xl">

      {/* HEADER */}
      <div className="flex justify-between items-center px-4 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-semibold">Live System Logs</span>
        </div>

        <div className="flex gap-3 text-xs">
          <button
            onClick={() => setPaused(p => !p)}
            className="text-slate-400 hover:text-white"
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>

          <button
            onClick={() => setLogs([])}
            className="text-slate-400 hover:text-white"
          >
            🗑 Clear
          </button>

          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            ▼
          </button>
        </div>
      </div>

      {/* LOG LIST */}
      <div className="overflow-y-auto h-[calc(100%-44px)] px-4 py-2 space-y-2 font-mono">
        {logs.map((l, i) => {
          const style = levelStyles[l.level] || levelStyles.INFO;

          return (
            <div
              key={i}
              className="flex gap-3 items-start bg-slate-900/60 border border-slate-800 rounded px-3 py-2"
            >
              {/* LEVEL BADGE */}
              <span
                className={`text-[10px] px-2 py-0.5 rounded ${style.badge}`}
              >
                {l.level}
              </span>

              {/* MESSAGE */}
              <div className="flex-1">
                <div className={`leading-snug ${style.text}`}>
                  {l.message}
                </div>

                <div className="text-[10px] text-slate-500 mt-1">
                  {new Date(l.timestamp).toLocaleTimeString()}
                  {l.user && ` · ${l.user} (${l.agency})`}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}
