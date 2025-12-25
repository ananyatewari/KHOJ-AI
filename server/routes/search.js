import express from "express";
import Document from "../models/Document.js";
import { getEmbedding } from "../utils/embeddings.js";
import authMiddleware from "../middleware/auth.js";
import { emitLog } from "../utils/logger.js";

const router = express.Router();

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

router.post("/semantic", authMiddleware, async (req, res) => {
  try {
    const { query, scope, documentId } = req.body;
    const queryEmbedding = await getEmbedding(query);
    let docs = [];

    if (scope === "document" && documentId) {
      docs = await Document.find({
        _id: documentId,
        visibility: req.user.agency,
        chunkEmbeddings: { $exists: true, $ne: [] }
      });
    } 
    
    else {
      docs = await Document.find({
        visibility: req.user.agency,
        chunkEmbeddings: { $exists: true, $ne: [] }
      });
    }

    await emitLog(req.app.get("io"), {
      level: "INFO",
      message: `Semantic search executed (${scope || "agency"})`,
      user: req.user.username,
      agency: req.user.agency
    });

    const results = [];

    for (const doc of docs) {
      let bestScore = -1;
      let bestSnippet = "";

      for (let i = 0; i < doc.chunkEmbeddings.length; i++) {
        const score = cosineSimilarity(
          queryEmbedding,
          doc.chunkEmbeddings[i]
        );

        if (score > bestScore) {
          bestScore = score;
          bestSnippet = doc.chunks[i];
        }
      }

      if (bestScore > 0.2) {
        results.push({
          filename: doc.filename,
          score: bestScore,
          snippet: bestSnippet,
          entities: doc.entities,
          text: doc.text
        });
      }
    }

    results.sort((a, b) => b.score - a.score);

    res.json({
      results: results.slice(0, 5),
      summary: `AI Summary: Intelligence related to "${query}" appears across ${results.length} documents.`
    });

  } catch (err) {
    console.error("Semantic search error:", err);
    res.status(500).json({ error: "Semantic search failed" });
  }
});

export default router;
