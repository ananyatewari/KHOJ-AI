import AudioUploader from "../components/transcription/AudioUploader";
import { TranscriptionProvider } from "../context/TranscriptionContext";
import { useTheme } from "../context/ThemeContext";

export default function TranscriptionPage() {
  const { theme } = useTheme();
  
  return (
    <TranscriptionProvider>
      <div className="max-w-4xl mx-auto p-8">
        <AudioUploader />
      </div>
    </TranscriptionProvider>
  );
}
