import express from "express";
import Event from "../models/Event.js";
import Document from "../models/Document.js";
import OcrDocument from "../models/OcrDocument.js";
import Transcription from "../models/Transcription.js";
import auth from "../middleware/auth.js";
import { updateEventTitle } from "../services/eventLinking.js";
import { findSimilarCrossAgencyEvents, findSimilarEventsForDocument } from "../services/crossAgencyMatching.js";

const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const { agency } = req.user;
    const { status, limit = 50, sortBy = "lastUpdated" } = req.query;
    
    const query = {
      agencies: agency
    };
    
    if (status) {
      query.status = status;
    }
    
    let sortOptions = {};
    switch (sortBy) {
      case "severity":
        sortOptions = { severityScore: -1 };
        break;
      case "confidence":
        sortOptions = { confidenceScore: -1 };
        break;
      case "documents":
        sortOptions = { "metadata.totalDocuments": -1 };
        break;
      case "lastUpdated":
      default:
        sortOptions = { "timeline.lastUpdated": -1 };
    }
    
    const events = await Event.find(query)
      .sort(sortOptions)
      .limit(parseInt(limit));
    
    res.json({ events });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.get("/active", auth, async (req, res) => {
  try {
    const { agency } = req.user;
    
    const activeEvents = await Event.find({
      agencies: agency,
      status: { $in: ["active", "monitoring"] }
    })
      .sort({ severityScore: -1, "timeline.lastUpdated": -1 })
      .limit(20);
    
    res.json({ events: activeEvents });
  } catch (error) {
    console.error("Error fetching active events:", error);
    res.status(500).json({ error: "Failed to fetch active events" });
  }
});

router.get("/:eventId", auth, async (req, res) => {
  try {
    const { agency } = req.user;
    const { eventId } = req.params;
    
    const event = await Event.findOne({
      _id: eventId,
      agencies: agency
    });
    
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    const documentDetails = await Promise.all(
      event.documents.map(async (doc) => {
        let document = null;
        
        switch (doc.documentType) {
          case "Document":
            document = await Document.findById(doc.documentId);
            break;
          case "OcrDocument":
            document = await OcrDocument.findById(doc.documentId);
            break;
          case "Transcription":
            document = await Transcription.findById(doc.documentId);
            break;
        }
        
        if (!document) return null;
        
        return {
          _id: document._id,
          filename: document.filename || document.originalFilename,
          type: doc.documentType,
          createdAt: document.createdAt,
          uploadedBy: document.uploadedBy,
          agency: document.agency,
          relevanceScore: doc.relevanceScore,
          addedAt: doc.addedAt,
          entities: document.entities,
          text: document.text || null,
          transcript: document.transcript || null,
          transcription: document.transcript || null,
          aiSummary: document.aiSummary || null
        };
      })
    );
    
    const filteredDocuments = documentDetails.filter(d => d !== null);
    
    res.json({
      event,
      documents: filteredDocuments
    });
  } catch (error) {
    console.error("Error fetching event details:", error);
    res.status(500).json({ error: "Failed to fetch event details" });
  }
});

router.get("/:eventId/timeline", auth, async (req, res) => {
  try {
    const { agency } = req.user;
    const { eventId } = req.params;
    
    const event = await Event.findOne({
      _id: eventId,
      visibility: agency
    });
    
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    const timelineItems = await Promise.all(
      event.documents.map(async (doc) => {
        let document = null;
        
        switch (doc.documentType) {
          case "Document":
            document = await Document.findById(doc.documentId);
            break;
          case "OcrDocument":
            document = await OcrDocument.findById(doc.documentId);
            break;
          case "Transcription":
            document = await Transcription.findById(doc.documentId);
            break;
        }
        
        if (!document) return null;
        
        return {
          timestamp: document.createdAt,
          type: "document_added",
          documentId: document._id,
          documentType: doc.documentType,
          filename: document.filename || document.originalFilename,
          uploadedBy: document.uploadedBy,
          relevanceScore: doc.relevanceScore
        };
      })
    );
    
    const filteredTimeline = timelineItems
      .filter(item => item !== null)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    res.json({ timeline: filteredTimeline });
  } catch (error) {
    console.error("Error fetching event timeline:", error);
    res.status(500).json({ error: "Failed to fetch event timeline" });
  }
});

