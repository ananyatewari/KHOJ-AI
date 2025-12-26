import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchDashboard } from "../context/dashboardApi";
import OperationalReportPanel from "../components/dashboard/OperationalReportPanel";

export default function Dashboard() {
  const { user, token } = useAuth();
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
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      from: from.toISOString(),
      to: now.toISOString()
    })
  });

  const data = await res.json();
  setReport(data);
  setReportLoading(false);
};

const downloadOperationalReport = async (report) => {
  const res = await fetch("http://localhost:3000/api/report/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report })
  });

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "operational-report.txt";
  a.click();
};


  useEffect(() => {
    fetchDashboard(token)
      .then(setData)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
    <div className="
  p-8
  bg-gradient-to-br
  from-indigo-950/40
  via-slate-900/60
  to-emerald-950/30
">

  <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
  <p className="text-slate-400 mb-8">
    Logged in as <b>{user.username}</b> · {user.agency.toUpperCase()}
  </p>

  <div className="grid grid-cols-3 gap-6 mb-12">
  <StatCard
    title="Uploads (24h)"
    value={data?.stats.last24h || 0}
    icon={<Upload size={28} />}
    color="from-indigo-500/60 to-blue-500/60"
  />
  <StatCard
    title="My Uploads"
    value={data?.myDocs.length || 0}
    icon={<Users size={28} />}
    color="from-purple-500/60 to-fuchsia-500/60"
  />
  <StatCard
    title={`${user.agency.toUpperCase()} Uploads`}
    value={data?.agencyDocs.length || 0}
    icon={<Building2 size={28} />}
    color="from-emerald-500/60 to-teal-500/60"
  />
</div>

<OperationalReportPanel
  token={token}
  agency={user.agency}
/>

  {loading && <p className="text-slate-400">Loading dashboard…</p>}

  {data && (
    <div className="grid grid-cols-2 gap-10">
      <Section title="My Uploads">
        <List docs={data.myDocs} showUser={false} />
      </Section>

      <Section title={`${user.agency.toUpperCase()} Uploads`}>
        <List docs={data.agencyDocs} showUser />
      </Section>
    </div>
  )}
  </div>
</>

  );
}

import { Upload, Users, Building2 } from "lucide-react";

function StatCard({ title, value, color, icon }) {
  return (
    <div
      className={`
        bg-gradient-to-br ${color}
        border border-white/20
        p-5 rounded-2xl
        shadow-[0_15px_60px_rgba(0,0,0,0.35)]
        flex items-center justify-between
      `}
    >
      <div>
        <p className="text-sm text-white/80 mb-1">{title}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
      <div className="text-white/80">
        {icon}
      </div>
    </div>
  );
}


function Section({ title, children }) {
  return (
    <section className="bg-slate-950/50 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      {children}
    </section>
  );
}

function List({ docs, showUser }) {
  const [visible, setVisible] = useState(10);

  const visibleDocs = docs.slice(0, visible);

  if (!docs.length)
    return <p className="text-sm text-slate-400">No documents</p>;

  return (
    <>
      <ul className="space-y-3 max-h-[420px] overflow-auto pr-2">
        {visibleDocs.map((d) => (
          <li
            key={d._id}
            className="
              bg-slate-900/60
              border border-white/10
              p-4 rounded-xl
              flex justify-between
            "
          >
            <div>
              <p className="font-medium text-white">{d.filename}</p>
              {showUser && (
                <p className="text-xs text-slate-400">
                  Uploaded by: {d.uploadedBy}
                </p>
              )}
            </div>

            <span className="text-xs text-slate-500">
              {new Date(d.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>

      {visible < docs.length && (
        <button
          onClick={() => setVisible(v => v + 10)}
          className="
            mt-4 text-sm
            text-indigo-400
            hover:text-indigo-300
            transition
          "
        >
          Read more →
        </button>
      )}
    </>
  );
}

