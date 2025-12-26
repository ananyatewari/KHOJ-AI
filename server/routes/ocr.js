import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import OcrDocument from "../models/OcrDocument.js";
import { processDocument } from "../controller/ocrController.js";
import { generateAISummary } from "../services/aiSummary.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file format. Please upload image files only."));
    }
  }
});

const router = express.Router();

// Process multiple images endpoint - OCR and entity extraction
router.post("/process", upload.array("images", 10), async (req, res) => {
  try {
    if (!req.files || !req.files.length) {
      return res.status(400).json({ error: "No images uploaded" });
    }

    const userContext = {
      userId: req.body.userId || "unknown",
      agency: req.body.agency || "N/A"
    };

    const processedDocuments = [];

    for (const file of req.files) {
      try {
        const doc = await processDocument(file, userContext);
        processedDocuments.push(doc);
      } catch (processErr) {
        console.error("OCR processing error for file:", file.originalname, processErr);
      }
    }

    if (!processedDocuments.length) {
      return res.status(500).json({ error: "Failed to process uploaded images" });
    }

    res.status(201).json({
      success: true,
      documents: processedDocuments.map((doc) => ({
        id: doc._id,
        text: doc.text,
        entities: doc.entities,
        originalImage: doc.originalImage,
        filename: doc.filename,
        createdAt: doc.createdAt,
        aiSummary: doc.aiSummary
      })),
      aiSummary: await aggregateSummary(processedDocuments)
    });
  } catch (err) {
    console.error("OCR processing error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all OCR documents
router.get("/documents", async (req, res) => {
  try {
    // Optional filtering by user or agency
    const filter = {};
    if (req.query.userId) filter.uploadedBy = req.query.userId;
    if (req.query.agency) filter.agency = req.query.agency;

    const documents = await OcrDocument.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      documents: documents.map((doc) => ({
        id: doc._id,
        filename: doc.filename,
        originalImage: doc.originalImage,
        text:
          doc.text?.substring(0, 100) +
          (doc.text?.length > 100 ? "..." : ""),
        createdAt: doc.createdAt,
        agency: doc.agency
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get OCR document by ID
router.get("/:id", async (req, res) => {
  try {
    const document = await OcrDocument.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    
    res.json({
      id: document._id,
      text: document.text,
      entities: document.entities,
      originalImage: document.originalImage,
      filename: document.filename,
      agency: document.agency,
      createdAt: document.createdAt,
      aiSummary: document.aiSummary
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function aggregateSummary(documents = []) {
  const enrichedDocs = documents.filter(
    (doc) => doc?.text && doc?.entities
  );

  if (!enrichedDocs.length) return null;

  try {
    return await generateAISummary({
      documents: enrichedDocs.map((doc) => ({
        text: doc.text,
        entities: doc.entities
      }))
    });
  } catch (err) {
    console.warn("Batch AI summary generation failed:", err.message);
    return null;
  }
}

export default router;