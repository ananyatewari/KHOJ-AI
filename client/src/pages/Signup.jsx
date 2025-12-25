import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [agency, setAgency] = useState("police");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, agency }),
    });

    if (!res.ok) {
      alert("Signup failed");
      return;
    }

    navigate("/login");
  };

  return (
  <div className="w-full max-w-sm bg-slate-950 p-6 rounded-xl shadow-lg border border-slate-800">
    <h2 className="text-2xl font-bold mb-2">Create Account</h2>
    <p className="text-sm text-gray-400 mb-6">
      Register for secure access
    </p>

    <input
      placeholder="Username"
      className="w-full p-3 mb-3 bg-slate-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={username}
      onChange={(e) => setUsername(e.target.value)}
    />

    <input
      type="password"
      placeholder="Password"
      className="w-full p-3 mb-3 bg-slate-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />

    <select
      className="w-full p-3 mb-5 bg-slate-800 rounded focus:outline-none"
      value={agency}
      onChange={(e) => setAgency(e.target.value)}
    >
      <option value="police">Police</option>
      <option value="ncb">NCB</option>
      <option value="ed">ED</option>
      <option value="ats">ATS</option>
    </select>

    <button className="bg-green-600 w-full py-2 rounded font-semibold hover:bg-green-700">
      Create Account
    </button>

    <p className="text-sm mt-4 text-gray-400 text-center">
      Already have an account?{" "}
      <a href="/login" className="text-blue-400">
        Login
      </a>
    </p>
  </div>
);

}
