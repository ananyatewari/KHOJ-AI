import { Shield, Brain, Network } from "lucide-react";
import { motion } from "framer-motion";

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
  return (
    <section className="bg-gray-900 py-20">
      <div className="max-w-6xl mx-auto px-8">
        <h3 className="text-3xl font-bold mb-10 text-center text-white">
          Who It’s <span className="text-indigo-400">For</span>
        </h3>

        <div className="grid md:grid-cols-[60px_1fr] gap-10">
          {/* LEFT TIMELINE */}
          <div className="relative flex flex-col items-center">
            <div className="absolute h-full w-[2px] bg-white/15" />
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
                className="
                  bg-black/40
                  border border-white/10
                  rounded-xl
                  p-6
                  shadow-[0_20px_60px_rgba(0,0,0,0.7)]
                  hover:border-indigo-400/40
                  transition
                "
              >
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-r ${u.color} flex items-center justify-center mb-3`}
                >
                  {u.icon}
                </div>

                <h4 className="text-lg font-semibold mb-1 text-white">
                  {u.title}
                </h4>
                <p className="text-slate-300 text-sm">
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
