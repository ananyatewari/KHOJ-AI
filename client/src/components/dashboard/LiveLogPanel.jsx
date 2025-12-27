import { useEffect, useRef, useState } from "react";
import socket from "../../services/socket";
import { useTheme } from "../../context/ThemeContext";

const getLevelStyles = (theme) => ({
  INFO: {
    badge:
      theme === "dark"
        ? "bg-blue-500/20 text-blue-400"
        : "bg-blue-100 text-blue-700",
    text: theme === "dark" ? "text-blue-300" : "text-blue-800",
  },
  SUCCESS: {
    badge:
      theme === "dark"
        ? "bg-green-500/20 text-green-400"
        : "bg-green-100 text-green-700",
    text: theme === "dark" ? "text-green-300" : "text-green-800",
  },
  WARNING: {
    badge:
      theme === "dark"
        ? "bg-yellow-500/20 text-yellow-400"
        : "bg-yellow-100 text-yellow-700",
    text: theme === "dark" ? "text-yellow-300" : "text-yellow-800",
  },
  ERROR: {
    badge:
      theme === "dark"
        ? "bg-red-500/20 text-red-400"
        : "bg-red-100 text-red-700",
    text: theme === "dark" ? "text-red-300" : "text-red-800",
  },
});

export default function LiveLogPanel() {
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [height, setHeight] = useState("h-32"); // Smaller default height
  const endRef = useRef(null);
  const { theme } = useTheme();
  const levelStyles = getLevelStyles(theme);

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
        className={`fixed bottom-0 right-4 px-4 py-1 rounded-t cursor-pointer shadow-lg z-50
          ${
            theme === "dark"
              ? "bg-slate-900 text-white"
              : "bg-slate-200 text-slate-800"
          }
        `}
        onClick={() => setOpen(true)}
      >
        ▲ Live Logs
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 text-sm z-50 shadow-2xl border-t ${height}
      ${
        theme === "dark"
          ? "bg-slate-950 border-slate-800 text-slate-200"
          : "bg-white border-slate-300 text-slate-800"
      }`}
    >
      {/* HEADER */}
      <div
        className={`flex justify-between items-center px-4 py-2 border-b
        ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}
      >
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          <span className="font-semibold">Live System Logs</span>
        </div>

        <div className="flex gap-3 text-xs">
          <button
            onClick={() => setPaused((p) => !p)}
            className={`text-xs
              ${
                theme === "dark"
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>

          <button
            onClick={() => setLogs([])}
            className={`text-xs
              ${
                theme === "dark"
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
          >
            🗑 Clear
          </button>

          <button
            onClick={() => setOpen(false)}
            className={`text-xs
              ${
                theme === "dark"
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
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
              className={`flex gap-3 items-start rounded px-3 py-2 border
              ${
                theme === "dark"
                  ? "bg-slate-900/60 border-slate-800"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              {/* LEVEL BADGE */}
              <span
                className={`text-[10px] px-2 py-0.5 rounded ${style.badge}`}
              >
                {l.level}
              </span>

              {/* MESSAGE */}
              <div className="flex-1">
                <div className={`leading-snug ${style.text}`}>{l.message}</div>

                <div
                  className={`text-[10px] mt-1
                  ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}
                >
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