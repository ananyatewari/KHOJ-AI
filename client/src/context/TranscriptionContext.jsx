import { createContext, useContext, useState } from "react";

const TranscriptionContext = createContext(null);

export function TranscriptionProvider({ children }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [transcriptions, setTranscriptions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");

  const clearWorkspace = () => {
    setSelectedFiles([]);
    setTranscriptions([]);
    setSummary(null);
    setAnalysisMessage("");
    setSummaryLoading(false);
    setUploading(false);
  };

  return (
    <TranscriptionContext.Provider
      value={{
        selectedFiles,
        setSelectedFiles,
        transcriptions,
        setTranscriptions,
        summary,
        setSummary,
        summaryLoading,
        setSummaryLoading,
        uploading,
        setUploading,
        analysisMessage,
        setAnalysisMessage,
        clearWorkspace,
      }}
    >
      {children}
    </TranscriptionContext.Provider>
  );
}

export const useTranscriptionWorkspace = () => {
  const context = useContext(TranscriptionContext);
  if (!context) {
    throw new Error(
      "useTranscriptionWorkspace must be used within a TranscriptionProvider"
    );
  }
  return context;
};
