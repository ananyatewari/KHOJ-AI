import SideBar from "./SideBar";
import TopBar from "./TopBar";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Top Bar */}
      <TopBar />

      <div className="flex">
        {/* Sidebar */}
        <SideBar />

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
