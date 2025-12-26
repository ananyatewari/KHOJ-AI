import { Upload, Cpu, Search, FileSearch, BarChart } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: <Upload />,
    title: "Upload Intelligence",
    desc: "Upload PDFs, FIRs, logs, images, or reports from multiple agencies.",
  },
  {
    icon: <Cpu />,
    title: "AI Processing",
    desc: "System extracts, indexes, and embeds data using OCR, NLP, and vector search.",
  },
  {
    icon: <Search />,
    title: "Search & Discover",
    desc: "Search semantically across agencies using natural language queries.",
  },
  {
    icon: <FileSearch />,
    title: "Entity Highlighting",
    desc: "Names, locations, phones, and links are automatically highlighted.",
  },
  {
    icon: <BarChart />,
    title: "Operational Insights",
    desc: "View real-time ingestion dashboards and unified intelligence summaries.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-28 bg-black/40">
      <h3 className="text-3xl font-bold text-center mb-16">
        How It <span className="text-indigo-400">Works</span>
      </h3>

      <div className="max-w-6xl mx-auto px-8 grid md:grid-cols-5 gap-6">
        {steps.map((s, i) => (
          <motion.div
            key={i}
  initial={{ opacity: 0, y: 60 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: false }}
  transition={{ duration: 0.2, delay: i * 0.2 }}
            className="
              relative
              bg-slate-950/80
              border border-white/10
              backdrop-blur-xl
              rounded-2xl
              p-6
              text-center
              hover:scale-[1.03]
              transition
            "
          >

            <div className="absolute -top-4 left-4 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
              {i + 1}
            </div>

            <div className="text-indigo-400 mb-4">{s.icon}</div>
            <h4 className="font-semibold mb-2">{s.title}</h4>
            <p className="text-slate-300 text-sm">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
