import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Lock, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import BackgroundCanvas from "../components/BackgroundCanvas";

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
    <div className="relative w-full min-h-screen flex items-center justify-center text-white overflow-hidden">
      {/* ===== BACKGROUND ===== */}
      <BackgroundCanvas></BackgroundCanvas>
      <div className="absolute inset-0 h-full bg-black">
        <div
          className="
            absolute inset-0
            bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.55),transparent_45%),
                radial-gradient(circle_at_80%_25%,rgba(59,130,246,0.55),transparent_45%),
                radial-gradient(circle_at_50%_75%,rgba(16,185,129,0.45),transparent_55%)]
          "
        />
        <div className="absolute w-102 h-102 bg-purple-500/20 rounded-full blur-3xl top-0 left-150 animate-pulse" />
        <div className="absolute w-92 h-72 bg-purple-500/20 rounded-full blur-3xl bottom-0 left-0 animate-pulse" />
        <div className="absolute w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl bottom-10 right-10 animate-pulse delay-300" />
      </div>

      {/* ===== SIGNUP CARD ===== */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        whileHover={{ scale: 1.01 }}
        className="
          relative z-10
          w-full max-w-sm
          bg-slate-950/80
          backdrop-blur-2xl
          p-8
          rounded-2xl
          border border-white/10
          shadow-[0_40px_140px_rgba(0,0,0,0.85)]
          h-full
        "
      >
        <h2 className="text-2xl font-bold mb-1 text-center">
          Create Account
        </h2>
        <p className="text-sm text-slate-400 mb-6 text-center">
          Register for secure access
        </p>

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
                focus:outline-none focus:ring-2 focus:ring-indigo-500
              "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* AGENCY */}
          <div className="relative">
            <Building2 className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
            <select
              className="
                w-full pl-10 pr-3 py-3 rounded-lg
                bg-slate-900/70
                border border-white/10
                focus:outline-none focus:ring-2 focus:ring-indigo-500
                appearance-none
              "
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
            >
              <option value="police">Police</option>
              <option value="ncb">NCB</option>
              <option value="ed">ED</option>
              <option value="ats">ATS</option>
            </select>
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
            <span className="relative z-10">Create Account</span>

            {/* shine */}
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
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-400 hover:underline">
            Login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
