import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { fetchDashboard } from "../context/dashboardApi";
import OperationalReportPanel from "../components/dashboard/OperationalReportPanel";
import ChatPanel from "../components/dashboard/ChatPanel";
import SharePanel from "../components/dashboard/SharePanel";
import ApprovalPanel from "../components/dashboard/ApprovalPanel";

export default function Dashboard() {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("24h");
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchOperationalReport = async () => {
    setReportLoading(true);

    const now = new Date();
    let from;

    if (range === "24h") {
      from = new Date(now - 24 * 60 * 60 * 1000);
    } else if (range === "48h") {
      from = new Date(now - 48 * 60 * 60 * 1000);
    }

    const res = await fetch("http://localhost:3000/api/report/operational", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        from: from.toISOString(),
        to: now.toISOString(),
      }),
    });

    const data = await res.json();
    setReport(data);
    setReportLoading(false);
  };

  const downloadOperationalReport = async (report) => {
    const res = await fetch("http://localhost:3000/api/report/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report }),
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "operational-report.pdf";
    a.click();
  };

  useEffect(() => {
    fetchDashboard(token)
      .then(setData)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
      <div className={`min-h-full ${
        theme === "dark" ? "bg-slate-900" : ""
      }`}>
        <div className="max-w-7xl mx-auto p-8">
          <div className="mb-8">
            <h1 className={`text-3xl font-bold mb-2 ${
              theme === "dark" ? "text-white" : "text-slate-800"
            }`}>Dashboard</h1>
            <p className={theme === "dark" ? "text-slate-400" : "text-slate-600"}>
              Welcome back, <span className="text-indigo-400 font-medium">{user.username}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatCard
              title="Uploads (24h)"
              value={data?.stats.last24h || 0}
              icon={<Upload size={24} />}
              color="from-indigo-500 to-blue-500"
            />
            <StatCard
              title="My Uploads"
              value={data?.myDocs.length || 0}
              icon={<Users size={24} />}
              color="from-purple-500 to-fuchsia-500"
            />
            <StatCard
              title={`${user.agency.toUpperCase()} Uploads`}
              value={data?.agencyDocs.length || 0}
              icon={<Building2 size={24} />}
              color="from-emerald-500 to-teal-500"
            />
          </div>

          <div className="space-y-6">
            <OperationalReportPanel token={token} agency={user.agency} />

            <ApprovalPanel />

            {loading && <p className={`text-center py-8 ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}>Loading dashboard…</p>}

            {data && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <Section title="My Uploads">
                    <List docs={data.myDocs} showUser={false} />
                  </Section>

                  <SharePanel docs={data.myDocs} />
                </div>

                <div>
                  <Section title={`${user.agency.toUpperCase()} Uploads`}>
                    <List docs={data.agencyDocs} showUser />
                  </Section>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

import { Upload, Users, Building2 } from "lucide-react";

function StatCard({ title, value, color, icon }) {
  const { theme } = useTheme();
  return (
    <div className={`backdrop-blur-sm border rounded-xl p-6 transition-all duration-300 ${
      theme === "dark"
        ? "bg-slate-800/50 border-slate-700/50 hover:border-indigo-500/50"
        : "bg-white/80 border-purple-200 hover:border-purple-400 shadow-lg hover:shadow-xl"
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gradient-to-br ${color} bg-opacity-10`}>
          <div className={`text-transparent bg-clip-text bg-gradient-to-br ${color}`}>
            {icon}
          </div>
        </div>
      </div>
      <p className={`text-sm mb-1 ${
        theme === "dark" ? "text-slate-400" : "text-slate-600"
      }`}>{title}</p>
      <p className={`text-3xl font-bold ${
        theme === "dark" ? "text-white" : "text-slate-800"
      }`}>{value}</p>
    </div>
  );
}

function Section({ title, children }) {
  const { theme } = useTheme();
  return (
    <section className={`backdrop-blur-sm border rounded-xl p-6 ${
      theme === "dark"
        ? "bg-slate-800/50 border-slate-700/50"
        : "bg-white/80 border-purple-200 shadow-lg"
    }`}>
      <h2 className={`text-lg font-semibold mb-4 ${
        theme === "dark" ? "text-white" : "text-slate-800"
      }`}>{title}</h2>
      {children}
    </section>
  );
}

function List({ docs, showUser }) {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(10);

  const visibleDocs = docs.slice(0, visible);

  if (!docs.length)
    return <p className={`text-sm ${
      theme === "dark" ? "text-slate-400" : "text-slate-600"
    }`}>No documents</p>;

  return (
    <>
      <ul className={`space-y-2 max-h-[420px] overflow-y-auto pr-2 scrollbar-thin ${
        theme === "dark"
          ? "scrollbar-thumb-slate-700"
          : "scrollbar-thumb-purple-300"
      } scrollbar-track-transparent`}>
        {visibleDocs.map((d) => (
          <li
            key={d._id}
            className={`border p-4 rounded-lg transition-all duration-200 ${
              theme === "dark"
                ? "bg-slate-900/50 border-slate-700/50 hover:border-indigo-500/50"
                : "bg-gradient-to-r from-purple-50/50 to-indigo-50/50 border-purple-200 hover:border-purple-400 hover:shadow-md"
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate ${
                  theme === "dark" ? "text-white" : "text-slate-800"
                }`}>{d.filename}</p>
                {showUser && (
                  <p className={`text-xs mt-1 ${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>
                    Uploaded by: {d.uploadedBy}
                  </p>
                )}
              </div>
              <span className={`text-xs whitespace-nowrap ${
                theme === "dark" ? "text-slate-500" : "text-slate-500"
              }`}>
                {new Date(d.createdAt).toLocaleDateString()}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {visible < docs.length && (
        <button
          onClick={() => setVisible((v) => v + 10)}
          className={`mt-4 text-sm transition font-medium ${
            theme === "dark"
              ? "text-indigo-400 hover:text-indigo-300"
              : "text-purple-600 hover:text-purple-700"
          }`}
        >
          Load more →
        </button>
      )}
    </>
  );
}
