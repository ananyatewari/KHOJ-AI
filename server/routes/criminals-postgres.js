import express from "express";
import { Op } from "sequelize";
import CriminalRecordSQL from "../models/sql/CriminalRecord.js";
import CriminalAliasSQL from "../models/sql/CriminalAlias.js";
import CourtCaseSQL from "../models/sql/CourtCase.js";
import CriminalOrganizationSQL from "../models/sql/CriminalOrganization.js";
import CriminalDocumentSQL from "../models/sql/CriminalDocument.js";
import CriminalRecord from "../models/CriminalRecord.js";
import Alert from "../models/Alert.js";
import AlertSQL from "../models/sql/Alert.js";
import AlertAgencySQL from "../models/sql/AlertAgency.js";
import authMiddleware from "../middleware/auth.js";
import { checkCriminalRecord, checkMCARecords, requestDetailedReport } from "../services/crimeCheckService.js";

const router = express.Router();
const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

// GET /api/criminals/check/:personName
router.get("/check/:personName", authMiddleware, async (req, res) => {
  try {
    const { personName } = req.params;
    const { location, dob } = req.query;

    const result = await checkCriminalRecord(personName, { location, dob });

    res.json({
      personName,
      hasRecord: result.hasRecord,
      recordCount: result.records?.length || 0,
      records: result.records || [],
      cached: result.cached || false,
      lastChecked: result.lastChecked,
      mock: result.mock || false
    });

  } catch (error) {
    console.error("Error checking criminal record:", error);
    res.status(500).json({ error: "Failed to check criminal record" });
  }
});

