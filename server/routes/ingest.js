import express from "express";
import multer from "multer";
import pdf from "pdf-parse/lib/pdf-parse.js";
import Document from "../models/Document.js";
import { extractEntities } from "../utils/nlp.js";
import { getEmbedding } from "../utils/embeddings.js";
import { emitLog } from "../utils/logger.js";
import { extractEntitiesAI } from "../services/aiEntities.js";

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
  const io = req.app.get("io");

  await emitLog(io, {
    level: "INFO",
    message: `PDF received – ${req.file.originalname}`,
    user: req.body.uploadedBy,
    agency: req.body.agency
  });

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF uploaded" });
    }
    const parsed = await pdf(req.file.buffer);
    await emitLog(io, {
      level: "INFO",
      message: "Text extracted successfully",
      user: req.body.uploadedBy,
      agency: req.body.agency
    });
    const text = parsed.text || "";

    // 1️⃣ Rule-based extraction (fast)
const ruleEntities = extractEntities(text);

// 2️⃣ AI extraction (intelligent)
let aiEntities = null;
try {
  aiEntities = await extractEntitiesAI(text);
} catch (e) {
  console.error("AI entity extraction failed:", e.message);
}

// 3️⃣ Merge
const entities = aiEntities? aiEntities : ruleEntities;

await emitLog(io, {
  level: "INFO",
  message: aiEntities
    ? "AI entity extraction completed"
    : "AI entity extraction skipped (fallback)",
  user: req.body.uploadedBy,
  agency: req.body.agency
});

    const chunks = text
      .split("\n")
      .map(p => p.trim())
      .filter(p => p.length > 60)
      .slice(0, 40);

    const chunkEmbeddings = await Promise.all(
      chunks.map(chunk => getEmbedding(chunk))
    );

    await emitLog(io, {
      level: "INFO",
      message: "Embeddings generated",
      user: req.body.uploadedBy,
      agency: req.body.agency
  });

  const doc = await Document.create({
    filename: req.file.originalname,
    text,
    agency: req.body.agency,
    uploadedBy: req.body.uploadedBy,
    visibility: [req.body.agency],
    entities,
    chunks,
    chunkEmbeddings,
    indexed: true
});


  await emitLog(io, {
    level: "SUCCESS",
    message: "Document indexed successfully",
    documentId: doc._id,
    user: req.body.uploadedBy,
    agency: req.body.agency
  });


    res.json({
      status: "success",
      documentId: doc._id,
      text,
      entities,
      chunks,
      chunkEmbeddings
    });

  } catch (err) {
    console.error("PDF ingest failed:", err);
    await emitLog(req.app.get("io"), {
      level: "ERROR",
      message: "PDF ingestion failed",
      user: req.body.uploadedBy,
      agency: req.body.agency
  });
    res.status(500).json({ error: "PDF processing failed" });
  }
});

export default router;
