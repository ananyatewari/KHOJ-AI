import { useState } from "react";
import { ingestDocument, ingestPDF } from "../services/api";

export default function IngestForm({ onPDFIngested }) {
  const [content, setContent] = useState("");
  const [agency, setAgency] = useState("police");
  const [pdfFile, setPdfFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleTextSubmit = async () => {
    setUploading(true);
    await ingestDocument({
      content,
      agency,
      source: "manual",
    });
    setUploading(false);
    setContent("");
    alert("Text ingested");
  };

  const handlePDFUpload = async () => {
    if (!pdfFile) return alert("Select a PDF first");

    setUploading(true);
    const res = await ingestPDF(pdfFile, agency);
    setUploading(false);

    onPDFIngested(res.documentId);
    setPdfFile(null);
  };

  return (
    <div className="bg-gray-900 p-4 rounded space-y-3">
      <h2 className="text-lg font-semibold">Ingest Document</h2>

      <select
        className="p-2 w-full bg-gray-800 rounded"
        value={agency}
        onChange={(e) => setAgency(e.target.value)}
      >
        <option value="police">Police</option>
        <option value="ncb">NCB</option>
        <option value="customs">Customs</option>
      </select>

      {/* TEXT INGEST */}
      <textarea
        className="w-full p-2 bg-gray-800 rounded"
        rows={4}
        placeholder="Paste FIR / log / report..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      <button
        onClick={handleTextSubmit}
        className="bg-blue-600 w-full py-2 rounded"
      >
        Ingest Text
      </button>

      <hr className="border-gray-700" />

      {/* PDF INGEST */}
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const file = e.target.files[0];
          if (!file) return;
          if (file.size > 10 * 1024 * 1024) {
            alert("PDF must be under 10MB");
            return;
          }
          setPdfFile(file);
        }}
        className="text-sm"
      />

      <button
        onClick={handlePDFUpload}
        className="bg-green-600 w-full py-2 rounded"
      >
        Upload PDF
      </button>

      {uploading && (
        <div className="text-xs text-gray-400">Processing...</div>
      )}
    </div>
  );
}
