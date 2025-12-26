import DocumentUploader from "../components/document/DocumentUploader";

export default function OcrPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Intelligent Document OCR</h1>
      <p className="text-gray-400 mb-8">
        Upload documents to extract text and entities with advanced OCR technology
      </p>
      
      <DocumentUploader />
    </div>
  );
}