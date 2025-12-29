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
  limits: { fileSize: 10 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only PDFs, Excel files, Word documents, and text files allowed"));
    }
    cb(null, true);
  },
});

router.post("/pdf", upload.single("file"), async (req, res) => {
  const io = req.app.get("io");

  await emitLog(io, {
    level: "INFO",
    message: `File received – ${req.file.originalname}`,
    user: req.body.uploadedBy,
    agency: req.body.agency
  });

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    let text = "";

    // Handle different file types
    if (req.file.mimetype === "application/pdf") {
      const parsed = await pdf(req.file.buffer);
      text = parsed.text || "";
    } else if (req.file.mimetype === "text/plain") {
      text = req.file.buffer.toString("utf-8");
    } else if (
      req.file.mimetype === "application/msword" ||
      req.file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // For Word documents, try to extract text from buffer
      try {
        const content = req.file.buffer.toString("utf-8");
        // Remove binary characters and extract readable text
        text = content
          .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      } catch (err) {
        console.warn("Could not extract text from Word document:", err.message);
        text = "";
      }
    } else if (
      req.file.mimetype === "application/vnd.ms-excel" ||
      req.file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      // For Excel files, we'll need additional processing
      // For now, return empty text and log a warning
      console.warn("Excel file processing not fully implemented yet");
      text = "";
    } else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "No text could be extracted from the file" });
    }

    await emitLog(io, {
      level: "INFO",
      message: "Text extracted successfully",
      user: req.body.uploadedBy,
      agency: req.body.agency
    });

const ruleEntities = extractEntities(text);

let aiEntities = null;
try {
  aiEntities = await extractEntitiesAI(text);
} catch (e) {
  console.error("AI entity extraction failed:", e.message);
}

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

      const { event, isNew } = await findOrCreateEvent(doc, "Document", io);
      
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
        message: "Checking criminal database...",
        user: req.body.uploadedBy,
        agency: req.body.agency
      });

      const { checkCriminalRecordsForDocument } = await import("../utils/criminalCheckHelper.js");
      const criminalAlerts = await checkCriminalRecordsForDocument(doc, "Document", io);
      
      if (criminalAlerts.length > 0) {
        await emitLog(io, {
          level: "WARNING",
          message: `Court records found for ${criminalAlerts.length} person(s)`,
          user: req.body.uploadedBy,
          agency: req.body.agency
        });
      }
    } catch (criminalErr) {
      console.error("Criminal check failed:", criminalErr);
      await emitLog(io, {
        level: "WARNING",
        message: "Criminal database check failed",
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
    });

  } catch (err) {
    console.error("File ingest failed:", err);
    await emitLog(req.app.get("io"), {
      level: "ERROR",
      message: "File ingestion failed",
      user: req.body.uploadedBy,
      agency: req.body.agency
    });
    res.status(500).json({ error: "File processing failed" });
  }
});

export default router;
