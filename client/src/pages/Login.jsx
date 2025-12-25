import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    const res = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    // save user + token
    login(data);

    // ✅ correct route
    navigate("/app/dashboard");
  };

  return (
    <div className="w-full max-w-sm bg-slate-950 p-6 rounded-xl shadow-lg border border-slate-800">
      <h2 className="text-2xl font-bold mb-2">Welcome to KHOJ AI</h2>
      <p className="text-sm text-gray-400 mb-6">
        Secure intelligence access
      </p>

      {error && (
        <p className="text-red-400 text-sm mb-3">{error}</p>
      )}

      <form onSubmit={handleSubmit}>
        <input
          placeholder="Username"
          className="w-full p-3 mb-3 bg-slate-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 mb-5 bg-slate-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="bg-blue-600 w-full py-2 rounded font-semibold hover:bg-blue-700"
        >
          Login
        </button>
      </form>

      <p className="text-sm mt-4 text-gray-400 text-center">
        No account?{" "}
        <Link to="/signup" className="text-blue-400">
          Sign up
        </Link>
      </p>
    </div>
  );
}
