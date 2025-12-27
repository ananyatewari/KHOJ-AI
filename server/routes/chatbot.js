import express from "express";
import auth from "../middleware/auth.js";
import Document from "../models/Document.js";
import DocumentShare from "../models/DocumentShare.js";
import { converseWithChatbot } from "../services/chatbotService.js";
import { createRealTimeAlert } from "../utils/alertCreator.js";

const router = express.Router();

const MAX_CONTEXT_DOCS = 5;
const MAX_SNIPPET_LENGTH = 3500;
const MIN_SNIPPET_LENGTH = 1500;

// POST /api/chatbot/converse
// body: { message: string }
router.post("/converse", auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: "Message is required" });

    const userInfo = req.user || {};

    // Always pull from cross-agency approved shares
    const shares = await DocumentShare.find({
      approvalStatus: "approved",
      scope: "cross-agency",
    })
      .populate("documentId")
      .sort({ sharedAt: -1 })
      .limit(50);

    console.log(`[Chatbot] Found ${shares.length} approved cross-agency shares`);

    const docs = shares
      .map((share) => share.documentId)
      .filter((doc) => {
        if (!doc) {
          console.log("[Chatbot] Warning: Share has null/missing documentId (document may have been deleted)");
          return false;
        }
        const hasContent = doc.text || (doc.chunks && doc.chunks.length);
        if (!hasContent) {
          console.log(`[Chatbot] Warning: Document ${doc._id} (${doc.filename}) has no text or chunks`);
        }
        return hasContent;
      });

    console.log(`[Chatbot] ${docs.length} documents have usable content`);

    const { combinedText, sources } = buildContextPayload(message, docs);

    const messages = [{ role: "user", content: `User: ${message.trim()}` }];

    const { reply, usedSources } = await converseWithChatbot({
      messages,
      userContext: userInfo,
      contextText: combinedText,
      sources,
    });

    res.json({
      reply,
      docsCount: usedSources.length,
      sources: usedSources,
      scannedDocs: docs.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Chatbot error" });
  }
});

