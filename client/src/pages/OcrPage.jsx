import DocumentUploader from "../components/document/DocumentUploader";
import { useTheme } from "../context/ThemeContext";
import { Scan, Sparkles, FileImage, Zap } from "lucide-react";

export default function OcrPage() {
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
                ? "bg-gradient-to-br from-indigo-600 to-purple-600"
                : "bg-gradient-to-br from-indigo-500 to-purple-500"
            } shadow-md`}>
              <Scan className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl font-bold ${
                theme === "dark" ? "text-white" : "text-slate-800"
              }`}>
                Intelligent Image OCR
              </h1>
              <p className={`text-sm mt-0.5 ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}>
                Extract text, identify entities, and generate AI-powered insights from images
              </p>
            </div>
          </div>
          
          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
              theme === "dark"
                ? "bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
            }`}>
              <Sparkles className="w-3 h-3" />
              AI-Powered Analysis
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
              theme === "dark"
                ? "bg-purple-500/10 text-purple-300 border border-purple-500/20"
                : "bg-purple-50 text-purple-700 border border-purple-200"
            }`}>
              <FileImage className="w-3 h-3" />
              Multi-Image Support
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
              theme === "dark"
                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                : "bg-amber-50 text-amber-700 border border-amber-200"
            }`}>
              <Zap className="w-3 h-3" />
              Instant Extraction
            </div>
          </div>
        </div>

        {/* Main Content */}
        <DocumentUploader />
      </div>
    </div>
  );
}