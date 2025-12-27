import express from "express";
import Transcription from "../models/Transcription.js";
import authMiddleware from "../middleware/auth.js";
import upload from "../middleware/uploadMiddleware.js";
import { emitLog } from "../utils/logger.js";
import aiService from "../services/aiService.js";
import { extractEntitiesAI } from "../services/aiEntities.js";
import { generateAnalysisPDF } from "../utils/pdfGenerator.js";
import { findOrCreateEvent, updateEventTitle } from "../services/eventLinking.js";
import { triggerAlertChecks } from "../utils/alertTriggers.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// Process and upload audio file
router.post("/process", authMiddleware, upload.single("audio"), async (req, res) => {
  const io = req.app.get("io");

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const userId = req.body.userId || req.user.username;
    const agency = req.body.agency || req.user.agency;
    const startTime = Date.now();

    // Emit processing started
    await emitLog(io, {
      level: "INFO",
      message: "Audio transcription processing started",
      user: userId,
      agency: agency,
      filename: req.file.originalname
    });

    // Step 1: Transcribe audio using Whisper
    console.log("Transcribing audio file...");
    const transcript = await aiService.transcribeAudio(req.file.path);

    // Step 2: Extract entities from the transcript (use Groq AI entity extractor)
    console.log("Extracting entities from transcript using Groq...");
    let entities = await extractEntitiesAI(transcript);
    if (!entities) {
      entities = { persons: [], places: [], organizations: [] };
    }

    // Normalize entities to expected schema: arrays of { text, confidence, source }
    const ensureArray = (arr) => Array.isArray(arr) ? arr : [];
    entities.persons = ensureArray(entities.persons).map(e => (typeof e === 'string' ? { text: e, confidence: 0.85, source: 'groq' } : { text: e.text || '', confidence: e.confidence || 0.85, source: e.source || 'groq' }));
    entities.places = ensureArray(entities.places).map(e => (typeof e === 'string' ? { text: e, confidence: 0.85, source: 'groq' } : { text: e.text || '', confidence: e.confidence || 0.85, source: e.source || 'groq' }));
    entities.organizations = ensureArray(entities.organizations).map(e => (typeof e === 'string' ? { text: e, confidence: 0.85, source: 'groq' } : { text: e.text || '', confidence: e.confidence || 0.85, source: e.source || 'groq' }));
    entities.dates = ensureArray(entities.dates).map(e => (typeof e === 'string' ? { text: e, confidence: 0.85, source: 'groq' } : { text: e.text || '', confidence: e.confidence || 0.85, source: e.source || 'groq' }));
    entities.phoneNumbers = ensureArray(entities.phoneNumbers).map(e => (typeof e === 'string' ? { text: e, confidence: 0.85, source: 'groq' } : { text: e.text || '', confidence: e.confidence || 0.85, source: e.source || 'groq' }));

    // Step 3: Process transcript to get key points, action items, etc.
    console.log("Processing transcript for summary...");
    let aiSummary = null;
    try {
      const processedMinutes = await aiService.processTranscript(transcript, entities);
      // `generateAISummary` returns the intelligence schema:
      // { executiveSummary, keyFindings, entityInsights, analystTakeaways }
      aiSummary = processedMinutes || {
        executiveSummary: "",
        keyFindings: [],
        entityInsights: {},
        analystTakeaways: []
      };
    } catch (summaryErr) {
      console.error("Error processing summary:", summaryErr);
      aiSummary = {
        executiveSummary: "",
        keyFindings: [],
        entityInsights: {},
        analystTakeaways: []
      };
    }

    // Create transcription record in database
    const transcription = new Transcription({
      filename: req.file.originalname,
      originalAudio: `/uploads/${req.file.filename}`,
      transcript: transcript,
      entities: entities,
      agency: agency,
      uploadedBy: userId,
      aiSummary: aiSummary,
      visibility: [agency],
      processingTime: Date.now() - startTime,
      status: "completed"
    });

    await transcription.save();

    await emitLog(io, {
      level: "INFO",
      message: "Audio transcription completed successfully",
      user: userId,
      agency: agency,
      transcriptionId: transcription._id
    });

    try {
      await emitLog(io, {
        level: "INFO",
        message: "Checking for related documents...",
        user: userId,
        agency: agency
      });

      const { event, isNew } = await findOrCreateEvent(transcription, "Transcription", io);
      
      if (event) {
        if (isNew) {
          await updateEventTitle(event._id);
        }

        await emitLog(io, {
          level: "SUCCESS",
          message: isNew ? `New event created with ${event.documents.length} related document(s)` : "Transcription linked to existing event",
          user: userId,
          agency: agency
        });

        if (io) {
          io.emit("event:updated", {
            eventId: event._id,
            isNew,
            documentId: transcription._id
          });
        }
      } else {
        await emitLog(io, {
          level: "INFO",
          message: "No related documents found. Event will be created when a matching document is uploaded.",
          user: userId,
          agency: agency
        });
      }
    } catch (eventErr) {
      console.error("Event linking failed for transcription:", eventErr);
      await emitLog(io, {
        level: "WARNING",
        message: "Event linking failed (transcription still saved)",
        user: userId,
        agency: agency
      });
    }

    try {
      await emitLog(io, {
        level: "INFO",
        message: "Running AI alert checks...",
        user: userId,
        agency: agency
      });

      const alerts = await triggerAlertChecks(transcription, "Transcription", io);
      
      if (alerts.length > 0) {
        await emitLog(io, {
          level: "WARNING",
          message: `${alerts.length} alert(s) triggered`,
          user: userId,
          agency: agency
        });
      }
    } catch (alertErr) {
      console.error("Alert checks failed for transcription:", alertErr);
      await emitLog(io, {
        level: "WARNING",
        message: "Alert checks failed",
        user: userId,
        agency: agency
      });
    }

    res.json({
      transcription: {
        id: transcription._id,
        transcript: transcription.transcript,
        entities: transcription.entities,
        aiSummary: transcription.aiSummary,
        filename: transcription.filename,
        createdAt: transcription.createdAt
      }
    });
  } catch (error) {
    console.error("Error processing audio:", error);

    await emitLog(io, {
      level: "ERROR",
      message: "Audio transcription processing failed",
      user: req.user.username,
      agency: req.user.agency,
      error: error.message
    });

    res.status(500).json({
      error: error.message || "Failed to process audio file"
    });
  }
});