router.patch("/:eventId/status", auth, async (req, res) => {
  try {
    const { agency, username } = req.user;
    const { eventId } = req.params;
    const { status } = req.body;
    
    if (!["active", "monitoring", "resolved", "archived"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    
    const event = await Event.findOne({
      _id: eventId,
      agencies: agency
    });
    
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    event.status = status;
    await event.save();
    
    const io = req.app.get("io");
    if (io) {
      io.emit("event:updated", {
        eventId: event._id,
        status: event.status,
        updatedBy: username
      });
    }
    
    res.json({ event });
  } catch (error) {
    console.error("Error updating event status:", error);
    res.status(500).json({ error: "Failed to update event status" });
  }
});

router.patch("/:eventId/title", auth, async (req, res) => {
  try {
    const { agency } = req.user;
    const { eventId } = req.params;
    const { title } = req.body;
    
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: "Title is required" });
    }
    
    const event = await Event.findOne({
      _id: eventId,
      agencies: agency
    });
    
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    event.title = title.trim();
    await event.save();
    
    res.json({ event });
  } catch (error) {
    console.error("Error updating event title:", error);
    res.status(500).json({ error: "Failed to update event title" });
  }
});

router.post("/:eventId/regenerate-title", auth, async (req, res) => {
  try {
    const { agency } = req.user;
    const { eventId } = req.params;
    
    const event = await Event.findOne({
      _id: eventId,
      agencies: agency
    });
    
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    
    await updateEventTitle(eventId);
    
    const updatedEvent = await Event.findById(eventId);
    
    res.json({ event: updatedEvent });
  } catch (error) {
    console.error("Error regenerating event title:", error);
    res.status(500).json({ error: "Failed to regenerate event title" });
  }
});

router.get("/stats/summary", auth, async (req, res) => {
  try {
    const { agency } = req.user;
    
    const [activeCount, criticalCount, totalEvents, recentEvents] = await Promise.all([
      Event.countDocuments({
        agencies: agency,
        status: { $in: ["active", "monitoring"] }
      }),
      Event.countDocuments({
        agencies: agency,
        status: { $in: ["active", "monitoring"] },
        severityScore: { $gte: 70 }
      }),
      Event.countDocuments({
        agencies: agency
      }),
      Event.countDocuments({
        agencies: agency,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);
    
    res.json({
      activeEvents: activeCount,
      criticalEvents: criticalCount,
      totalEvents,
      recentEvents
    });
  } catch (error) {
    console.error("Error fetching event stats:", error);
    res.status(500).json({ error: "Failed to fetch event stats" });
  }
});

router.post("/:eventId/cross-agency-search", auth, async (req, res) => {
  try {
    const { agency } = req.user;
    const { eventId } = req.params;
    
    const event = await Event.findOne({
      _id: eventId,
      agencies: agency
    });
    
    if (!event) {
      return res.status(404).json({ error: "Event not found or access denied" });
    }
    
    const matches = await findSimilarCrossAgencyEvents(eventId, agency);
    
    res.json({
      sourceEvent: event,
      matches: matches.map(m => ({
        event: {
          _id: m.event._id,
          title: m.event.title,
          agencies: m.event.agencies,
          severityScore: m.event.severityScore,
          confidenceScore: m.event.confidenceScore,
          status: m.event.status,
          metadata: m.event.metadata,
          timeline: m.event.timeline
        },
        matchScore: m.matchScore,
        matchDetails: m.matchDetails
      }))
    });
  } catch (error) {
    console.error("Error finding cross-agency matches:", error);
    res.status(500).json({ error: "Failed to find cross-agency matches" });
  }
});

router.post("/document/:documentId/cross-agency-search", auth, async (req, res) => {
  try {
    const { agency } = req.user;
    const { documentId } = req.params;
    const { documentType = "Document" } = req.body;
    
    const matches = await findSimilarEventsForDocument(documentId, documentType, agency);
    
    res.json({
      documentId,
      documentType,
      matches: matches.map(m => ({
        event: {
          _id: m.event._id,
          title: m.event.title,
          agencies: m.event.agencies,
          severityScore: m.event.severityScore,
          confidenceScore: m.event.confidenceScore,
          status: m.event.status,
          metadata: m.event.metadata,
          timeline: m.event.timeline
        },
        matchScore: m.matchScore,
        matchDetails: m.matchDetails
      }))
    });
  } catch (error) {
    console.error("Error finding similar events for document:", error);
    res.status(500).json({ error: "Failed to find similar events" });
  }
});

router.get("/debug/all-events", auth, async (req, res) => {
  try {
    const { agency } = req.user;
    
    const allEvents = await Event.find({})
      .select('_id title agencies status metadata timeline')
      .sort({ createdAt: -1 })
      .limit(50);
    
    const myEvents = allEvents.filter(e => e.agencies.includes(agency));
    const otherEvents = allEvents.filter(e => !e.agencies.includes(agency));
    
    res.json({
      userAgency: agency,
      myEvents: myEvents.length,
      otherEvents: otherEvents.length,
      myEventsList: myEvents,
      otherEventsList: otherEvents
    });
  } catch (error) {
    console.error("Error fetching debug events:", error);
    res.status(500).json({ error: "Failed to fetch debug events" });
  }
});

export default router;
