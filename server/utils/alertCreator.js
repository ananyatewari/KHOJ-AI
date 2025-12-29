import Alert from "../models/Alert.js";
import AlertSQL from "../models/sql/Alert.js";
import AlertAgencySQL from "../models/sql/AlertAgency.js";
import AlertDocumentSQL from "../models/sql/AlertDocument.js";

const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

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

      console.log("[PostgreSQL] Alert created successfully:", alert.title);
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

      console.log("[MongoDB] Alert created successfully:", alert.title);
      return alert;
    }
  } catch (error) {
    console.error("Error creating real-time alert:", error);
    return null;
  }
}
