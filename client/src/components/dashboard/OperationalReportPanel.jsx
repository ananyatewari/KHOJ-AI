import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import {
  FileText,
  Image,
  UploadCloud,
  CheckCircle,
  Download,
  Loader2,
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
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const generateReport = async () => {
    setLoading(true);

    const now = new Date();
    let from;

    if (range === "24h") {
      from = new Date(now - 24 * 60 * 60 * 1000);
    } else if (range === "48h") {
      from = new Date(now - 48 * 60 * 60 * 1000);
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
          to: now.toISOString(),
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


  return (
    <section className={`mb-12 border rounded-2xl p-6 backdrop-blur-xl ${
      theme === "dark"
        ? "bg-slate-950/60 border-white/10"
        : "bg-white/80 border-purple-200 shadow-lg"
    }`}>
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h2 className={`text-xl font-semibold ${
            theme === "dark" ? "text-white" : "text-slate-800"
          }`}>
            Operational Intelligence Report
          </h2>
          <p className={`text-sm ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}>
            Agency overview · {agency.toUpperCase()}
          </p>
        </div>

        <div className="flex gap-2">
          <RangeButton
            active={range === "24h"}
            onClick={() => setRange("24h")}
            theme={theme}
          >
            Last 24h
          </RangeButton>
          <RangeButton
            active={range === "48h"}
            onClick={() => setRange("48h")}
            theme={theme}
          >
            Last 48h
          </RangeButton>
          <button
            onClick={generateReport}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:shadow-lg transition"
          >
            Generate
          </button>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 size={48} className="animate-spin text-indigo-500 mb-4" />
          <p className={`font-medium ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}>
            Generating operational report…
          </p>
        </div>
      )}

      {/* REPORT */}
      {report && (
        <>
          {/* SUMMARY */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <SummaryCard
              icon={<UploadCloud />}
              label="Uploaded"
              value={report.summary.totalUploaded}
              color="from-indigo-500/60 to-blue-500/60"
            />
            <SummaryCard
              icon={<FileText />}
              label="PDFs"
              value={report.summary.pdfCount}
              color="from-purple-500/60 to-fuchsia-500/60"
            />
            <SummaryCard
              icon={<Image />}
              label="Images"
              value={report.summary.imageCount}
              color="from-amber-500/60 to-orange-500/60"
            />
          </div>

          {/* GRAPH */}
          <div className="mb-8">
            <h3 className={`text-sm font-medium mb-3 ${
              theme === "dark" ? "text-slate-300" : "text-slate-700"
            }`}>
              Upload Timeline
            </h3>

            <div className={`h-64 rounded-xl p-4 border ${
              theme === "dark"
                ? "bg-slate-900/60 border-white/10"
                : "bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200"
            }`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={report.timeline}>
                  <XAxis dataKey="label" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DOWNLOAD */}
          <div className="flex justify-end">
            <button
              onClick={downloadReport}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition shadow-md hover:shadow-lg ${
                theme === "dark"
                  ? "bg-slate-800 hover:bg-slate-700 text-white"
                  : "bg-purple-600 hover:bg-purple-700 text-white"
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
      className={`px-3 py-2 rounded-lg text-sm transition ${
        active
          ? theme === "dark"
            ? "bg-slate-700 text-white"
            : "bg-purple-600 text-white shadow-md"
          : theme === "dark"
          ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
          : "bg-purple-100 text-purple-700 hover:bg-purple-200"
      }`}
    >
      {children}
    </button>
  );
}

function SummaryCard({ icon, label, value, color }) {
  return (
    <div
      className={`bg-gradient-to-br ${color} rounded-xl p-4 text-white flex items-center justify-between shadow`}
    >
      <div>
        <p className="text-sm opacity-80">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
      <div className="opacity-80">{icon}</div>
    </div>
  );
}
