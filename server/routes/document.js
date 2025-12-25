import express from "express";
import Document from "../models/Document.js";
import authMiddleware from "../middleware/auth.js";
import { emitLog } from "../utils/logger.js";

const router = express.Router();

router.get("/:id", authMiddleware, async (req, res) => {
  const io = req.app.get("io");

  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: "Not found" });

  if (!doc.visibility.includes(req.user.agency)) {
    await emitLog(io, {
      level: "WARNING",
      message: "Access denied – document visibility restricted",
      user: req.user.username,
      agency: req.user.agency,
      documentId: doc._id
    });

    return res.status(403).json({ error: "Access denied" });
  }

  await emitLog(io, {
    level: "INFO",
    message: "Document viewed",
    user: req.user.username,
    agency: req.user.agency,
    documentId: doc._id
  });

  res.json({ text: doc.text });
});


export default router;
