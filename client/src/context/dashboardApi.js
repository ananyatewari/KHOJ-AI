export async function fetchDashboard(token) {
  const res = await fetch("http://localhost:3000/api/dashboard", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error("Failed to load dashboard");
  return res.json();
}
