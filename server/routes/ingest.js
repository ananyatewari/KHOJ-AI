import express from "express";
import multer from "multer";
import pdf from "pdf-parse/lib/pdf-parse.js";
import Document from "../models/Document.js";
import { extractEntities } from "../utils/nlp.js";
import { getEmbedding } from "../utils/embeddings.js";
import { emitLog } from "../utils/logger.js";
import { extractEntitiesAI } from "../services/aiEntities.js";
import { generateAISummary } from "../services/aiSummary.js";
import { findOrCreateEvent, updateEventTitle } from "../services/eventLinking.js";
import { triggerAlertChecks } from "../utils/alertTriggers.js";

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

    // Generate AI Summary
    let aiSummary = null;
    try {
      await emitLog(io, {
        level: "INFO",
        message: "Generating AI summary...",
        user: req.body.uploadedBy,
        agency: req.body.agency
      });

      aiSummary = await generateAISummary({
        documents: [{ text, entities }]
      });

      await emitLog(io, {
        level: "SUCCESS",
        message: "AI summary generated",
        user: req.body.uploadedBy,
        agency: req.body.agency
      });
    } catch (summaryErr) {
      console.error("AI summary generation failed:", summaryErr);
      await emitLog(io, {
        level: "WARNING",
        message: "AI summary generation failed (continuing without summary)",
        user: req.body.uploadedBy,
        agency: req.body.agency
      });
    }

    const doc = await Document.create({
      filename: req.file.originalname,
      text,
      agency: req.body.agency,
      uploadedBy: req.body.uploadedBy,
      visibility: [req.body.agency],
      entities,
      aiSummary,
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

    try {
      await emitLog(io, {
        level: "INFO",
        message: "Checking for related documents...",
        user: req.body.uploadedBy,
        agency: req.body.agency
      });

      const { event, isNew } = await findOrCreateEvent(doc, "Document");
      
      if (event) {
        if (isNew) {
          await updateEventTitle(event._id);
        }

        await emitLog(io, {
          level: "SUCCESS",
          message: isNew ? `New event created with ${event.documents.length} related document(s)` : "Document linked to existing event",
          user: req.body.uploadedBy,
          agency: req.body.agency
        });

        if (io) {
          io.emit("event:updated", {
            eventId: event._id,
            isNew,
            documentId: doc._id
          });
        }
      } else {
        await emitLog(io, {
          level: "INFO",
          message: "No related documents found. Event will be created when a matching document is uploaded.",
          user: req.body.uploadedBy,
          agency: req.body.agency
        });
      }
    } catch (eventErr) {
      console.error("Event linking failed:", eventErr);
      await emitLog(io, {
        level: "WARNING",
        message: "Event linking failed (document still indexed)",
        user: req.body.uploadedBy,
        agency: req.body.agency
      });
    }

    try {
      await emitLog(io, {
        level: "INFO",
        message: "Running AI alert checks...",
        user: req.body.uploadedBy,
        agency: req.body.agency
      });

      const alerts = await triggerAlertChecks(doc, "Document", io);
      
      if (alerts.length > 0) {
        await emitLog(io, {
          level: "WARNING",
          message: `${alerts.length} alert(s) triggered`,
          user: req.body.uploadedBy,
          agency: req.body.agency
        });
      }
    } catch (alertErr) {
      console.error("Alert checks failed:", alertErr);
      await emitLog(io, {
        level: "WARNING",
        message: "Alert checks failed",
        user: req.body.uploadedBy,
        agency: req.body.agency
      });
    }

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
