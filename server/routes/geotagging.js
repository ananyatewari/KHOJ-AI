import express from "express";
import Document from "../models/Document.js";
import DocumentSQL from "../models/sql/Document.js";
import authMiddleware from "../middleware/auth.js";
import { Op } from "sequelize";

const router = express.Router();
const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

// GET /api/geotagging/documents
// Fetch all documents with location data for the user's agency
router.get("/documents", authMiddleware, async (req, res) => {
  try {
    const userAgency = req.user.agency;
    const { limit = 100, offset = 0 } = req.query;

    let documents;

    if (USE_POSTGRES) {
      // PostgreSQL query
      documents = await DocumentSQL.findAll({
        where: {
          agency: userAgency,
          [Op.or]: [
            { entities: { [Op.not]: null } },
            { entities: { [Op.ne]: '{}' } }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        attributes: ['id', 'filename', 'text', 'agency', 'uploadedBy', 'fileType', 'entities', 'aiSummary', 'createdAt']
      });

      // Convert Sequelize instances to plain objects and ensure entities is parsed
      documents = documents.map(doc => {
        const plainDoc = doc.get({ plain: true });
        if (typeof plainDoc.entities === 'string') {
          try {
            plainDoc.entities = JSON.parse(plainDoc.entities);
          } catch (e) {
            plainDoc.entities = {};
          }
        }
        return plainDoc;
      });
    } else {
      // MongoDB query
      documents = await Document.find({
        agency: userAgency,
        'entities.places': { $exists: true, $ne: [] }
      })
      .select('filename text agency uploadedBy fileType entities aiSummary createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();
    }

    // Filter documents that actually have location data
    const documentsWithLocations = documents.filter(doc => 
      doc.entities && 
      doc.entities.places && 
      doc.entities.places.length > 0
    );

    // Get location statistics
    const locationStats = {};
    documentsWithLocations.forEach(doc => {
      if (doc.entities.places) {
        doc.entities.places.forEach(place => {
          const normalizedPlace = place.toLowerCase().trim();
          locationStats[normalizedPlace] = (locationStats[normalizedPlace] || 0) + 1;
        });
      }
    });

    res.json({
      documents: documentsWithLocations,
      stats: {
        totalDocuments: documentsWithLocations.length,
        totalLocations: Object.keys(locationStats).length,
        locationFrequency: locationStats,
        mostActiveLocations: Object.entries(locationStats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([location, count]) => ({ location, count }))
      }
    });

  } catch (error) {
    console.error("Error fetching geotagged documents:", error);
    res.status(500).json({ error: "Failed to fetch geotagged documents" });
  }
});

// GET /api/geotagging/location/:locationName
// Fetch documents for a specific location
router.get("/location/:locationName", authMiddleware, async (req, res) => {
  try {
    const userAgency = req.user.agency;
    const { locationName } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    let documents;

    if (USE_POSTGRES) {
      // PostgreSQL query - search in JSON entities.places
      documents = await DocumentSQL.findAll({
        where: {
          agency: userAgency,
          [Op.and]: [
            {
              [Op.or]: [
                { entities: { [Op.not]: null } },
                { entities: { [Op.ne]: '{}' } }
              ]
            },
            // This is a simplified search - in production you might want to use JSON operators
            {
              [Op.or]: [
                { text: { [Op.iLike]: `%${locationName}%` } },
                { filename: { [Op.iLike]: `%${locationName}%` } }
              ]
            }
          ]
        },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      documents = documents.map(doc => {
        const plainDoc = doc.get({ plain: true });
        if (typeof plainDoc.entities === 'string') {
          try {
            plainDoc.entities = JSON.parse(plainDoc.entities);
          } catch (e) {
            plainDoc.entities = {};
          }
        }
        return plainDoc;
      });
    } else {
      // MongoDB query
      documents = await Document.find({
        agency: userAgency,
        'entities.places': { $regex: locationName, $options: 'i' }
      })
      .select('filename text agency uploadedBy fileType entities aiSummary createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))
      .lean();
    }

    // Filter to only include documents that actually contain the location
    const filteredDocuments = documents.filter(doc => 
      doc.entities && 
      doc.entities.places && 
      doc.entities.places.some(place => 
        place.toLowerCase().includes(locationName.toLowerCase())
      )
    );

    res.json({
      location: locationName,
      documents: filteredDocuments,
      count: filteredDocuments.length
    });

  } catch (error) {
    console.error(`Error fetching documents for location ${locationName}:`, error);
    res.status(500).json({ error: "Failed to fetch documents for location" });
  }
});

// POST /api/geotagging/enhance-location-data
// Enhance location data using AI (optional future enhancement)
router.post("/enhance-location-data", authMiddleware, async (req, res) => {
  try {
    const { documentId } = req.body;
    
    if (!documentId) {
      return res.status(400).json({ error: "Document ID is required" });
    }

    // This is a placeholder for future AI-based location enhancement
    // You could integrate with a geocoding service or NLP model here
    
    res.json({
      message: "Location enhancement not yet implemented",
      documentId
    });

  } catch (error) {
    console.error("Error enhancing location data:", error);
    res.status(500).json({ error: "Failed to enhance location data" });
  }
});

export default router;
