import { Link } from "react-router-dom";
import {
  FileText,
  Search,
  Brain,
  Tag,
  ShieldCheck,
  Activity,
  Lock,
  Sparkles,
  Workflow,
  AlertTriangle,
  Database,
  Share2,
  Sun,
  Moon,
} from "lucide-react";
import BackgroundGradient from "../components/BackgroundCanvas"
import { useTheme } from "../context/ThemeContext";

// NEW SECTIONS
import WhoItsFor from "../components/WhoItsFor";
import HowItWorks from "../components/HowItWorks";
import Impact from "../components/Impact";

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className={`relative min-h-screen overflow-hidden transition-colors duration-300 ${
      theme === "dark" ? "text-white" : "text-slate-900"
    }`}>
      <BackgroundGradient />
<div
  className={`
    fixed inset-0 -z-10 transition-colors duration-300
    ${
      theme === "dark"
        ? "bg-black bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.55),transparent_45%),radial-gradient(circle_at_80%_25%,rgba(59,130,246,0.55),transparent_45%),radial-gradient(circle_at_50%_75%,rgba(16,185,129,0.45),transparent_55%)]"
        : "bg-gradient-to-br from-indigo-200 via-purple-300 to-pink-500 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.35),transparent_50%),radial-gradient(circle_at_70%_60%,rgba(59,130,246,0.45),transparent_50%),radial-gradient(circle_at_40%_80%,rgba(236,72,153,0.35),transparent_50%)]"
    }
  `}
