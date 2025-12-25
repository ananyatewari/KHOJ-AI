import { useEffect, useRef, useState } from "react";
import socket from "../../services/socket";

const levelColor = {
  INFO: "text-blue-400",
  SUCCESS: "text-green-400",
  WARNING: "text-yellow-400",
  ERROR: "text-red-400"
};

export default function LiveLogPanel() {
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState(true);
  const endRef = useRef(null);

  useEffect(() => {
    socket.on("system:log", (log) => {
      setLogs((prev) => [...prev.slice(-99), log]);
    });
    return () => socket.off("system:log");
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (!open) {
    return (
      <div
        className="fixed bottom-0 right-4 bg-slate-900 text-white px-3 py-1 rounded-t cursor-pointer"
        onClick={() => setOpen(true)}
      >
        ▲ Live Logs
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-48 bg-slate-950 border-t border-slate-800 text-sm text-slate-200 z-50">
      <div className="flex justify-between items-center px-4 py-2 border-b border-slate-800">
        <span className="font-semibold">Live System Logs</span>
        <button
          onClick={() => setOpen(false)}
          className="text-slate-400 hover:text-white"
        >
          ▼
        </button>
      </div>

      <div className="overflow-y-auto h-[calc(100%-40px)] px-4 py-2 space-y-1">
        {logs.map((l, i) => (
          <div key={i} className={`${levelColor[l.level]}`}>
            [{new Date(l.timestamp).toLocaleTimeString()}] {l.message}
            {l.user && (
              <span className="text-slate-400">
                {" "}— {l.user} ({l.agency})
              </span>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
