import express from "express";
import Alert from "../models/Alert.js";
import Event from "../models/Event.js";
import Document from "../models/Document.js";
import OcrDocument from "../models/OcrDocument.js";
import Transcription from "../models/Transcription.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { status, severity, type, limit = 50 } = req.query;
    const userAgency = req.user.agency;

    const filter = {
      $or: [
        { agencies: userAgency },
        { agencies: { $size: 0 } }
      ]
    };

    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (type) filter.type = type;

    const alerts = await Alert.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("relatedEvent", "title status severityScore");

    res.json(alerts);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const userAgency = req.user.agency;

    const count = await Alert.countDocuments({
      $or: [
        { agencies: userAgency },
        { agencies: { $size: 0 } }
      ],
      status: "unread"
    });

    res.json({ count });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate("relatedEvent");

    if (!alert) {
      return res.status(404).json({ error: "Alert not found" });
    }

    res.json(alert);
  } catch (error) {
    console.error("Error fetching alert:", error);
    res.status(500).json({ error: "Failed to fetch alert" });
  }
});

router.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      {
        status: "read",
        $push: {
          readBy: {
            userId: req.user.id,
            readAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: "Alert not found" });
    }

    res.json(alert);
  } catch (error) {
    console.error("Error marking alert as read:", error);
    res.status(500).json({ error: "Failed to mark alert as read" });
  }
});

router.patch("/:id/acknowledge", authMiddleware, async (req, res) => {
  try {
    const { actionTaken } = req.body;

    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      {
        status: "acknowledged",
        acknowledgedBy: {
          userId: req.user.id,
          acknowledgedAt: new Date()
        },
        actionTaken: actionTaken || ""
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: "Alert not found" });
    }

    res.json(alert);
  } catch (error) {
    console.error("Error acknowledging alert:", error);
    res.status(500).json({ error: "Failed to acknowledge alert" });
  }
});

router.patch("/:id/dismiss", authMiddleware, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { status: "dismissed" },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: "Alert not found" });
    }

    res.json(alert);
  } catch (error) {
    console.error("Error dismissing alert:", error);
    res.status(500).json({ error: "Failed to dismiss alert" });
  }
});

router.post("/:id/notify-agencies", authMiddleware, async (req, res) => {
  try {
    const { agencies, method = "internal", message } = req.body;
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ error: "Alert not found" });
    }

    const notifications = agencies.map(agency => ({
      agency,
      notifiedAt: new Date(),
      method,
      status: "sent"
    }));

    alert.notifiedAgencies.push(...notifications);
    await alert.save();

    const io = req.app.get("io");
    agencies.forEach(agency => {
      io.emit(`alert:agency:${agency}`, {
        alert: alert.toObject(),
        message,
        notifiedBy: req.user.agency
      });
    });

    res.json({ 
      success: true, 
      alert,
      notifiedCount: agencies.length 
    });
  } catch (error) {
    console.error("Error notifying agencies:", error);
    res.status(500).json({ error: "Failed to notify agencies" });
  }
});

router.post("/create", authMiddleware, async (req, res) => {
  try {
    const alertData = req.body;
    
    const alert = new Alert({
      ...alertData,
      triggeredBy: req.user.username || "AI"
    });

    await alert.save();

    const io = req.app.get("io");
    
    if (alert.agencies && alert.agencies.length > 0) {
      alert.agencies.forEach(agency => {
        io.emit(`alert:${agency}`, alert.toObject());
      });
    } else {
      io.emit("alert:all", alert.toObject());
    }

    res.json(alert);
  } catch (error) {
    console.error("Error creating alert:", error);
    res.status(500).json({ error: "Failed to create alert" });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndDelete(req.params.id);

    if (!alert) {
      return res.status(404).json({ error: "Alert not found" });
    }

    res.json({ success: true, message: "Alert deleted" });
  } catch (error) {
    console.error("Error deleting alert:", error);
    res.status(500).json({ error: "Failed to delete alert" });
  }
});

export default router;