// Get transcription by ID
router.get("/:id", authMiddleware, async (req, res) => {
  const io = req.app.get("io");

  try {
    const transcription = await Transcription.findById(req.params.id);
    if (!transcription) {
      return res.status(404).json({ error: "Transcription not found" });
    }

    // Check if transcription is accessible to user's agency
    const hasAccess = transcription.visibility.includes(req.user.agency);
    if (!hasAccess) {
      await emitLog(io, {
        level: "WARNING",
        message: "Access denied – transcription visibility restricted",
        user: req.user.username,
        agency: req.user.agency,
        transcriptionId: transcription._id
      });

      return res.status(403).json({ error: "Access denied" });
    }

    await emitLog(io, {
      level: "INFO",
      message: "Transcription viewed",
      user: req.user.username,
      agency: req.user.agency,
      transcriptionId: transcription._id
    });

    res.json({
      id: transcription._id,
      transcript: transcription.transcript,
      entities: transcription.entities,
      aiSummary: transcription.aiSummary,
      originalAudio: transcription.originalAudio,
      filename: transcription.filename,
      agency: transcription.agency,
      uploadedBy: transcription.uploadedBy,
      createdAt: transcription.createdAt
    });
  } catch (error) {
    console.error("Error fetching transcription:", error);
    res.status(500).json({ error: "Failed to fetch transcription" });
  }
});

// Get all transcriptions for user's agency
router.get("/", authMiddleware, async (req, res) => {
  const io = req.app.get("io");

  try {
    const transcriptions = await Transcription.find({
      visibility: req.user.agency
    })
      .select("id filename transcript entities aiSummary createdAt uploadedBy")
      .sort({ createdAt: -1 });

    res.json({
      transcriptions: transcriptions.map(t => ({
        id: t._id,
        filename: t.filename,
        createdAt: t.createdAt,
        uploadedBy: t.uploadedBy,
        entities: t.entities,
        aiSummary: t.aiSummary
      }))
    });
  } catch (error) {
    console.error("Error fetching transcriptions:", error);
    res.status(500).json({ error: "Failed to fetch transcriptions" });
  }
});

// Download transcription analysis as PDF
router.get("/download-analysis/:id", authMiddleware, async (req, res) => {
  try {
    const transcription = await Transcription.findById(req.params.id);
    
    if (!transcription) {
      return res.status(404).json({ error: "Transcription not found" });
    }

    // Check access
    const hasAccess = transcription.visibility.includes(req.user.agency);
    if (!hasAccess) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Prepare item for PDF generation (match expected structure)
    const item = {
      filename: transcription.filename,
      transcript: transcription.transcript,
      text: transcription.transcript, // alias for compatibility
      entities: transcription.entities,
      aiSummary: transcription.aiSummary,
      uploadedBy: transcription.uploadedBy,
      agency: transcription.agency,
      createdAt: transcription.createdAt
    };

    // Generate PDF
    const pdfBuffer = await generateAnalysisPDF(item, "transcription");
    const filename = `${transcription.filename.replace(/\.[^/.]+$/, "")}_analysis.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Error downloading transcription analysis:", error);
    res.status(500).json({ error: "Failed to download analysis" });
  }
});

export default router;
