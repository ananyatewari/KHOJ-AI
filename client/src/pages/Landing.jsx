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
} from "lucide-react";
import BackgroundGradient from "../components/BackgroundCanvas"

// NEW SECTIONS
import WhoItsFor from "../components/WhoItsFor";
import HowItWorks from "../components/HowItWorks";
import Impact from "../components/Impact";

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      {/* ===== STATIC GRADIENT BACKGROUND ===== */}
      <BackgroundGradient />
      {/* ===== STATIC GRADIENT BACKGROUND ===== */}
<div
  className="
    fixed inset-0 -z-10
    bg-black
    bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.55),transparent_45%),
        radial-gradient(circle_at_80%_25%,rgba(59,130,246,0.55),transparent_45%),
        radial-gradient(circle_at_50%_75%,rgba(16,185,129,0.45),transparent_55%)]
  "
/>


      {/* ===== NAVBAR ===== */}
      <nav className="flex justify-between items-center px-8 py-5 border-b border-white/10 backdrop-blur-xl w-full bg-black/30">
        <h1 className="text-xl font-bold tracking-wide">
          KHOJ<span className="text-indigo-400">AI</span>
        </h1>

        <Link
          to="/signup"
          className="px-4 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 transition"
        >
          Join Us
        </Link>
      </nav>
      {/* BADGE */}
<div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full
  bg-gradient-to-r from-purple-500/20 via-fuchsia-500/20 to-indigo-500/20
  border border-white/10
  backdrop-blur
  shadow-[0_0_20px_rgba(168,85,247,0.35)]
  absolute top-40 left-160
">
  <span className="text-m font-semibold tracking-wide text-indigo-300">
    🚀 Built for SHIELD 1.0
  </span>
</div>

      {/* ===== HERO ===== */}
      <section className="max-w-6xl mx-auto mt-34 mb-40 grid md:grid-cols-2 gap-14 items-center bg-slate-950/80 border border-white/10 backdrop-blur-2xl rounded-3xl p-12 shadow-[0_40px_140px_rgba(0,0,0,0.85)]">
        <div>
          <h2 className="text-4xl font-extrabold leading-tight mb-6">
            AI-Powered Intelligence <br /> for Law Enforcement
          </h2>

          <p className="text-slate-300 mb-10 text-lg">
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
              className="px-6 py-3 rounded-md border border-white/20 hover:bg-white/10"
            >
              Login
            </Link>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-white/10 backdrop-blur-2xl rounded-2xl p-6 space-y-4">
          <FeatureItem icon={<FileText size={18} />} text="PDFs, FIRs, logs & reports ingestion" />
          <FeatureItem icon={<Search size={18} />} text="Keyword + semantic intelligence search" />
          <FeatureItem icon={<Brain size={18} />} text="AI-generated summaries & insights" />
          <FeatureItem icon={<Tag size={18} />} text="Automatic entity extraction" />
          <FeatureItem icon={<ShieldCheck size={18} />} text="Role-based secure access" />
          <FeatureItem icon={<Activity size={18} />} text="Real-time ingestion monitoring" />
        </div>
      </section>

      {/* ===== NEW INTERACTIVE SECTIONS ===== */}
      <WhoItsFor />
      <HowItWorks />
      <Impact />

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-white/10 backdrop-blur-xl py-12 text-center text-slate-400 text-sm">
        © {new Date().getFullYear()} KHOJ AI · Secure Intelligence Platform
      </footer>
    </div>
  );
}

/* ===== SMALL HELPERS ===== */

function FeatureItem({ icon, text }) {
  return (
    <div className="flex items-center gap-3 text-slate-300">
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
