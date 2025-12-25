import express from "express";
import multer from "multer";
import pdf from "pdf-parse/lib/pdf-parse.js";
import Document from "../models/Document.js";
import { extractEntities } from "../utils/nlp.js";
import { getEmbedding } from "../utils/embeddings.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDFs allowed"));
    }
    cb(null, true);
  },
});

router.post("/pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF uploaded" });
    }
    const parsed = await pdf(req.file.buffer);
    const text = parsed.text || "";

    const entities = extractEntities(text);
    const embedding = await getEmbedding(text);

const doc = await Document.create({
  filename: req.file.originalname,
  text,
  agency: req.body.agency,
  uploadedBy: req.body.uploadedBy,
  entities,
  embedding,
  indexed: true
});

    res.json({
      status: "success",
      documentId: doc._id,
      text,
      entities,
      embedding
    });

  } catch (err) {
    console.error("PDF ingest failed:", err);
    res.status(500).json({ error: "PDF processing failed" });
  }
});

export default router;
