export function Card({ className = "", children }) {
  return (
    <div
      className={`
        rounded-2xl border border-slate-400 dark:border-white/10
        bg-white/90 dark:bg-card/60
        backdrop-blur-xl
        shadow-[0_20px_60px_rgba(0,0,0,0.25)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}