// POST /api/chatbot/share
// body: { docId: string, scope: 'agency'|'cross-agency'|'specific-agencies', visibleToAgencies?: [string] }
router.post("/share", auth, async (req, res) => {
  try {
    const { docId, scope = "agency", visibleToAgencies = [] } = req.body;
    if (!docId) return res.status(400).json({ error: "docId required" });

    const doc = await Document.findById(docId);
    if (!doc) return res.status(404).json({ error: "Document not found" });

    // Only uploader can initiate sharing
    if (doc.uploadedBy !== req.user.username) {
      return res.status(403).json({ error: "Only uploader can change sharing" });
    }

    // Create or update DocumentShare entry - auto-approve all shares
    const shareEntry = await DocumentShare.findOneAndUpdate(
      { documentId: docId, scope, uploadedBy: req.user.username },
      {
        documentId: docId,
        uploadedBy: req.user.username,
        uploadedByAgency: req.user.agency,
        scope,
        visibleToAgencies,
        approvalStatus: "approved",
        approvedBy: req.user.username,
        approvedAt: new Date(),
        sharedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Create alert for cross-agency sharing
    if (scope === "cross-agency") {
      await createRealTimeAlert({
        type: "cross_agency",
        severity: "medium",
        title: `Document Shared Cross-Agency: ${doc.filename}`,
        description: `${doc.filename} has been shared for cross-agency collaboration by ${req.user.username} from ${req.user.agency}`,
        agencies: [], // Empty array means all agencies can see
        details: {
          documentIds: [{
            id: doc._id,
            type: "Document"
          }],
          metadata: {
            filename: doc.filename,
            sharedBy: req.user.username,
            fromAgency: req.user.agency,
            shareId: shareEntry._id
          }
        }
      });
    }

    res.json({ 
      success: true, 
      shareId: shareEntry._id,
      status: shareEntry.approvalStatus,
      message: `Document shared successfully for ${scope} collaboration`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Share failed" });
  }
});

// GET /api/chatbot/pending-approval
// Admin endpoint: list shares pending cross-agency approval
router.get("/pending-approval", auth, async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    if (!isAdmin) return res.status(403).json({ error: "Admin only" });

    // Fetch pending shares with populated document info
    const pending = await DocumentShare.find({
      approvalStatus: "pending",
      scope: "cross-agency"
    })
      .populate("documentId")
      .sort({ createdAt: -1 });

    res.json({ pending });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Fetch pending failed" });
  }
});

// POST /api/chatbot/approve
// Admin endpoint: approve a share for cross-agency visibility
router.post("/approve", auth, async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    if (!isAdmin) return res.status(403).json({ error: "Admin only" });

    const { shareId, approve } = req.body;
    if (!shareId) return res.status(400).json({ error: "shareId required" });

    const share = await DocumentShare.findById(shareId);
    if (!share) return res.status(404).json({ error: "Share not found" });

    if (approve) {
      share.approvalStatus = "approved";
      share.approvedBy = req.user.username;
      share.approvedAt = new Date();
    } else {
      share.approvalStatus = "rejected";
      share.approvedBy = req.user.username;
      share.approvedAt = new Date();
    }

    await share.save();

    res.json({ success: true, status: share.approvalStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Approval failed" });
  }
});

function buildContextPayload(message = "", docs = []) {
  if (!docs.length) return { combinedText: "", sources: [] };

  const keywords = extractKeywords(message);

  const scoredDocs = docs
    .map((doc) => {
      const snippet = selectSnippet(doc, keywords);
      const score = computeDocScore(doc, snippet, keywords);
      return { doc, snippet, score };
    })
    .sort((a, b) => b.score - a.score);

  const topDocs = scoredDocs.slice(0, MAX_CONTEXT_DOCS);

  const combinedText = topDocs
    .map(({ doc, snippet }) => {
      const header = `FILE: ${doc.filename || "Untitled"} | AGENCY: ${doc.agency || "Unknown"}`;
      return `${header}\n${snippet}`;
    })
    .join("\n\n");

  const sources = topDocs.map(({ doc, snippet }) => ({
    id: doc._id,
    filename: doc.filename,
    agency: doc.agency,
    snippet,
    createdAt: doc.createdAt,
  }));

  return { combinedText, sources };
}

function extractKeywords(message = "") {
  const words = message
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((word) => word.length > 2);
  
  // Include common question words and important terms
  const importantTerms = ['who', 'what', 'when', 'where', 'why', 'how', 'tell', 'about', 'incident', 'case', 'report'];
  const allKeywords = [...new Set([...words, ...importantTerms.filter(term => message.toLowerCase().includes(term))])];
  
  return allKeywords;
}

function computeDocScore(doc, snippet, keywords) {
  const recencyBoost = doc.createdAt ? doc.createdAt.getTime() / 1e12 : 0;
  const baseScore = keywords.length ? keywords.reduce((score, word) => {
    const text = `${doc.filename || ""} ${doc.text || ""}`.toLowerCase();
    return score + (text.includes(word) ? 1 : 0);
  }, 0) : 0;
  const snippetScore = keywords.length ? keywords.reduce((score, word) => {
    const lowerSnippet = snippet.toLowerCase();
    return score + (lowerSnippet.includes(word) ? 1 : 0);
  }, 0) : 1;
  return baseScore + snippetScore + recencyBoost;
}

function selectSnippet(doc, keywords) {
  // If document has no chunks, use full text (up to limit)
  if (!doc.chunks || doc.chunks.length === 0) {
    const fullText = doc.text || "";
    if (fullText.length <= MAX_SNIPPET_LENGTH) {
      return fullText; // Return full document if it fits
    }
    // For longer documents without chunks, try to find the most relevant section
    return extractRelevantSection(fullText, keywords);
  }

  // If document has chunks, find the best matching chunks
  const scored = doc.chunks
    .filter(Boolean)
    .map((chunk) => ({
      chunk,
      score: keywords.length
        ? keywords.reduce((total, word) => total + (chunk.toLowerCase().includes(word) ? 1 : 0), 0)
        : 0,
    }))
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return "";

  // Combine top chunks up to the max length
  let combinedSnippet = scored[0].chunk;
  for (let i = 1; i < scored.length && combinedSnippet.length < MIN_SNIPPET_LENGTH; i++) {
    const nextChunk = scored[i].chunk;
    if (combinedSnippet.length + nextChunk.length <= MAX_SNIPPET_LENGTH) {
      combinedSnippet += "\n\n" + nextChunk;
    }
  }

  return truncateSnippet(combinedSnippet);
}

function extractRelevantSection(text, keywords) {
  if (!keywords.length) {
    return truncateSnippet(text);
  }

  // Find the position of the first keyword match
  let bestPosition = 0;
  let maxMatches = 0;

  // Scan through the text in windows to find the most keyword-dense section
  const windowSize = MAX_SNIPPET_LENGTH;
  for (let i = 0; i < text.length - windowSize; i += Math.floor(windowSize / 2)) {
    const window = text.slice(i, i + windowSize).toLowerCase();
    const matches = keywords.reduce((count, word) => count + (window.includes(word) ? 1 : 0), 0);
    if (matches > maxMatches) {
      maxMatches = matches;
      bestPosition = i;
    }
  }

  // Extract from the best position, trying to start at a sentence boundary
  let startPos = bestPosition;
  if (startPos > 0) {
    const sentenceStart = text.lastIndexOf('. ', startPos + 100);
    if (sentenceStart > bestPosition - 200 && sentenceStart !== -1) {
      startPos = sentenceStart + 2;
    }
  }

  return truncateSnippet(text.slice(startPos));
}

function truncateSnippet(text = "") {
  if (text.length <= MAX_SNIPPET_LENGTH) {
    return text.trim();
  }
  
  // Try to truncate at a sentence boundary
  const truncated = text.slice(0, MAX_SNIPPET_LENGTH);
  const lastPeriod = truncated.lastIndexOf('.');
  const lastNewline = truncated.lastIndexOf('\n');
  
  const cutoff = Math.max(lastPeriod, lastNewline);
  if (cutoff > MAX_SNIPPET_LENGTH * 0.8) {
    return text.slice(0, cutoff + 1).trim();
  }
  
  return truncated.trim() + "...";
}

export default router;