// GET /api/criminals/profile/:personName
router.get("/profile/:personName", authMiddleware, async (req, res) => {
  try {
    const { personName } = req.params;
    const userAgency = req.user.agency;

    if (USE_POSTGRES) {
      const criminalRecord = await CriminalRecordSQL.findOne({
        where: {
          name: {
            [Op.iLike]: personName
          }
        },
        include: [
          { model: CriminalAliasSQL, as: 'aliases' },
          { model: CourtCaseSQL, as: 'courtCases' },
          { model: CriminalOrganizationSQL, as: 'organizations' },
          { model: CriminalDocumentSQL, as: 'relatedDocuments' }
        ]
      });

      if (!criminalRecord) {
        console.log(`[PostgreSQL] Criminal record not found, checking MongoDB: ${personName}`);
        const mongoCriminal = await CriminalRecord.findOne({
          name: { $regex: new RegExp(`^${personName}$`, 'i') }
        });
        
        if (!mongoCriminal) {
          return res.status(404).json({ error: "No criminal record found" });
        }

        // Return MongoDB data
        const mongoAlerts = await Alert.find({
          type: "criminal_match",
          "details.criminalRecord.personName": { $regex: new RegExp(`^${personName}$`, 'i') },
          $or: [
            { agencies: userAgency },
            { agencies: { $size: 0 } }
          ]
        }).sort({ createdAt: -1 }).limit(10);

        return res.json({
          profile: {
            name: mongoCriminal.name,
            aliases: mongoCriminal.aliases,
            hasRecord: mongoCriminal.hasRecord,
            riskLevel: mongoCriminal.riskLevel,
            courtCases: mongoCriminal.courtCases,
            activeWarrants: mongoCriminal.activeWarrants,
            convictionCount: mongoCriminal.convictionCount,
            lastKnownLocation: mongoCriminal.lastKnownLocation,
            checkCount: mongoCriminal.checkCount,
            lastChecked: mongoCriminal.lastChecked,
            source: mongoCriminal.source
          },
          relatedDocuments: [],
          alerts: mongoAlerts.map(a => ({
            _id: a._id,
            severity: a.severity,
            title: a.title,
            description: a.description,
            status: a.status,
            createdAt: a.createdAt
          }))
        });
      }

      // Get related alerts from PostgreSQL
      const alerts = await AlertSQL.findAll({
        where: {
          type: "criminal_match"
        },
        include: [{
          model: AlertAgencySQL,
          as: 'alertAgencies',
          where: {
            agency: userAgency
          },
          required: false
        }],
        order: [['created_at', 'DESC']],
        limit: 10
      });

      // Get related documents
      const Document = (await import("../models/Document.js")).default;
      const OcrDocument = (await import("../models/OcrDocument.js")).default;
      const Transcription = (await import("../models/Transcription.js")).default;

      const relatedDocs = [];
      
      for (const docRef of criminalRecord.relatedDocuments) {
        let doc = null;
        
        switch (docRef.document_type) {
          case "Document":
            doc = await Document.findOne({
              _id: docRef.document_id,
              visibility: userAgency
            }).select("filename createdAt uploadedBy agency");
            break;
          case "OcrDocument":
            doc = await OcrDocument.findOne({
              _id: docRef.document_id,
              visibility: userAgency
            }).select("originalFilename createdAt uploadedBy agency");
            break;
          case "Transcription":
            doc = await Transcription.findOne({
              _id: docRef.document_id,
              visibility: userAgency
            }).select("filename createdAt uploadedBy agency");
            break;
        }

        if (doc) {
          relatedDocs.push({
            _id: doc._id,
            filename: doc.filename || doc.originalFilename,
            type: docRef.document_type,
            createdAt: doc.createdAt,
            uploadedBy: doc.uploadedBy,
            agency: doc.agency,
            detectedAt: docRef.detected_at
          });
        }
      }

      console.log(`[PostgreSQL] Found criminal profile: ${criminalRecord.name}`);
      res.json({
        profile: {
          name: criminalRecord.name,
          aliases: criminalRecord.aliases.map(a => a.alias_name),
          hasRecord: criminalRecord.has_record,
          riskLevel: criminalRecord.risk_level,
          courtCases: criminalRecord.courtCases.map(c => ({
            caseNumber: c.case_number,
            charges: c.charges,
            court: c.court,
            state: c.state,
            filedDate: c.filed_date,
            status: c.status,
            verdict: c.verdict,
            nextHearing: c.next_hearing,
            severity: c.severity,
            description: c.description,
            amountInvolved: c.amount_involved
          })),
          activeWarrants: criminalRecord.active_warrants,
          convictionCount: criminalRecord.conviction_count,
          lastKnownLocation: criminalRecord.last_known_location,
          checkCount: criminalRecord.check_count,
          lastChecked: criminalRecord.last_checked,
          source: criminalRecord.source,
          associatedOrganizations: criminalRecord.organizations.map(o => o.organization_name)
        },
        relatedDocuments: relatedDocs,
        alerts: alerts.map(a => ({
          id: a.id,
          severity: a.severity,
          title: a.title,
          description: a.description,
          status: a.status,
          createdAt: a.created_at
        }))
      });

    } else {
      // MongoDB implementation
      const criminalRecord = await CriminalRecord.findOne({
        name: { $regex: new RegExp(`^${personName}$`, 'i') }
      });

      if (!criminalRecord) {
        return res.status(404).json({ error: "No criminal record found" });
      }

      const alerts = await Alert.find({
        type: "criminal_match",
        "details.criminalRecord.personName": { $regex: new RegExp(`^${personName}$`, 'i') },
        $or: [
          { agencies: userAgency },
          { agencies: { $size: 0 } }
        ]
      }).sort({ createdAt: -1 }).limit(10);

      const Document = (await import("../models/Document.js")).default;
      const OcrDocument = (await import("../models/OcrDocument.js")).default;
      const Transcription = (await import("../models/Transcription.js")).default;

      const relatedDocs = [];
      
      for (const docRef of criminalRecord.relatedDocuments) {
        let doc = null;
        
        switch (docRef.documentType) {
          case "Document":
            doc = await Document.findOne({
              _id: docRef.documentId,
              visibility: userAgency
            }).select("filename createdAt uploadedBy agency");
            break;
          case "OcrDocument":
            doc = await OcrDocument.findOne({
              _id: docRef.documentId,
              visibility: userAgency
            }).select("originalFilename createdAt uploadedBy agency");
            break;
          case "Transcription":
            doc = await Transcription.findOne({
              _id: docRef.documentId,
              visibility: userAgency
            }).select("filename createdAt uploadedBy agency");
            break;
        }

        if (doc) {
          relatedDocs.push({
            _id: doc._id,
            filename: doc.filename || doc.originalFilename,
            type: docRef.documentType,
            createdAt: doc.createdAt,
            uploadedBy: doc.uploadedBy,
            agency: doc.agency,
            detectedAt: docRef.detectedAt
          });
        }
      }

      console.log(`[MongoDB] Found criminal profile: ${criminalRecord.name}`);
      res.json({
        profile: {
          name: criminalRecord.name,
          aliases: criminalRecord.aliases,
          hasRecord: criminalRecord.hasRecord,
          riskLevel: criminalRecord.riskLevel,
          courtCases: criminalRecord.courtCases,
          activeWarrants: criminalRecord.activeWarrants,
          convictionCount: criminalRecord.convictionCount,
          lastKnownLocation: criminalRecord.lastKnownLocation,
          checkCount: criminalRecord.checkCount,
          lastChecked: criminalRecord.lastChecked,
          source: criminalRecord.source
        },
        relatedDocuments: relatedDocs,
        alerts: alerts.map(a => ({
          _id: a._id,
          severity: a.severity,
          title: a.title,
          description: a.description,
          status: a.status,
          createdAt: a.createdAt
        }))
      });
    }

  } catch (error) {
    console.error("Error fetching criminal profile:", error);
    res.status(500).json({ error: "Failed to fetch criminal profile", details: error.message });
  }
});

