import express from "express";
import Document from "../models/Document.js";
import { getEmbedding } from "../utils/embeddings.js";

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

router.post("/semantic", async (req, res) => {
  const { query, agency } = req.body;
  const queryEmbedding = await getEmbedding(query);

  const docs = await Document.find({
  embedding: { $ne: [] },
  agency
});


  const results = [];

  for (const doc of docs) {
    // Split document into paragraphs
    const paragraphs = doc.text.split("\n").filter(p => p.length > 40);

    let bestScore = -1;
    let bestSnippet = "";

    for (const p of paragraphs.slice(0, 20)) { // limit for speed
      const pEmbedding = await getEmbedding(p);
      const score = cosineSimilarity(queryEmbedding, pEmbedding);

      if (score > bestScore) {
        bestScore = score;
        bestSnippet = p;
      }
    }

    results.push({
      filename: doc.filename,
      score: bestScore,
      snippet: bestSnippet,
      entities: doc.entities,
      text: doc.text
    });
  }

  results.sort((a, b) => b.score - a.score);

  res.json(results.slice(0, 3));
});


export default router;
