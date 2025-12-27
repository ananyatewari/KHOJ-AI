import DocumentUploader from "../components/document/DocumentUploader";
import { useTheme } from "../context/ThemeContext";

export default function OcrPage() {
  const { theme } = useTheme();
  
  return (
    <div className="max-w-3xl mx-auto p-8">
      <DocumentUploader />
    </div>
  );
}