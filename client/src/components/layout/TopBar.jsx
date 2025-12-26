import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";

export default function TopBar() {
  const { user } = useAuth();

  return (
    <header className="h-14 sticky top-0 z-50 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6 text-white">
      <Link to="/">
      <div className="font-bold text-lg tracking-wide">
        KHOJ <span className="text-blue-400">AI</span>
      </div>
      </Link>

      {user ? (
        <div className="text-sm text-gray-300">
          {user.username} ·{" "}
          <span className="text-blue-400 uppercase">
            {user.agency}
          </span>
        </div>
      ) : (
        <div className="text-sm text-gray-400">
          Secure Intelligence Platform
        </div>
      )}
    </header>
  );
}
