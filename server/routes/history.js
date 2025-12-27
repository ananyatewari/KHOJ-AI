import express from "express";
import Document from "../models/Document.js";
import OcrDocument from "../models/OcrDocument.js";
import Transcription from "../models/Transcription.js";
import authMiddleware from "../middleware/auth.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { generateAnalysisPDF } from "../utils/pdfGenerator.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { type } = req.query;
    const userAgency = req.user.agency;
    const username = req.user.username;

    let items = [];

    if (type === "all" || type === "document") {
      const documents = await Document.find({
        $or: [
          { agency: userAgency },
          { uploadedBy: username }
        ]
      })
        .select("filename text entities aiSummary createdAt uploadedBy fileType")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      items.push(...documents.map(doc => ({
        ...doc,
        type: "document"
      })));
    }

    if (type === "all" || type === "ocr") {
      const ocrDocs = await OcrDocument.find({
        $or: [
          { agency: userAgency },
          { uploadedBy: username }
        ]
      })
        .select("filename text entities aiSummary createdAt uploadedBy originalImage")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      items.push(...ocrDocs.map(doc => ({
        ...doc,
        type: "ocr"
      })));
    }

    if (type === "all" || type === "transcription") {
      const transcriptions = await Transcription.find({
        $or: [
          { agency: userAgency },
          { uploadedBy: username }
        ]
      })
        .select("filename transcript entities aiSummary createdAt uploadedBy originalAudio")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      items.push(...transcriptions.map(trans => ({
        ...trans,
        type: "transcription"
      })));
    }

    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (type !== "all") {
      items = items.slice(0, 50);
    }

    res.json({
      success: true,
      items,
      count: items.length
    });

  } catch (error) {
    console.error("Error fetching history:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch history"
    });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    const userAgency = req.user.agency;

    let item = null;

    if (type === "document") {
      item = await Document.findOne({
        _id: id,
        $or: [
          { agency: userAgency },
          { uploadedBy: req.user.username }
        ]
      }).lean();
    } else if (type === "ocr") {
      item = await OcrDocument.findOne({
        _id: id,
        $or: [
          { agency: userAgency },
          { uploadedBy: req.user.username }
        ]
      }).lean();
    } else if (type === "transcription") {
      item = await Transcription.findOne({
        _id: id,
        $or: [
          { agency: userAgency },
          { uploadedBy: req.user.username }
        ]
      }).lean();
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        error: "Item not found"
      });
    }

    res.json({
      success: true,
      item: {
        ...item,
        type
      }
    });

  } catch (error) {
    console.error("Error fetching history item:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch history item"
    });
  }
});

router.get("/download/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    const userAgency = req.user.agency;

    let item = null;
    let filePath = null;

    if (type === "document") {
      item = await Document.findOne({
        _id: id,
        $or: [
          { agency: userAgency },
          { uploadedBy: req.user.username }
        ]
      }).lean();

      if (item && item.filename) {
        filePath = path.join(__dirname, "../uploads", item.filename);
      }
    } else if (type === "ocr") {
      item = await OcrDocument.findOne({
        _id: id,
        $or: [
          { agency: userAgency },
          { uploadedBy: req.user.username }
        ]
      }).lean();

      if (item && item.originalImage) {
        filePath = path.join(__dirname, "..", item.originalImage);
      }
    } else if (type === "transcription") {
      item = await Transcription.findOne({
        _id: id,
        $or: [
          { agency: userAgency },
          { uploadedBy: req.user.username }
        ]
      }).lean();

      if (item && item.originalAudio) {
        filePath = path.join(__dirname, "..", item.originalAudio);
      }
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        error: "Item not found"
      });
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "Original file not found on server"
      });
    }

    res.download(filePath, item.filename);

  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({
      success: false,
      error: "Failed to download file"
    });
  }
});

router.get("/download-analysis/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    const userAgency = req.user.agency;

    let item = null;

    if (type === "document") {
      item = await Document.findOne({
        _id: id,
        $or: [
          { agency: userAgency },
          { uploadedBy: req.user.username }
        ]
      }).lean();
    } else if (type === "ocr") {
      item = await OcrDocument.findOne({
        _id: id,
        $or: [
          { agency: userAgency },
          { uploadedBy: req.user.username }
        ]
      }).lean();
    } else if (type === "transcription") {
      item = await Transcription.findOne({
        _id: id,
        $or: [
          { agency: userAgency },
          { uploadedBy: req.user.username }
        ]
      }).lean();
    }

    if (!item) {
      return res.status(404).json({
        success: false,
        error: "Item not found"
      });
    }

    // Generate PDF
    const pdfBuffer = await generateAnalysisPDF(item, type);
    const filename = `${item.filename.replace(/\.[^/.]+$/, "")}_analysis.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Error downloading analysis:", error);
    res.status(500).json({
      success: false,
      error: "Failed to download analysis"
    });
  }
});

export default router;
