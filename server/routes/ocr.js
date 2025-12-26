import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Document from "../models/OcrDocument.js";
import { performOCR, extractEntities } from "../utils/dualOcrProcessor.js";

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
    // Accept images and PDFs
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file format. Please upload an image or PDF."));
    }
  },
});

const router = express.Router();

// Process document endpoint - OCR and entity extraction
router.post("/process", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const originalFilename = req.file.originalname;
    const uploadedBy = req.body.userId || "unknown";
    const agency = req.body.agency || "N/A";
    
    // Store the relative path to serve the image later
    const relativePath = `/uploads/${path.basename(filePath)}`;
    
    // Perform OCR on the uploaded image
    const ocrResult = await performOCR(filePath);
    
    // Extract entities with bounding boxes
    const entities = extractEntities(ocrResult);
    
    // Create a new document in the database
    const newDocument = new Document({
      originalImage: relativePath,
      filename: originalFilename,
      text: ocrResult.text,
      agency,
      uploadedBy,
      entities
    });
    
    await newDocument.save();
    
    res.status(201).json({
      success: true,
      document: {
        id: newDocument._id,
        text: newDocument.text,
        entities: newDocument.entities
      }
    });
  } catch (err) {
    console.error("OCR processing error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get OCR document by ID
router.get("/:id", async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
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
      createdAt: document.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all OCR documents
router.get("/documents", async (req, res) => {
  try {
    // Optional filtering by user or agency
    const filter = {};
    if (req.query.userId) filter.uploadedBy = req.query.userId;
    if (req.query.agency) filter.agency = req.query.agency;
    
    const documents = await Document.find(filter).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      documents: documents.map(doc => ({
        id: doc._id,
        filename: doc.filename,
        originalImage: doc.originalImage,
        text: doc.text?.substring(0, 100) + (doc.text?.length > 100 ? '...' : ''),
        createdAt: doc.createdAt,
        agency: doc.agency
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;