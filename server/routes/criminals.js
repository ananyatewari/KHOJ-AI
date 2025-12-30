import express from "express";
import CriminalRecord from "../models/CriminalRecord.js";
import Alert from "../models/Alert.js";
import CriminalRecordSQL from "../models/sql/CriminalRecord.js";
import AlertSQL from "../models/sql/Alert.js";
import authMiddleware from "../middleware/auth.js";
import { checkCriminalRecord, checkMCARecords, requestDetailedReport } from "../services/crimeCheckService.js";
import { Op } from "sequelize";

const router = express.Router();
const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

// GET /api/criminals/check/:personName
// Check a person against criminal database
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
// Get full criminal profile with related documents
router.get("/profile/:personName", authMiddleware, async (req, res) => {
  try {
    const { personName } = req.params;
    const userAgency = req.user.agency;

    // Get criminal record from database
    const criminalRecord = await CriminalRecord.findOne({
      name: { $regex: new RegExp(`^${personName}$`, 'i') }
    });

    if (!criminalRecord) {
      return res.status(404).json({ error: "No criminal record found" });
    }

    // Get related alerts
    const alerts = await Alert.find({
      type: "criminal_match",
      "details.criminalRecord.personName": { $regex: new RegExp(`^${personName}$`, 'i') },
      $or: [
        { agencies: userAgency },
        { agencies: { $size: 0 } }
      ]
    }).sort({ createdAt: -1 }).limit(10);

    // Get related documents (only those visible to user's agency)
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

  } catch (error) {
    console.error("Error fetching criminal profile:", error);
    res.status(500).json({ error: "Failed to fetch criminal profile" });
  }
});

// GET /api/criminals/alerts
// Get all criminal match alerts for user's agency
router.get("/alerts", authMiddleware, async (req, res) => {
  try {
    const userAgency = req.user.agency;
    const { status, severity, limit = 50 } = req.query;

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

    res.json({
      alerts,
      count: alerts.length
    });

  } catch (error) {
    console.error("Error fetching criminal alerts:", error);
    res.status(500).json({ error: "Failed to fetch criminal alerts" });
  }
});

// GET /api/criminals/stats
// Get criminal check statistics for dashboard
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const userAgency = req.user.agency;

    let totalAlerts, criticalAlerts, todayAlerts, uniquePersons, recentMatches;

    if (USE_POSTGRES) {
      // PostgreSQL queries
      const [totalAlertsResult, criticalAlertsResult, todayAlertsResult, uniquePersonsResult] = await Promise.all([
        AlertSQL.count({
          where: {
            type: "criminal_match",
            [Op.or]: [
              { agencies: { [Op.contains]: [userAgency] } },
              { agencies: { [Op.eq]: [] } }
            ]
          }
        }),
        AlertSQL.count({
          where: {
            type: "criminal_match",
            severity: "critical",
            [Op.or]: [
              { agencies: { [Op.contains]: [userAgency] } },
              { agencies: { [Op.eq]: [] } }
            ]
          }
        }),
        AlertSQL.count({
          where: {
            type: "criminal_match",
            createdAt: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            [Op.or]: [
              { agencies: { [Op.contains]: [userAgency] } },
              { agencies: { [Op.eq]: [] } }
            ]
          }
        }),
        CriminalRecordSQL.count({
          where: { hasRecord: true }
        })
      ]);

      totalAlerts = totalAlertsResult;
      criticalAlerts = criticalAlertsResult;
      todayAlerts = todayAlertsResult;
      uniquePersons = uniquePersonsResult;

      // Get recent matches
      recentMatches = await AlertSQL.findAll({
        where: {
          type: "criminal_match",
          [Op.or]: [
            { agencies: { [Op.contains]: [userAgency] } },
            { agencies: { [Op.eq]: [] } }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: 5,
        attributes: ['details', 'severity', 'createdAt']
      });

      recentMatches = recentMatches.map(a => ({
        personName: a.details?.criminalRecord?.personName,
        caseCount: a.details?.criminalRecord?.caseCount,
        severity: a.severity,
        createdAt: a.createdAt
      }));
    } else {
      // MongoDB queries (original)
      [totalAlerts, criticalAlerts, todayAlerts, uniquePersons] = await Promise.all([
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

      // Get recent matches
      recentMatches = await Alert.find({
        type: "criminal_match",
        $or: [
          { agencies: userAgency },
          { agencies: { $size: 0 } }
        ]
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("details.criminalRecord.personName details.criminalRecord.caseCount severity createdAt");

      recentMatches = recentMatches.map(a => ({
        personName: a.details?.criminalRecord?.personName,
        caseCount: a.details?.criminalRecord?.caseCount,
        severity: a.severity,
        createdAt: a.createdAt
      }));
    }

    res.json({
      totalAlerts,
      criticalAlerts,
      todayAlerts,
      uniquePersons,
      recentMatches
    });

  } catch (error) {
    console.error("Error fetching criminal stats:", error);
    res.status(500).json({ error: "Failed to fetch criminal stats" });
  }
});

// POST /api/criminals/check-company
// Check company/organization via MCA
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
// Request detailed background report (async)
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
// Callback endpoint for detailed reports (webhook)
router.post("/report-callback", async (req, res) => {
  try {
    const { report_id, status, report_data } = req.body;

    console.log(`[CrimeCheck] Received report callback: ${report_id}, status: ${status}`);

    // Store report data or trigger notification
    // Implementation depends on your requirements

    res.json({ success: true });

  } catch (error) {
    console.error("Error processing report callback:", error);
    res.status(500).json({ error: "Failed to process callback" });
  }
});

export default router;
