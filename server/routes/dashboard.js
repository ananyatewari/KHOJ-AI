import express from "express";
import Document from "../models/Document.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.get("/stats", async (req, res) => {
  const total = await Document.countDocuments();
  const indexed = await Document.countDocuments({ indexed: true });

  res.json({
    totalDocuments: total,
    indexedDocuments: indexed
  });
});

router.get("/", authMiddleware, async (req, res) => {
  const { username, agency } = req.user;

  const myDocs = await Document.find({ uploadedBy: username })
    .sort({ createdAt: -1 })
    .limit(10);

  const agencyDocs = await Document.find({ agency })
    .sort({ createdAt: -1 })
    .limit(20);

  res.json({
    myDocs,
    agencyDocs,
  });
});

export default router;
