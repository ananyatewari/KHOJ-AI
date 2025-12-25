import TopBar from "./TopBar";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <TopBar />
      <main className="flex items-center justify-center pt-16">
        {children}
      </main>
    </div>
  );
}
