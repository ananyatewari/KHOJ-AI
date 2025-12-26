import express from "express";
import Document from "../models/Document.js";
import { getEmbedding } from "../utils/embeddings.js";
import authMiddleware from "../middleware/auth.js";
import { emitLog } from "../utils/logger.js";

const router = express.Router();
const MAX_DOCS_PER_QUERY = 25;
const RESULTS_LIMIT = 5;

function cosineSimilarity(a, b) {
  if (
    !Array.isArray(a) ||
    !Array.isArray(b) ||
    a.length === 0 ||
    b.length === 0
  ) {
    return -Infinity;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  const length = Math.min(a.length, b.length);

  for (let i = 0; i < length; i++) {
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
    const baseFilter = {
      chunkEmbeddings: { $exists: true, $ne: [] },
      visibility: { $in: [req.user.agency] }
    };

    let docs = [];

    if (scope === "document" && documentId) {
      docs = await Document.find({
        ...baseFilter,
        _id: documentId
      })
        .select("filename chunks chunkEmbeddings entities text")
        .lean();
    } else {
      const candidateDocs = await Document.find({
        ...baseFilter,
        embedding: { $exists: true, $ne: [] }
      })
        .select("_id filename embedding")
        .lean();

      const rankedDocIds = candidateDocs
        .map((doc) => ({
          ...doc,
          score: cosineSimilarity(queryEmbedding, doc.embedding || [])
        }))
        .filter((doc) => Number.isFinite(doc.score))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_DOCS_PER_QUERY)
        .map((doc) => doc._id.toString());

      if (!rankedDocIds.length) {
        return res.json({
          results: [],
          summary: `AI Summary: No intelligence related to "${query}" found.`
        });
      }

      const docsById = new Map();
      const hydratedDocs = await Document.find({
        _id: { $in: rankedDocIds }
      })
        .select("filename chunks chunkEmbeddings entities text")
        .lean();

      hydratedDocs.forEach((doc) => {
        docsById.set(doc._id.toString(), doc);
      });

      docs = rankedDocIds
        .map((id) => docsById.get(id))
        .filter(Boolean);
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
      results: results.slice(0, RESULTS_LIMIT),
      summary: `AI Summary: Intelligence related to "${query}" appears across ${results.length} documents.`
    });

  } catch (err) {
    console.error("Semantic search error:", err);
    res.status(500).json({ error: "Semantic search failed" });
  }
});

import { generateAISummary } from "../services/aiSummary.js";

router.post("/summary", authMiddleware, async (req, res) => {
  try {
    const { documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({ error: "documentId required" });
    }

    const doc = await Document.findOne({
      _id: documentId,
      visibility: req.user.agency
    });

    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    const summary = await generateAISummary({
      documents: [doc]
    });
    await emitLog(req.app.get("io"), {
      level: "SUCCESS",
      message: `AI summary generated for document ${documentId}`,
      user: req.user.username,
      agency: req.user.agency
    });
    res.json(summary);
  } catch (err) {
    console.error("Document summary error:", err);
    res.status(500).json({ error: "Document summary failed" });
  }
});




export default router;
