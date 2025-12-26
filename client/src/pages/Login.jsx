import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { User, Lock } from "lucide-react";
import { motion } from "framer-motion";
import BackgroundCanvas from "../components/BackgroundCanvas";

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

    login(data);
    navigate("/app/dashboard");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center text-white overflow-hidden">
      {/* ===== INTERACTIVE BACKGROUND ===== */}
      <div className="fixed inset-0 bg-black z-4">
        <BackgroundCanvas></BackgroundCanvas>
        {/* gradient layer */}
        <div
          className="
            absolute inset-0
            bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.55),transparent_45%),
                radial-gradient(circle_at_80%_25%,rgba(59,130,246,0.55),transparent_45%),
                radial-gradient(circle_at_50%_75%,rgba(16,185,129,0.45),transparent_55%)]
          "
        />

        {/* floating orbs */}
        <div className="absolute w-102 h-102 bg-purple-500/20 rounded-full blur-3xl top-50 left-250 animate-pulse" />
        <div className="absolute w-72 h-72 bg-purple-500/20 rounded-full blur-3xl top-10 left-10 animate-pulse" />
        <div className="absolute w-screen h-22 bg-indigo-500/20 rounded-full blur-3xl bottom-0 animate-pulse delay-300" />
      </div>

      {/* ===== LOGIN CARD ===== */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        whileHover={{ scale: 1.01 }}
        className="
          w-full max-w-sm
          bg-slate-950/80
          p-8
          rounded-2xl
          border border-white/10 z-10
        "
      >
        <h2 className="text-2xl font-bold mb-1 text-center">
          Welcome to KHOJ AI
        </h2>
        <p className="text-sm text-slate-400 mb-6 text-center">
          Secure intelligence access
        </p>

        {error && (
          <p className="text-red-400 text-sm mb-3 text-center">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* USERNAME */}
          <div className="relative">
            <User className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
            <input
              placeholder="Username"
              className="
                w-full pl-10 pr-3 py-3 rounded-lg
                bg-slate-900/70
                border border-white/10
                focus:outline-none focus:ring-2 focus:ring-indigo-500
                transition
              "
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {/* PASSWORD */}
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
            <input
              type="password"
              placeholder="Password"
              className="
                w-full pl-10 pr-3 py-3 rounded-lg
                bg-slate-900/70
                border border-white/10
                focus:outline-none focus:ring-1 focus:ring-indigo-500
                transition
              "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* GRADIENT BUTTON */}
          <button
            type="submit"
            className="
              relative w-full py-3 rounded-xl
              font-semibold text-white
              bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600
              shadow-[0_10px_40px_rgba(168,85,247,0.45)]
              hover:shadow-[0_15px_60px_rgba(168,85,247,0.65)]
              transition-all duration-300
              overflow-hidden
            "
          >
            <span className="relative">Login</span>

            {/* shine sweep */}
            <span
              className="
                absolute inset-0
                bg-gradient-to-r from-transparent via-white/20 to-transparent
                translate-x-[-100%]
                hover:translate-x-[100%]
                transition-transform duration-700
              "
            />
          </button>
        </form>

        <p className="text-sm mt-6 text-slate-400 text-center">
          No account?{" "}
          <Link to="/signup" className="text-indigo-400 hover:underline">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
