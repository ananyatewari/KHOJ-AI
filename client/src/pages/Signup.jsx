import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { User, Lock, Building2, Sun, Moon, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import BackgroundCanvas from "../components/BackgroundCanvas";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [agency, setAgency] = useState("police");
  const { theme, toggleTheme } = useTheme();
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
    <div className={`relative w-full min-h-screen flex items-center justify-center overflow-hidden transition-colors duration-300 ${
      theme === "dark" ? "text-white" : "text-slate-900"
    }`}>
      {/* ===== BACK TO HOME BUTTON ===== */}
      <Link
        to="/"
        className={`fixed top-6 left-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 ${
          theme === "dark"
            ? "bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 text-white"
            : "bg-white hover:bg-purple-50 border border-purple-200 shadow-lg text-slate-900"
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back to Home</span>
      </Link>

      {/* ===== THEME TOGGLE BUTTON ===== */}
      <button
        onClick={toggleTheme}
        className={`fixed top-6 right-6 z-50 p-3 rounded-lg transition-all duration-200 ${
          theme === "dark"
            ? "bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700"
            : "bg-white hover:bg-purple-50 border border-purple-200 shadow-lg"
        }`}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun className="w-5 h-5 text-yellow-400" />
        ) : (
          <Moon className="w-5 h-5 text-indigo-600" />
        )}
      </button>

      {/* ===== BACKGROUND ===== */}
      <BackgroundCanvas></BackgroundCanvas>
      <div className={`absolute inset-0 h-full transition-colors duration-300 ${
        theme === "dark" ? "bg-black" : "bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50"
      }`}>
        <div
          className={`absolute inset-0 ${
            theme === "dark"
              ? "bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.55),transparent_45%),radial-gradient(circle_at_80%_25%,rgba(59,130,246,0.55),transparent_45%),radial-gradient(circle_at_50%_75%,rgba(16,185,129,0.45),transparent_55%)]"
              : "bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.08),transparent_50%),radial-gradient(circle_at_70%_60%,rgba(59,130,246,0.08),transparent_50%),radial-gradient(circle_at_40%_80%,rgba(236,72,153,0.06),transparent_50%)]"
          }`}
        />
        {theme === "dark" && (
          <>
            <div className="absolute w-102 h-102 bg-purple-500/20 rounded-full blur-3xl top-0 left-150 animate-pulse" />
            <div className="absolute w-92 h-72 bg-purple-500/20 rounded-full blur-3xl bottom-0 left-0 animate-pulse" />
            <div className="absolute w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl bottom-10 right-10 animate-pulse delay-300" />
          </>
        )}
      </div>

      {/* ===== SIGNUP CARD ===== */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        whileHover={{ scale: 1.01 }}
        className={`
          relative z-10
          w-full max-w-sm
          backdrop-blur-2xl
          p-8
          rounded-2xl
          h-full
          transition-colors duration-300
          ${
            theme === "dark"
              ? "bg-slate-950/80 border border-white/10 shadow-[0_40px_140px_rgba(0,0,0,0.85)]"
              : "bg-white/90 border border-purple-200/50 shadow-[0_20px_80px_rgba(139,92,246,0.2)]"
          }
        `}
      >
        <h2 className={`text-2xl font-bold mb-1 text-center transition-colors duration-300 ${
          theme === "dark" ? "text-white" : "text-slate-900"
        }`}>
          Create Account
        </h2>
        <p className={`text-sm mb-6 text-center transition-colors duration-300 ${
          theme === "dark" ? "text-slate-400" : "text-slate-600"
        }`}>
          Register for secure access
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* USERNAME */}
          <div className="relative">
            <User className="absolute left-3 top-3.5 text-slate-400 w-5 h-5" />
            <input
              placeholder="Username"
              className={`
                w-full pl-10 pr-3 py-3 rounded-lg
                border
                focus:outline-none focus:ring-2 focus:ring-indigo-500
                transition-colors duration-300
                ${
                  theme === "dark"
                    ? "bg-slate-900/70 border-white/10 text-white placeholder:text-slate-500"
                    : "bg-white border-purple-200 text-slate-900 placeholder:text-slate-400"
                }
              `}
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
              className={`
                w-full pl-10 pr-3 py-3 rounded-lg
                border
                focus:outline-none focus:ring-2 focus:ring-indigo-500
                transition-colors duration-300
                ${
                  theme === "dark"
                    ? "bg-slate-900/70 border-white/10 text-white placeholder:text-slate-500"
                    : "bg-white border-purple-200 text-slate-900 placeholder:text-slate-400"
                }
              `}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* AGENCY */}
          <div className="relative">
            <Building2 className="absolute left-3 top-3.5 text-slate-400 w-5 h-5 z-10" />
            <select
              className={`
                w-full pl-10 pr-8 py-3 rounded-lg
                border
                focus:outline-none focus:ring-2 focus:ring-indigo-500
                appearance-none
                transition-colors duration-300
                cursor-pointer
                font-medium
                ${
                  theme === "dark"
                    ? "bg-slate-900/70 border-white/10 text-white [&>option]:bg-slate-900 [&>option]:text-white [&>option]:py-2"
                    : "bg-white border-purple-200 text-slate-900 [&>option]:bg-white [&>option]:text-slate-900 [&>option]:py-2"
                }
              `}
              value={agency}
              onChange={(e) => setAgency(e.target.value)}
            >
              <option value="police">Police - Indian Police Service</option>
              <option value="cbi">CBI - Central Bureau of Investigation</option>
              <option value="ncb">NCB - Narcotics Control Bureau</option>
              <option value="ed">ED - Enforcement Directorate</option>
              <option value="nia">NIA - National Investigation Agency</option>
              <option value="ats">ATS - Anti-Terrorism Squad</option>
              <option value="raw">RAW - Research and Analysis Wing</option>
              <option value="ib">IB - Intelligence Bureau</option>
              <option value="crpf">CRPF - Central Reserve Police Force</option>
              <option value="bsf">BSF - Border Security Force</option>
              <option value="cisf">CISF - Central Industrial Security Force</option>
              <option value="itbp">ITBP - Indo-Tibetan Border Police</option>
              <option value="ssb">SSB - Sashastra Seema Bal</option>
              <option value="nsg">NSG - National Security Guard</option>
            </select>
            {/* Custom dropdown arrow */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className={`w-5 h-5 ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
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

        <p className={`text-sm mt-6 text-center transition-colors duration-300 ${
          theme === "dark" ? "text-slate-400" : "text-slate-600"
        }`}>
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-400 hover:underline">
            Login
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
