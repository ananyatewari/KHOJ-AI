import {
  Zap,
  ShieldCheck,
  Brain,
  Lock,
} from "lucide-react";
import { motion } from "framer-motion";

const cards = [
  {
    icon: <Zap />,
    title: "Accelerated Investigations",
    desc: "Officers find relevant intelligence in seconds instead of hours or days using semantic search.",
    color: "from-blue-500/40 to-indigo-600/40",
  },
  {
    icon: <Brain />,
    title: "Analyst-Grade AI",
    desc: "Automatic entity extraction, correlation, and summaries built for real investigations.",
    color: "from-purple-500/40 to-fuchsia-600/40",
  },
  {
    icon: <ShieldCheck />,
    title: "Stronger National Security",
    desc: "Faster pattern detection enables quicker threat response across agencies.",
    color: "from-emerald-500/40 to-teal-600/40",
  },
  {
    icon: <Lock />,
    title: "Secure by Design",
    desc: "Strict role-based access control, audit logs, and document-level permissions.",
    color: "from-sky-500/40 to-blue-700/40",
  },
];

export default function Impact() {
  return (
    <section className="max-w-6xl mx-auto py-24 px-8">
      <h3 className="text-3xl font-bold text-center mb-14">
        Real-World <span className="text-indigo-400">Impact</span>
      </h3>

      <div className="space-y-10">
        {cards.map((c, idx) => {
          const isLeft = idx % 2 === 0;

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: isLeft ? -60 : 60 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, margin: "-100px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`flex ${isLeft ? "justify-start" : "justify-end"}`}
            >
              <div className="relative group w-full md:w-[60%]">
                {/* Glow */}
                <div
                  className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition bg-gradient-to-br ${c.color}`}
                />

                {/* Card */}
                <div
                  className="
                    relative
                    bg-slate-950/85
                    border border-white/10
                    backdrop-blur-xl
                    rounded-2xl
                    p-6
                    shadow-[0_20px_60px_rgba(0,0,0,0.75)]
                    hover:border-indigo-400/40
                    transition
                  "
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-indigo-400">{c.icon}</div>
                    <h4 className="text-lg font-semibold">{c.title}</h4>
                  </div>

                  <p className="text-slate-300 text-sm leading-relaxed">
                    {c.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
