import pdf from "pdf-parse/lib/pdf-parse.js";
import fs from "fs";

/**
 * Extract text from various file formats
 * Supports: PDF, TXT, Word (basic text extraction)
 */
export async function extractTextFromFile(filePath, mimetype) {
  try {
    // PDF files
    if (mimetype === "application/pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const parsed = await pdf(dataBuffer);
      return parsed.text || "";
    }
    
    // Plain text files
    if (mimetype === "text/plain") {
      return fs.readFileSync(filePath, "utf-8");
    }
    
    // Word documents (.doc, .docx) - basic text extraction
    // For now, treat as text if possible, otherwise return empty
    if (
      mimetype === "application/msword" ||
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // Try reading as text (works for some simple .doc files)
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        // Remove binary characters and extract readable text
        const cleanText = content
          .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return cleanText;
      } catch (err) {
        console.warn("Could not extract text from Word document:", err.message);
        return "";
      }
    }
    
    throw new Error(`Unsupported file type: ${mimetype}`);
  } catch (error) {
    console.error("Error extracting text:", error);
    throw error;
  }
}

/**
 * Validate file type for metadata upload
 */
export function isValidMetadataFile(mimetype) {
  const validTypes = [
    "application/pdf",
    "text/plain",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];
  return validTypes.includes(mimetype);
}
