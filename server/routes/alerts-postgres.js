import express from "express";
import { Op } from "sequelize";
import AlertSQL from "../models/sql/Alert.js";
import AlertAgencySQL from "../models/sql/AlertAgency.js";
import AlertDocumentSQL from "../models/sql/AlertDocument.js";
import AlertReadBySQL from "../models/sql/AlertReadBy.js";
import AlertNotificationSQL from "../models/sql/AlertNotification.js";
import Alert from "../models/Alert.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();
const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

router.get("/", authMiddleware, async (req, res) => {
  try {
    const { status, severity, type, limit = 50 } = req.query;
    const userAgency = req.user.agency;

    if (USE_POSTGRES) {
      const whereClause = {};
      if (status) whereClause.status = status;
      if (severity) whereClause.severity = severity;
      if (type) whereClause.type = type;

      const alerts = await AlertSQL.findAll({
        where: whereClause,
        include: [
          {
            model: AlertAgencySQL,
            as: 'alertAgencies',
            where: {
              agency: userAgency
            },
            required: false
          },
          {
            model: AlertDocumentSQL,
            as: 'alertDocuments',
            required: false
          },
          {
            model: AlertReadBySQL,
            as: 'readByUsers',
            required: false
          },
          {
            model: AlertNotificationSQL,
            as: 'notifications',
            required: false
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit)
      });

      const filteredAlerts = alerts.filter(alert => {
        const hasAgencies = alert.alertAgencies && alert.alertAgencies.length > 0;
        return !hasAgencies || alert.alertAgencies.some(aa => aa.agency === userAgency);
      });

      console.log(`[PostgreSQL] Fetched ${filteredAlerts.length} alerts for ${userAgency}`);
      res.json(filteredAlerts);
    } else {
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

      console.log(`[MongoDB] Fetched ${alerts.length} alerts for ${userAgency}`);
      res.json(alerts);
    }
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const userAgency = req.user.agency;

    if (USE_POSTGRES) {
      const count = await AlertSQL.count({
        where: { status: 'unread' },
        include: [{
          model: AlertAgencySQL,
          as: 'alertAgencies',
          where: { agency: userAgency },
          required: false
        }]
      });

      console.log(`[PostgreSQL] Unread count for ${userAgency}: ${count}`);
      res.json({ count });
    } else {
      const count = await Alert.countDocuments({
        $or: [
          { agencies: userAgency },
          { agencies: { $size: 0 } }
        ],
        status: "unread"
      });

      console.log(`[MongoDB] Unread count for ${userAgency}: ${count}`);
      res.json({ count });
    }
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const alertId = req.params.id;
    
    if (!alertId || alertId === 'undefined' || alertId === 'null') {
      console.error(`[Error] Invalid alert ID: ${alertId}`);
      return res.status(400).json({ error: "Invalid alert ID" });
    }

    if (USE_POSTGRES) {
      // PostgreSQL uses integer IDs
      const numericId = parseInt(alertId);
      if (isNaN(numericId)) {
        // Not a valid PostgreSQL ID, try MongoDB
        console.log(`[PostgreSQL] Invalid numeric ID, trying MongoDB: ${alertId}`);
        try {
          const mongoAlert = await Alert.findById(alertId).populate("relatedEvent");
          if (mongoAlert) {
            console.log(`[Fallback] Found alert in MongoDB`);
            return res.json(mongoAlert);
          }
        } catch (mongoError) {
          console.error(`[MongoDB] Error: ${mongoError.message}`);
        }
        return res.status(404).json({ error: "Alert not found" });
      }

      const alert = await AlertSQL.findByPk(numericId, {
        include: [
          { model: AlertAgencySQL, as: 'alertAgencies' },
          { model: AlertDocumentSQL, as: 'alertDocuments' },
          { model: AlertReadBySQL, as: 'readByUsers' },
          { model: AlertNotificationSQL, as: 'notifications' }
        ]
      });

      if (!alert) {
        console.log(`[PostgreSQL] Alert not found, checking MongoDB: ${alertId}`);
        try {
          const mongoAlert = await Alert.findById(alertId).populate("relatedEvent");
          if (mongoAlert) {
            console.log(`[Fallback] Found alert in MongoDB`);
            return res.json(mongoAlert);
          }
        } catch (mongoError) {
          console.error(`[MongoDB] Error: ${mongoError.message}`);
        }
        return res.status(404).json({ error: "Alert not found" });
      }

      console.log(`[PostgreSQL] Found alert: ${alert.id}`);
      res.json(alert);
    } else {
      const alert = await Alert.findById(alertId).populate("relatedEvent");
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }
      console.log(`[MongoDB] Found alert: ${alert._id}`);
      res.json(alert);
    }
  } catch (error) {
    console.error("Error fetching alert:", error);
    res.status(500).json({ error: "Failed to fetch alert", details: error.message });
  }
});