// GET /api/criminals/alerts
router.get("/alerts", authMiddleware, async (req, res) => {
  try {
    const userAgency = req.user.agency;
    const { status, severity, limit = 50 } = req.query;

    if (USE_POSTGRES) {
      const where = { type: "criminal_match" };
      if (status) where.status = status;
      if (severity) where.severity = severity;

      const alerts = await AlertSQL.findAll({
        where,
        include: [{
          model: AlertAgencySQL,
          as: 'alertAgencies',
          where: {
            agency: userAgency
          },
          required: false
        }],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit)
      });

      console.log(`[PostgreSQL] Found ${alerts.length} criminal alerts`);
      res.json({
        alerts,
        count: alerts.length
      });
    } else {
      const filter = {
        type: "criminal_match",
        $or: [
          { agencies: userAgency },
          { agencies: { $size: 0 } }
        ]
      };

      if (status) filter.status = status;
      if (severity) filter.severity = severity;

      const alerts = await Alert.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

      console.log(`[MongoDB] Found ${alerts.length} criminal alerts`);
      res.json({
        alerts,
        count: alerts.length
      });
    }

  } catch (error) {
    console.error("Error fetching criminal alerts:", error);
    res.status(500).json({ error: "Failed to fetch criminal alerts" });
  }
});

