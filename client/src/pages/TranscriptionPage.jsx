import AudioUploader from "../components/transcription/AudioUploader";
import { useTheme } from "../context/ThemeContext";
import { Mic, Sparkles, FileAudio, Brain } from "lucide-react";

export default function TranscriptionPage() {
  const { theme } = useTheme();
  
  return (
    <div className={`min-h-screen ${
      theme === "dark" ? "bg-slate-900" : "bg-gradient-to-br from-slate-50 to-purple-50"
    }`}>
      <div className="max-w-5xl mx-auto p-8">
        {/* Hero Section */}
        <div className={`mb-6 rounded-xl p-5 border ${
          theme === "dark"
            ? "bg-slate-800/30 border-slate-700/50"
            : "bg-white/60 border-purple-200 shadow-sm"
        }`}>
          <div className="flex items-center gap-4 mb-3">
            <div className={`p-2.5 rounded-lg ${
              theme === "dark"
                ? "bg-gradient-to-br from-pink-600 to-rose-600"
                : "bg-gradient-to-br from-pink-500 to-rose-500"
            } shadow-md`}>
              <Mic className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${
                theme === "dark" ? "text-white" : "text-slate-800"
              }`}>
                Audio Transcription & Analysis
              </h1>
              <p className={`text-sm mt-0.5 ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}>
                Transform audio into actionable intelligence with AI-powered analysis
              </p>
            </div>
          </div>
          
          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
              theme === "dark"
                ? "bg-pink-500/10 text-pink-300 border border-pink-500/20"
                : "bg-pink-50 text-pink-700 border border-pink-200"
            }`}>
              <Sparkles className="w-3 h-3" />
              AI Transcription
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
              theme === "dark"
                ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                : "bg-purple-50 text-purple-700 border border-purple-200"
            }`}>
              <FileAudio className="w-3 h-3" />
              Multi-Audio Support
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
              theme === "dark"
                ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
            }`}>
              <Brain className="w-3 h-3" />
              Smart Analysis
            </div>
          </div>
        </div>

        {/* Main Content */}
        <AudioUploader />
      </div>
    </div>
  );
}
