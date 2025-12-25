import { useState } from "react";
import axios from "axios";

export default function PDFUpload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const uploadPDF = async () => {
    if (!file) return alert("Select a PDF");

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    const res = await axios.post(
      "http://localhost:3000/api/ingest/pdf",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );

    setLoading(false);
    onUploaded(res.data.documentId);
  };

  return (
    <div className="bg-gray-900 p-4 rounded">
      <h2 className="text-lg mb-2">Upload PDF</h2>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files[0])}
        className="mb-2"
      />

      <button
        onClick={uploadPDF}
        className="bg-blue-600 px-4 py-2 rounded"
      >
        {loading ? "Processing..." : "Upload & Ingest"}
      </button>
    </div>
  );
}