router.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    if (USE_POSTGRES) {
      const alert = await AlertSQL.findByPk(req.params.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      alert.status = 'read';
      await alert.save();

      await AlertReadBySQL.create({
        alert_id: alert.id,
        user_id: req.user.id || 'unknown',
        read_at: new Date()
      });

      const updatedAlert = await AlertSQL.findByPk(req.params.id, {
        include: [
          { model: AlertAgencySQL, as: 'alertAgencies' },
          { model: AlertReadBySQL, as: 'readByUsers' }
        ]
      });

      console.log(`[PostgreSQL] Alert marked as read: ${req.params.id}`);
      res.json(updatedAlert);
    } else {
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
    }
  } catch (error) {
    console.error("Error marking alert as read:", error);
    res.status(500).json({ error: "Failed to mark alert as read" });
  }
});

router.patch("/:id/acknowledge", authMiddleware, async (req, res) => {
  try {
    const { actionTaken } = req.body;

    if (USE_POSTGRES) {
      const alert = await AlertSQL.findByPk(req.params.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      alert.status = 'acknowledged';
      alert.acknowledged_by_user_id = req.user.id || 'unknown';
      alert.acknowledged_at = new Date();
      alert.action_taken = actionTaken || '';
      await alert.save();

      console.log(`[PostgreSQL] Alert acknowledged: ${req.params.id}`);
      res.json(alert);
    } else {
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
    }
  } catch (error) {
    console.error("Error acknowledging alert:", error);
    res.status(500).json({ error: "Failed to acknowledge alert" });
  }
});

router.patch("/:id/dismiss", authMiddleware, async (req, res) => {
  try {
    if (USE_POSTGRES) {
      const alert = await AlertSQL.findByPk(req.params.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      alert.status = 'dismissed';
      await alert.save();

      console.log(`[PostgreSQL] Alert dismissed: ${req.params.id}`);
      res.json(alert);
    } else {
      const alert = await Alert.findByIdAndUpdate(
        req.params.id,
        { status: "dismissed" },
        { new: true }
      );

      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      res.json(alert);
    }
  } catch (error) {
    console.error("Error dismissing alert:", error);
    res.status(500).json({ error: "Failed to dismiss alert" });
  }
});

router.post("/:id/notify-agencies", authMiddleware, async (req, res) => {
  try {
    const { agencies, method = "internal", message } = req.body;

    if (USE_POSTGRES) {
      const alert = await AlertSQL.findByPk(req.params.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      const notifications = agencies.map(agency => ({
        alert_id: alert.id,
        agency,
        notified_at: new Date(),
        method,
        status: 'sent'
      }));

      await AlertNotificationSQL.bulkCreate(notifications);

      const io = req.app.get("io");
      console.log(`[PostgreSQL] Emitting agency notifications to: ${agencies.join(', ')}`);
      agencies.forEach(agency => {
        io.emit(`alert:agency:${agency}`, {
          alert: alert.toJSON(),
          message,
          notifiedBy: req.user.agency
        });
      });

      res.json({ 
        success: true, 
        alert,
        notifiedCount: agencies.length 
      });
    } else {
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
    }
  } catch (error) {
    console.error("Error notifying agencies:", error);
    res.status(500).json({ error: "Failed to notify agencies" });
  }
});

router.post("/create", authMiddleware, async (req, res) => {
  try {
    const alertData = req.body;
    
    if (USE_POSTGRES) {
      const alert = await AlertSQL.create({
        type: alertData.type,
        severity: alertData.severity,
        title: alertData.title,
        description: alertData.description,
        status: alertData.status || 'unread',
        triggered_by: req.user.username || "AI",
        action_taken: alertData.actionTaken || '',
        related_event_id: alertData.relatedEvent || null,
        expires_at: alertData.expiresAt || null,
        details_json: alertData.details || null
      });

      if (alertData.agencies && alertData.agencies.length > 0) {
        const agencyRecords = alertData.agencies.map(agency => ({
          alert_id: alert.id,
          agency
        }));
        await AlertAgencySQL.bulkCreate(agencyRecords);
      }

      if (alertData.details?.documentIds && alertData.details.documentIds.length > 0) {
        const docRecords = alertData.details.documentIds.map(doc => ({
          alert_id: alert.id,
          document_id: doc.id,
          document_type: doc.type
        }));
        await AlertDocumentSQL.bulkCreate(docRecords);
      }

      const io = req.app.get("io");
      if (alertData.agencies && alertData.agencies.length > 0) {
        alertData.agencies.forEach(agency => {
          io.emit(`alert:${agency}`, alert.toJSON());
        });
      } else {
        io.emit("alert:all", alert.toJSON());
      }

      console.log(`[PostgreSQL] Alert created: ${alert.id}`);
      res.json(alert);
    } else {
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
    }
  } catch (error) {
    console.error("Error creating alert:", error);
    res.status(500).json({ error: "Failed to create alert" });
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (USE_POSTGRES) {
      const alert = await AlertSQL.findByPk(req.params.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      await alert.destroy();
      console.log(`[PostgreSQL] Alert deleted: ${req.params.id}`);
      res.json({ success: true, message: "Alert deleted" });
    } else {
      const alert = await Alert.findByIdAndDelete(req.params.id);
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      res.json({ success: true, message: "Alert deleted" });
    }
  } catch (error) {
    console.error("Error deleting alert:", error);
    res.status(500).json({ error: "Failed to delete alert" });
  }
});

export async function createRealTimeAlert(alertData) {
  try {
    if (USE_POSTGRES) {
      const alert = await AlertSQL.create({
        type: alertData.type,
        severity: alertData.severity,
        title: alertData.title,
        description: alertData.description,
        status: alertData.status || 'unread',
        triggered_by: "System",
        action_taken: alertData.actionTaken || '',
        related_event_id: alertData.relatedEvent || null,
        expires_at: alertData.expiresAt || null,
        details_json: alertData.details || null
      });

      if (alertData.agencies && alertData.agencies.length > 0) {
        const agencyRecords = alertData.agencies.map(agency => ({
          alert_id: alert.id,
          agency
        }));
        await AlertAgencySQL.bulkCreate(agencyRecords);
      }

      if (alertData.details?.documentIds && alertData.details.documentIds.length > 0) {
        const docRecords = alertData.details.documentIds.map(doc => ({
          alert_id: alert.id,
          document_id: doc.id,
          document_type: doc.type
        }));
        await AlertDocumentSQL.bulkCreate(docRecords);
      }

      const io = global.io;
      if (io) {
        if (alertData.agencies && alertData.agencies.length > 0) {
          alertData.agencies.forEach(agency => {
            io.emit(`alert:${agency}`, alert.toJSON());
          });
        } else {
          io.emit("alert:all", alert.toJSON());
        }
      }

      console.log(`[PostgreSQL] Real-time alert created: ${alert.id}`);
      return alert;
    } else {
      const alert = new Alert({
        ...alertData,
        triggeredBy: "System"
      });

      await alert.save();

      const io = global.io;
      if (io) {
        if (alert.agencies && alert.agencies.length > 0) {
          alert.agencies.forEach(agency => {
            io.emit(`alert:${agency}`, alert.toObject());
          });
        } else {
          io.emit("alert:all", alert.toObject());
        }
      }

      return alert;
    }
  } catch (error) {
    console.error("Error creating real-time alert:", error);
    return null;
  }
}

export default router;