// GET /api/criminals/stats
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const userAgency = req.user.agency;

    if (USE_POSTGRES) {
      const [totalAlerts, criticalAlerts, todayAlerts, uniquePersons] = await Promise.all([
        AlertSQL.count({
          where: { type: "criminal_match" },
          include: [{
            model: AlertAgencySQL,
            as: 'alertAgencies',
            where: { agency: userAgency },
            required: false
          }]
        }),
        AlertSQL.count({
          where: { 
            type: "criminal_match",
            severity: "critical"
          },
          include: [{
            model: AlertAgencySQL,
            as: 'alertAgencies',
            where: { agency: userAgency },
            required: false
          }]
        }),
        AlertSQL.count({
          where: { 
            type: "criminal_match",
            created_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          },
          include: [{
            model: AlertAgencySQL,
            as: 'alertAgencies',
            where: { agency: userAgency },
            required: false
          }]
        }),
        CriminalRecordSQL.count({ where: { has_record: true } })
      ]);

      const recentMatches = await AlertSQL.findAll({
        where: { type: "criminal_match" },
        include: [{
          model: AlertAgencySQL,
          as: 'alertAgencies',
          where: { agency: userAgency },
          required: false
        }],
        order: [['created_at', 'DESC']],
        limit: 5
      });

      console.log(`[PostgreSQL] Criminal stats retrieved`);
      res.json({
        totalAlerts,
        criticalAlerts,
        todayAlerts,
        uniquePersons,
        recentMatches: recentMatches.map(a => ({
          personName: a.details_json?.criminalRecord?.personName,
          caseCount: a.details_json?.criminalRecord?.caseCount,
          severity: a.severity,
          createdAt: a.created_at
        }))
      });
    } else {
      const [totalAlerts, criticalAlerts, todayAlerts, uniquePersons] = await Promise.all([
        Alert.countDocuments({
          type: "criminal_match",
          $or: [
            { agencies: userAgency },
            { agencies: { $size: 0 } }
          ]
        }),
        Alert.countDocuments({
          type: "criminal_match",
          severity: "critical",
          $or: [
            { agencies: userAgency },
            { agencies: { $size: 0 } }
          ]
        }),
        Alert.countDocuments({
          type: "criminal_match",
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          $or: [
            { agencies: userAgency },
            { agencies: { $size: 0 } }
          ]
        }),
        CriminalRecord.countDocuments({ hasRecord: true })
      ]);

      const recentMatches = await Alert.find({
        type: "criminal_match",
        $or: [
          { agencies: userAgency },
          { agencies: { $size: 0 } }
        ]
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("details.criminalRecord.personName details.criminalRecord.caseCount severity createdAt");

      console.log(`[MongoDB] Criminal stats retrieved`);
      res.json({
        totalAlerts,
        criticalAlerts,
        todayAlerts,
        uniquePersons,
        recentMatches: recentMatches.map(a => ({
          personName: a.details?.criminalRecord?.personName,
          caseCount: a.details?.criminalRecord?.caseCount,
          severity: a.severity,
          createdAt: a.createdAt
        }))
      });
    }

  } catch (error) {
    console.error("Error fetching criminal stats:", error);
    res.status(500).json({ error: "Failed to fetch criminal stats" });
  }
});

// POST /api/criminals/check-company
router.post("/check-company", authMiddleware, async (req, res) => {
  try {
    const { companyName } = req.body;

    if (!companyName) {
      return res.status(400).json({ error: "Company name is required" });
    }

    const result = await checkMCARecords(companyName);
    res.json(result);

  } catch (error) {
    console.error("Error checking company records:", error);
    res.status(500).json({ error: "Failed to check company records" });
  }
});

// POST /api/criminals/request-report
router.post("/request-report", authMiddleware, async (req, res) => {
  try {
    const { personName } = req.body;

    if (!personName) {
      return res.status(400).json({ error: "Person name is required" });
    }

    const callbackUrl = `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/criminals/report-callback`;
    
    const result = await requestDetailedReport(personName, callbackUrl);

    res.json({
      success: true,
      reportId: result.reportId,
      status: result.status,
      estimatedTime: result.estimatedTime,
      message: "Detailed report requested. You will be notified when ready."
    });

  } catch (error) {
    console.error("Error requesting detailed report:", error);
    res.status(500).json({ error: "Failed to request detailed report" });
  }
});

// POST /api/criminals/report-callback
router.post("/report-callback", async (req, res) => {
  try {
    const { report_id, status, report_data } = req.body;
    console.log(`[CrimeCheck] Received report callback: ${report_id}, status: ${status}`);
    res.json({ success: true });
  } catch (error) {
    console.error("Error processing report callback:", error);
    res.status(500).json({ error: "Failed to process callback" });
  }
});

export default router;
