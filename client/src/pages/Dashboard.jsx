import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchDashboard } from "../context/dashboardApi";

export default function Dashboard() {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard(token)
      .then(setData)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <>
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>

      <p className="text-gray-400 mb-8">
        Logged in as <b>{user.username}</b> ({user.agency.toUpperCase()})
      </p>

      {/* STAT CARDS */}
      <div className="grid grid-cols-3 gap-6 mb-10">
        <StatCard title="Uploads (24h)" value={data?.stats.last24h || 0} />
        <StatCard title="My Uploads" value={data?.myDocs.length || 0} />
        <StatCard
          title={`${user.agency.toUpperCase()} Uploads`}
          value={data?.agencyDocs.length || 0}
        />
        <StatCard title="Active Agency" value={user.agency.toUpperCase()} />
      </div>

      {loading && <p>Loading dashboard…</p>}

      {data && (
        <div className="grid grid-cols-2 gap-10">
          {/* MY DOCS */}
          <section>
            <h2 className="text-lg font-semibold mb-3">My Uploads</h2>
            <List docs={data.myDocs} showUser={false} />
          </section>

          {/* AGENCY DOCS */}
          <section>
            <h2 className="text-lg font-semibold mb-3">
              {user.agency.toUpperCase()} Uploads
            </h2>
            <List docs={data.agencyDocs} showUser />
          </section>
        </div>
      )}
    </>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="bg-slate-800 border border-slate-700 p-5 rounded-xl hover:border-blue-500 transition">
      <p className="text-sm text-gray-400 mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}


function List({ docs, showUser }) {
  if (!docs.length)
    return <p className="text-sm text-gray-400">No documents</p>;

  return (
    <ul className="space-y-3">
      {docs.map((d) => (
        <li
          key={d._id}
          className="bg-slate-800 border border-slate-700 p-4 rounded-lg flex justify-between"
        >
          <div>
            <p className="font-medium">{d.filename}</p>
            {showUser && (
              <p className="text-xs text-gray-400">
                Uploaded by: {d.uploadedBy}
              </p>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {new Date(d.createdAt).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