/>


      <nav className={`flex justify-between items-center px-8 py-5 border-b backdrop-blur-xl w-full transition-colors duration-300 ${
        theme === "dark"
          ? "border-white/10 bg-black/30"
          : "border-purple-200/50 bg-white/70 shadow-sm"
      }`}>
        <h1 className={`text-xl font-bold tracking-wide ${
          theme === "dark" ? "text-white" : "text-slate-900"
        }`}>
          KHOJ<span className="text-indigo-400">AI</span>
        </h1>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-all duration-200 ${
              theme === "dark"
                ? "bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700"
                : "bg-white hover:bg-purple-50 border border-purple-200"
            }`}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-600" />
            )}
          </button>
        </div>
      </nav>
      {/* BADGE */}
<div className={`mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur absolute top-40 left-160 transition-colors duration-300 ${
  theme === "dark"
    ? "bg-gradient-to-r from-purple-500/20 via-fuchsia-500/20 to-indigo-500/20 border border-white/10 shadow-[0_0_20px_rgba(168,85,247,0.35)]"
    : "bg-gradient-to-r from-purple-100 via-fuchsia-100 to-indigo-100 border border-purple-300 shadow-lg"
}`}>
  <span className={`text-m font-semibold tracking-wide ${
    theme === "dark" ? "text-indigo-300" : "text-indigo-700"
  }`}>
    🚀 Built for SHIELD 1.0
  </span>
</div>

      {/* ===== HERO ===== */}
      <section className={`max-w-6xl mx-auto mt-34 mb-40 grid md:grid-cols-2 gap-14 items-center backdrop-blur-2xl rounded-3xl p-12 transition-colors duration-300 ${
        theme === "dark"
          ? "bg-slate-950/80 border border-white/10 shadow-[0_40px_140px_rgba(0,0,0,0.85)]"
          : "bg-gradient-to-br from-white/90 via-purple-50/50 to-indigo-50/50 border border-purple-200/50 shadow-[0_20px_80px_rgba(139,92,246,0.2)]"
      }`}>
        <div>
          <h2 className={`text-4xl font-extrabold leading-tight mb-6 ${
            theme === "dark" ? "text-white" : "text-slate-900"
          }`}>
            AI-Powered Intelligence <br /> for Law Enforcement
          </h2>

          <p className={`mb-10 text-lg ${
            theme === "dark" ? "text-slate-300" : "text-slate-600"
          }`}>
            KHOJ AI enables agencies to ingest, analyze, and search massive volumes
            of unstructured intelligence data — securely and instantly.
          </p>

          <div className="flex gap-4">
            <Link
  to="/signup"
  className="
    relative inline-flex items-center justify-center
    px-7 py-3 rounded-xl
    font-semibold text-white
    bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600
    shadow-[0_10px_40px_rgba(168,85,247,0.45)]
    hover:shadow-[0_15px_60px_rgba(168,85,247,0.65)]
    transition-all duration-300
    overflow-hidden
  "
>
  <span className="relative z-10">Get Started</span>

  {/* subtle shine */}
  <span
    className="
      absolute inset-0
      bg-gradient-to-r from-transparent via-white/20 to-transparent
      translate-x-[-100%]
      hover:translate-x-[100%]
      transition-transform duration-700
    "
  />
</Link>

            <Link
              to="/login"
              className={`px-6 py-3 rounded-md border transition-colors duration-200 ${
                theme === "dark"
                  ? "border-white/20 hover:bg-white/10 text-white"
                  : "border-purple-300 hover:bg-purple-50 text-slate-900"
              }`}
            >
              Login
            </Link>
          </div>
        </div>

        <div className={`backdrop-blur-2xl rounded-2xl p-6 space-y-4 border transition-colors duration-300 ${
          theme === "dark"
            ? "bg-slate-900/70 border-white/10"
            : "bg-gradient-to-br from-white/80 to-purple-50/60 border-purple-200/50 shadow-lg"
        }`}>
          <FeatureItem icon={<FileText size={18} />} text="PDFs, FIRs, logs & reports ingestion" theme={theme} />
          <FeatureItem icon={<Search size={18} />} text="Keyword + semantic intelligence search" theme={theme} />
          <FeatureItem icon={<Brain size={18} />} text="AI-generated summaries & insights" theme={theme} />
          <FeatureItem icon={<Tag size={18} />} text="Automatic entity extraction" theme={theme} />
          <FeatureItem icon={<ShieldCheck size={18} />} text="Role-based secure access" theme={theme} />
          <FeatureItem icon={<Activity size={18} />} text="Real-time ingestion monitoring" theme={theme} />
        </div>
      </section>

      {/* ===== NEW INTERACTIVE SECTIONS ===== */}
      <WhoItsFor />
      <HowItWorks />
      <Impact />

      {/* ===== FOOTER ===== */}
      <footer className={`border-t backdrop-blur-xl py-12 text-center text-sm transition-colors duration-300 ${
        theme === "dark"
          ? "border-white/10 text-slate-400"
          : "border-purple-200 text-slate-600"
      }`}>
        © {new Date().getFullYear()} KHOJ AI · Secure Intelligence Platform
      </footer>
    </div>
  );
}

/* ===== SMALL HELPERS ===== */

function FeatureItem({ icon, text, theme }) {
  return (
    <div className={`flex items-center gap-3 transition-colors duration-300 ${
      theme === "dark" ? "text-slate-300" : "text-slate-700"
    }`}>
      <span className="text-indigo-400">{icon}</span>
      {text}
    </div>
  );
}

function GlowCard({ icon, title, desc, color }) {
  const colors = {
    blue: "from-blue-500/40 to-blue-700/40",
    purple: "from-purple-500/40 to-purple-700/40",
    emerald: "from-emerald-500/40 to-emerald-700/40",
  };

  return (
    <div className="relative group">
      <div
        className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition bg-gradient-to-br ${colors[color]}`}
      />
      <div className="relative bg-slate-950/80 border border-white/10 rounded-3xl p-7 backdrop-blur-xl">
        <div className="mb-4 text-indigo-400">{icon}</div>
        <h4 className="font-semibold mb-2">{title}</h4>
        <p className="text-slate-300 text-sm">{desc}</p>
      </div>
    </div>
  );
}

function SectionWrapper({ children, variant = "default" }) {
  const variants = {
    default: "bg-black/10",
    soft: "bg-slate-950/40",
    tinted: "bg-gradient-to-b from-indigo-950/30 to-black/60",
    deep: "bg-slate-950/70",
  };

  return (
    <section className={`${variants[variant]} relative`}>
      {children}
    </section>
  );
}
