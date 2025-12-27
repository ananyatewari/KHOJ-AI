import { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import {
  FileText,
  Image,
  UploadCloud,
  CheckCircle,
  Download,
  Loader2,
  Mic,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function OperationalReportPanel({
  token,
  agency,
}) {
  const { theme } = useTheme();
  const [range, setRange] = useState("24h");
  const [customDate, setCustomDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const generateReport = async () => {
    setLoading(true);

    const now = new Date();
    let from;
    let to = now;

    if (range === "24h") {
      from = new Date(now - 24 * 60 * 60 * 1000);
    } else if (range === "48h") {
      from = new Date(now - 48 * 60 * 60 * 1000);
    } else if (range === "custom" && customDate) {
      from = new Date(customDate);
      from.setHours(0, 0, 0, 0);
      to = new Date(customDate);
      to.setHours(23, 59, 59, 999);
    } else {
      setLoading(false);
      return;
    }

    const res = await fetch(
      "http://localhost:3000/api/report/operational",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          from: from.toISOString(),
          to: to.toISOString(),
        }),
      }
    );

    const data = await res.json();
    setReport(data);
    setLoading(false);
  };

  const downloadReport = async () => {
    const res = await fetch(
      "http://localhost:3000/api/report/export/pdf",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          report,
          from: report.range.from,
          to: report.range.to,
        }),
      }
    );

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "khoj-operational-report.pdf";
    a.click();
  };

  useEffect(() => {
    generateReport();
  }, []);


  return (
    <section className={`mb-6 border rounded-2xl p-5 backdrop-blur-xl transition-all duration-300 hover:shadow-xl ${
      theme === "dark"
        ? "bg-slate-950/60 border-white/10"
        : "bg-white/80 border-purple-200 shadow-lg"
    }`}>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h2 className={`text-lg font-semibold flex items-center gap-2 ${
            theme === "dark" ? "text-white" : "text-slate-800"
          }`}>
            <UploadCloud className="w-5 h-5 text-indigo-500" />
            Operational Intelligence Report
          </h2>
          <p className={`text-xs mt-0.5 ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}>
            Agency overview · {agency.toUpperCase()}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <RangeButton
            active={range === "24h"}
            onClick={() => { setRange("24h"); setCustomDate(""); }}
            theme={theme}
          >
            Last 24h
          </RangeButton>
          <RangeButton
            active={range === "48h"}
            onClick={() => { setRange("48h"); setCustomDate(""); }}
            theme={theme}
          >
            Last 48h
          </RangeButton>
          <RangeButton
            active={range === "custom"}
            onClick={() => setRange("custom")}
            theme={theme}
          >
            <Calendar className="w-4 h-4" />
          </RangeButton>
          {range === "custom" && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className={`px-3 py-2 rounded-lg text-sm transition border ${
                theme === "dark"
                  ? "bg-slate-800 text-white border-slate-700"
                  : "bg-white text-slate-800 border-purple-300"
              }`}
            />
          )}
          <button
            onClick={generateReport}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Generating..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 size={40} className="animate-spin text-indigo-500 mb-3" />
          <p className={`text-sm font-medium ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}>
            Generating operational report…
          </p>
        </div>
      )}

      {/* REPORT */}
      {report && !loading && (
        <>
          {/* SUMMARY */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <SummaryCard
              icon={<UploadCloud />}
              label="Total Uploaded"
              value={report.summary.totalUploaded}
              color="from-indigo-500 to-blue-500"
              theme={theme}
            />
            <SummaryCard
              icon={<FileText />}
              label="PDFs"
              value={report.summary.pdfCount}
              color="from-purple-500 to-fuchsia-500"
              theme={theme}
            />
            <SummaryCard
              icon={<Image />}
              label="Images"
              value={report.summary.imageCount}
              color="from-amber-500 to-orange-500"
              theme={theme}
            />
            <SummaryCard
              icon={<Mic />}
              label="Audio"
              value={report.summary.audioCount || 0}
              color="from-emerald-500 to-teal-500"
              theme={theme}
            />
          </div>

          {/* GRAPH */}
          <div className="mb-5">
            <h3 className={`text-sm font-semibold mb-2 ${
              theme === "dark" ? "text-slate-300" : "text-slate-700"
            }`}>
              Upload Timeline
            </h3>

            <div className={`h-56 rounded-xl p-3 border transition-all duration-300 ${
              theme === "dark"
                ? "bg-slate-900/60 border-slate-700/50"
                : "bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200"
            }`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={report.timeline}>
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                      border: "1px solid #6366f1",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ fill: "#6366f1", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DOWNLOAD */}
          <div className="flex justify-end">
            <button
              onClick={downloadReport}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 ${
                theme === "dark"
                  ? "bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white"
                  : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
              }`}
            >
              <Download size={16} />
              Download Combined Report
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/* ---------- SMALL UI HELPERS ---------- */

function RangeButton({ active, children, theme, ...props }) {
  return (
    <button
      {...props}
      className={`px-3 py-2 rounded-lg text-sm transition-all duration-300 flex items-center gap-1 ${
        active
          ? theme === "dark"
            ? "bg-slate-700 text-white shadow-md"
            : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md"
          : theme === "dark"
          ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
          : "bg-purple-100 text-purple-700 hover:bg-purple-200"
      }`}
    >
      {children}
    </button>
  );
}

function SummaryCard({ icon, label, value, color, theme }) {
  return (
    <div
      className={`bg-gradient-to-br ${color} rounded-xl p-3.5 text-white flex items-center justify-between shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105 animate-fade-in`}
    >
      <div>
        <p className="text-xs opacity-90 font-medium">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
      </div>
      <div className="opacity-90 text-white">{icon}</div>
    </div>
  );
}
