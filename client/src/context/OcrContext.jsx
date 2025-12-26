import { createContext, useContext, useState } from "react";

const OcrContext = createContext(null);

export function OcrProvider({ children }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analysisMessage, setAnalysisMessage] = useState("");

  const clearWorkspace = () => {
    setSelectedFiles([]);
    setDocuments([]);
    setSummary(null);
    setAnalysisMessage("");
    setSummaryLoading(false);
    setUploading(false);
  };

  return (
    <OcrContext.Provider
      value={{
        selectedFiles,
        setSelectedFiles,
        documents,
        setDocuments,
        summary,
        setSummary,
        summaryLoading,
        setSummaryLoading,
        uploading,
        setUploading,
        analysisMessage,
        setAnalysisMessage,
        clearWorkspace
      }}
    >
      {children}
    </OcrContext.Provider>
  );
}

export const useOcrWorkspace = () => {
  const context = useContext(OcrContext);
  if (!context) {
    throw new Error("useOcrWorkspace must be used within an OcrProvider");
  }
  return context;
};
