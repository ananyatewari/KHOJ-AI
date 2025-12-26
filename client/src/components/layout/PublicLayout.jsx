import TopBar from "./TopBar";

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <TopBar />
      <main className="relative flex items-center justify-center min-h-[calc(100vh-56px)]">
        {children}
      </main>
    </div>
  );
}

