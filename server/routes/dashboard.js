import express from "express";
import Document from "../models/Document.js";
import DocumentShare from "../models/DocumentShare.js";
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

  const last24h = await Document.countDocuments({
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    agency,
  });

  res.json({
    myDocs: myDocsWithShareStatus,
    agencyDocs,
    stats: {
      myUploads: myDocs.length,
      agencyUploads: agencyDocs.length,
      last24h,
    },
  });
});

export default router;
