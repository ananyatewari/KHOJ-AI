import express from "express";
import auth from "../middleware/auth.js";
import Document from "../models/Document.js";
import DocumentShare from "../models/DocumentShare.js";
import { converseWithChatbot } from "../services/chatbotService.js";

const router = express.Router();

// POST /api/chatbot/converse
// body: { message: string, context?: string, scope?: 'mine'|'agency'|'cross-agency' }
router.post("/converse", auth, async (req, res) => {
  try {
    const { message, context, scope = "agency" } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: "Message is required" });

    const userInfo = req.user || {};
    const userAgency = userInfo.agency;

    // Query DocumentShare to find approved shares
    let shareQuery = { approvalStatus: "approved" };

    if (scope === "cross-agency") {
      // Cross-agency: include shares with scope 'cross-agency' or matching specific-agencies
      shareQuery.scope = { $in: ["cross-agency"] };
    } else if (scope === "mine") {
      // Only my docs
      shareQuery.uploadedBy = userInfo.username;
    } else {
      // default 'agency': docs shared within the same agency (no approval needed)
      shareQuery.uploadedByAgency = userAgency;
    }

    // Fetch approved shares
    const shares = await DocumentShare.find(shareQuery)
      .populate("documentId")
      .sort({ createdAt: -1 })
      .limit(15);

    // Extract documents and combine text
    const docs = shares
      .map(s => s.documentId)
      .filter(d => d && d.text);

    const combinedText = docs
      .map(d => `--- ${d.filename} (${d.agency}) ---\n${d.text}`)
      .join("\n\n")
      .slice(0, 12000);

    const messages = [{ role: "user", content: `User: ${message}` }];
    if (context) messages.push({ role: "user", content: `Context: ${context}` });

    const reply = await converseWithChatbot({ messages, userContext: userInfo, contextText: combinedText });

    res.json({ reply, docsCount: docs.length });
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

    // Create or update DocumentShare entry
    const shareEntry = await DocumentShare.findOneAndUpdate(
      { documentId: docId, scope, uploadedBy: req.user.username },
      {
        documentId: docId,
        uploadedBy: req.user.username,
        uploadedByAgency: req.user.agency,
        scope,
        visibleToAgencies,
        approvalStatus: scope === "agency" ? "approved" : "pending",
        sharedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({ 
      success: true, 
      shareId: shareEntry._id,
      status: shareEntry.approvalStatus,
      message: scope === "agency" 
        ? "Shared with your agency" 
        : `Pending admin approval for ${scope}`
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

export default router;
