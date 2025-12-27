import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { fetchDashboard } from "../context/dashboardApi";
import OperationalReportPanel from "../components/dashboard/OperationalReportPanel";
import ChatPanel from "../components/dashboard/ChatPanel";
import SharePanel from "../components/dashboard/SharePanel";
import ApprovalPanel from "../components/dashboard/ApprovalPanel";
import EventIntelligencePanel from "../components/dashboard/EventIntelligencePanel";

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
        theme === "dark" ? "bg-slate-900" : "bg-gradient-to-br from-slate-50 to-purple-50"
      }`}>
        <div className="max-w-7xl mx-auto p-6">
          <div className="mb-6">
            <h1 className={`text-3xl font-bold mb-2 flex items-center gap-3 ${
              theme === "dark" ? "text-white" : "text-slate-800"
            }`}>
              <TrendingUp className="w-8 h-8 text-indigo-500" />
              Dashboard
            </h1>
            <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              Welcome back, <span className="text-indigo-500 font-semibold">{user.username}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              title="Platform Uploads (24h)"
              value={data?.stats.platformLast24h || 0}
              icon={<Globe size={20} />}
              color="from-cyan-500 to-blue-500"
              theme={theme}
            />
            <StatCard
              title={`${user.agency.toUpperCase()} Uploads (24h)`}
              value={data?.stats.last24h || 0}
              icon={<Building2 size={20} />}
              color="from-emerald-500 to-teal-500"
              theme={theme}
            />
            <StatCard
              title="My Uploads"
              value={data?.myDocs.length || 0}
              icon={<Users size={20} />}
              color="from-purple-500 to-fuchsia-500"
              theme={theme}
            />
            <StatCard
              title="Agency Members"
              value={data?.stats.totalMembers || 0}
              icon={<UserCheck size={20} />}
              color="from-amber-500 to-orange-500"
              theme={theme}
            />
          </div>

          <div className="space-y-5">
            <EventIntelligencePanel />

            <OperationalReportPanel token={token} agency={user.agency} />

            <ApprovalPanel />

            {loading && <p className={`text-center py-8 ${
            theme === "dark" ? "text-slate-400" : "text-slate-600"
          }`}>Loading dashboard…</p>}

            {data && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-5">
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

import { Upload, Users, Building2, Globe, UserCheck, TrendingUp } from "lucide-react";

function StatCard({ title, value, color, icon, theme }) {
  return (
    <div className={`backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 transform hover:scale-105 hover:shadow-xl animate-fade-in ${
      theme === "dark"
        ? "bg-slate-800/50 border-slate-700/50 hover:border-indigo-500/50 shadow-lg"
        : "bg-white/90 border-purple-200 hover:border-purple-400 shadow-md"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-lg bg-gradient-to-br ${color} shadow-md`}>
          <div className="text-white">
            {icon}
          </div>
        </div>
      </div>
      <p className={`text-xs mb-1 font-medium ${
        theme === "dark" ? "text-slate-400" : "text-slate-600"
      }`}>{title}</p>
      <p className={`text-2xl font-bold ${
        theme === "dark" ? "text-white" : "text-slate-800"
      }`}>{value}</p>
    </div>
  );
}

function Section({ title, children }) {
  const { theme } = useTheme();
  return (
    <section className={`backdrop-blur-sm border rounded-xl p-5 transition-all duration-300 hover:shadow-xl ${
      theme === "dark"
        ? "bg-slate-800/50 border-slate-700/50 shadow-lg"
        : "bg-white/90 border-purple-200 shadow-md"
    }`}>
      <h2 className={`text-base font-semibold mb-3 flex items-center gap-2 ${
        theme === "dark" ? "text-white" : "text-slate-800"
      }`}>
        <Upload className="w-4 h-4 text-indigo-500" />
        {title}
      </h2>
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
        {visibleDocs.map((d, index) => (
          <li
            key={d._id}
            className={`border p-3.5 rounded-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md ${
              theme === "dark"
                ? "bg-slate-900/50 border-slate-700/50 hover:border-indigo-500/50"
                : "bg-gradient-to-r from-purple-50/50 to-indigo-50/50 border-purple-200 hover:border-purple-400"
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <p className={`font-medium truncate text-sm ${
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
          className={`mt-3 text-sm transition-all duration-300 font-medium hover:translate-x-1 ${
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
