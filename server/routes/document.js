import express from "express";
import Document from "../models/Document.js";

const router = express.Router();

router.get("/:id", async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json({
      text: doc.text
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
