import TopBar from "./TopBar";
import SideBar from "./SideBar";
import { Outlet } from "react-router-dom";
import LiveLogPanel from "../dashboard/LiveLogPanel";
import { useTheme } from "../../context/ThemeContext";

export default function AppLayout() {
  const { theme } = useTheme();
  
  return (
    <div className={`h-screen flex overflow-hidden ${
      theme === "dark" 
        ? "bg-slate-900 text-white" 
        : "bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 text-slate-800"
    }`}>
      {/* Sidebar */}
      <SideBar />

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <TopBar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <LiveLogPanel />

    </div>
  );
}
