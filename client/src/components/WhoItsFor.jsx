import { Shield, Brain, Network } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

const users = [
  {
    icon: <Shield />,
    title: "Field Officers",
    desc: "Quickly search FIRs, reports, and logs to find relevant intelligence in seconds instead of hours.",
    color: "from-blue-500 to-indigo-500",
  },
  {
    icon: <Brain />,
    title: "Intelligence Analysts",
    desc: "Analyze patterns, entities, and correlations across massive unstructured datasets using AI.",
    color: "from-purple-500 to-fuchsia-500",
  },
  {
    icon: <Network />,
    title: "Multi-Agency Units",
    desc: "Collaborate securely across departments with role-based access and full audit trails.",
    color: "from-emerald-500 to-teal-500",
  },
];

export default function WhoItsFor() {
  const { theme } = useTheme();
  
  return (
    <section className={`py-20 transition-colors duration-300 relative ${
      theme === "dark" ? "bg-gray-900" : "bg-gradient-to-b from-purple-50/80 via-indigo-50/50 to-pink-50/30"
    }`}>
      <div className="max-w-6xl mx-auto px-8">
        <h3 className={`text-3xl font-bold mb-10 text-center transition-colors duration-300 ${
          theme === "dark" ? "text-white" : "text-slate-900"
        }`}>
          Who It's <span className="text-indigo-400">For</span>
        </h3>

        <div className="grid md:grid-cols-[60px_1fr] gap-10">
          {/* LEFT TIMELINE */}
          <div className="relative flex flex-col items-center">
            <div className={`absolute h-full w-[2px] transition-colors duration-300 ${
              theme === "dark" ? "bg-white/15" : "bg-purple-300"
            }`} />
            {users.map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 mb-30 rounded-full bg-indigo-400 my-12 z-10"
              />
            ))}
          </div>

          {/* RIGHT CONTENT */}
          <div className="space-y-10">
            {users.map((u, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false }}
                transition={{ duration: 0.5 }}
                className={`
                  rounded-xl
                  p-6
                  transition-all duration-300
                  ${
                    theme === "dark"
                      ? "bg-black/40 border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.7)] hover:border-indigo-400/40"
                      : "bg-gradient-to-br from-white/95 to-purple-50/70 border border-purple-200/60 shadow-lg hover:border-indigo-400 hover:shadow-xl backdrop-blur-sm"
                  }
                `}
              >
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-r ${u.color} flex items-center justify-center mb-3`}
                >
                  {u.icon}
                </div>

                <h4 className={`text-lg font-semibold mb-1 transition-colors duration-300 ${
                  theme === "dark" ? "text-white" : "text-slate-900"
                }`}>
                  {u.title}
                </h4>
                <p className={`text-sm transition-colors duration-300 ${
                  theme === "dark" ? "text-slate-300" : "text-slate-600"
                }`}>
                  {u.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
