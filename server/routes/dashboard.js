import express from "express";
import Document from "../models/Document.js";
import DocumentShare from "../models/DocumentShare.js";
import OcrDocument from "../models/OcrDocument.js";
import Transcription from "../models/Transcription.js";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/", auth, async (req, res) => {
  const { agency, username } = req.user;

  const myDocs = await Document.find({ uploadedBy: username }).sort({ createdAt: -1 });
  const agencyDocs = await Document.find({ agency }).sort({ createdAt: -1 });

  // Check which documents are shared cross-agency
  const sharedDocs = await DocumentShare.find({
    uploadedBy: username,
    scope: "cross-agency",
    approvalStatus: "approved"
  }).select("documentId");

  const sharedDocIds = new Set(sharedDocs.map(s => s.documentId.toString()));

  // Add sharedWithChatbot flag to myDocs
  const myDocsWithShareStatus = myDocs.map(doc => ({
    ...doc.toObject(),
    sharedWithChatbot: sharedDocIds.has(doc._id.toString())
  }));

  const last24hDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Count uploads in last 24h across all document types for the agency
  const [pdfLast24h, ocrLast24h, audioLast24h] = await Promise.all([
    Document.countDocuments({
      createdAt: { $gte: last24hDate },
      agency,
    }),
    OcrDocument.countDocuments({
      createdAt: { $gte: last24hDate },
      agency,
    }),
    Transcription.countDocuments({
      createdAt: { $gte: last24hDate },
      agency,
    }),
  ]);

  const last24h = pdfLast24h + ocrLast24h + audioLast24h;

  // Count platform-wide uploads in last 24h (across all agencies)
  const [platformPdfLast24h, platformOcrLast24h, platformAudioLast24h] = await Promise.all([
    Document.countDocuments({ createdAt: { $gte: last24hDate } }),
    OcrDocument.countDocuments({ createdAt: { $gte: last24hDate } }),
    Transcription.countDocuments({ createdAt: { $gte: last24hDate } }),
  ]);

  const platformLast24h = platformPdfLast24h + platformOcrLast24h + platformAudioLast24h;

  // Count total members in the agency
  const totalMembers = await User.countDocuments({ agency });

  res.json({
    myDocs: myDocsWithShareStatus,
    agencyDocs,
    stats: {
      myUploads: myDocs.length,
      agencyUploads: agencyDocs.length,
      last24h,
      platformLast24h,
      totalMembers,
    },
  });
});

export default router;
