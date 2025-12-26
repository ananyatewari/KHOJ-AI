import AudioUploader from "../components/transcription/AudioUploader";
import { TranscriptionProvider } from "../context/TranscriptionContext";

export default function TranscriptionPage() {
  return (
    <TranscriptionProvider>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Audio Transcription</h1>
        <p className="text-gray-400 mb-8">
          Upload audio files to transcribe, extract entities, and get actionable
          insights including key points, decisions, and action items.
        </p>

        <AudioUploader />
      </div>
    </TranscriptionProvider>
  );
}
