import Alert from "../models/Alert.js";
import Event from "../models/Event.js";
import Document from "../models/Document.js";
import OcrDocument from "../models/OcrDocument.js";
import Transcription from "../models/Transcription.js";

export async function checkEntityCrossMatch(entityName, entityType, documentId, documentType, agency) {
  try {
    const matchingDocs = [];
    
    // Document model stores entities as simple strings
    const documents = await Document.find({
      [`entities.${entityType}s`]: entityName,
      _id: { $ne: documentId }
    }).limit(10);
    
    // OcrDocument and Transcription store entities as objects with 'text' field
    const ocrDocs = await OcrDocument.find({
      [`entities.${entityType}s.text`]: entityName,
      _id: { $ne: documentId }
    }).limit(10);
    
    const transcriptions = await Transcription.find({
      [`entities.${entityType}s.text`]: entityName,
      _id: { $ne: documentId }
    }).limit(10);

    matchingDocs.push(...documents, ...ocrDocs, ...transcriptions);

    if (matchingDocs.length >= 2) {
      const agencies = [...new Set(matchingDocs.map(doc => doc.agency).filter(Boolean))];
      const crossAgency = agencies.length >= 3;

      const existingAlert = await Alert.findOne({
        type: "entity_match",
        "details.entityName": entityName,
        "details.entityType": entityType,
        status: { $in: ["unread", "read", "acknowledged"] }
      });

      if (existingAlert) {
        existingAlert.details.matchCount = matchingDocs.length + 1;
        existingAlert.details.agencies = agencies;
        existingAlert.details.documentIds = matchingDocs.map(doc => ({
          id: doc._id,
          type: doc.constructor.modelName
        }));
        existingAlert.severity = crossAgency ? "high" : "medium";
        existingAlert.updatedAt = new Date();
        await existingAlert.save();
        return existingAlert;
      }

      const alert = new Alert({
        type: crossAgency ? "cross_agency" : "entity_match",
        severity: crossAgency ? "high" : "medium",
        title: crossAgency 
          ? `Cross-Agency Alert: ${entityName} appears in ${agencies.length} agencies`
          : `Entity Match: ${entityName} found in ${matchingDocs.length + 1} documents`,
        description: `The ${entityType} "${entityName}" has been detected across multiple documents${crossAgency ? ' from different agencies' : ''}. This may indicate a pattern requiring investigation.`,
        details: {
          entityName,
          entityType,
          matchCount: matchingDocs.length + 1,
          agencies,
          documentIds: matchingDocs.map(doc => ({
            id: doc._id,
            type: doc.constructor.modelName
          })),
          metadata: {
            crossAgency,
            firstDetected: new Date()
          }
        },
        agencies: crossAgency ? agencies : [agency],
        triggeredBy: "AI"
      });

      await alert.save();
      return alert;
    }

    return null;
  } catch (error) {
    console.error("Error checking entity cross-match:", error);
    return null;
  }
}

export async function checkGeoFenceSpike(location, agency) {
  try {
    const timeWindow = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Document model stores places as simple strings
    const recentDocs = await Document.countDocuments({
      "entities.places": location,
      createdAt: { $gte: timeWindow }
    });

    // OcrDocument and Transcription store places as objects with 'text' field
    const recentOcr = await OcrDocument.countDocuments({
      "entities.places.text": location,
      createdAt: { $gte: timeWindow }
    });

    const recentTranscriptions = await Transcription.countDocuments({
      "entities.places.text": location,
      createdAt: { $gte: timeWindow }
    });

    const totalIncidents = recentDocs + recentOcr + recentTranscriptions;

    if (totalIncidents >= 5) {
      const existingAlert = await Alert.findOne({
        type: "geo_spike",
        "details.geoFence.location": location,
        createdAt: { $gte: timeWindow },
        status: { $in: ["unread", "read", "acknowledged"] }
      });

      if (existingAlert) {
        existingAlert.details.geoFence.incidentCount = totalIncidents;
        existingAlert.severity = totalIncidents >= 10 ? "critical" : totalIncidents >= 7 ? "high" : "medium";
        existingAlert.updatedAt = new Date();
        await existingAlert.save();
        return existingAlert;
      }

      const alert = new Alert({
        type: "geo_spike",
        severity: totalIncidents >= 10 ? "critical" : totalIncidents >= 7 ? "high" : "medium",
        title: `Geo-Fence Alert: Spike in ${location}`,
        description: `${totalIncidents} incidents detected in ${location} within the last 24 hours. This represents an unusual concentration of activity.`,
        details: {
          locations: [location],
          geoFence: {
            location,
            incidentCount: totalIncidents,
            timeWindow: "24 hours"
          },
          metadata: {
            detectedAt: new Date()
          }
        },
        agencies: [agency],
        triggeredBy: "AI"
      });

      await alert.save();
      return alert;
    }

    return null;
  } catch (error) {
    console.error("Error checking geo-fence spike:", error);
    return null;
  }
}

export async function checkRiskProfile(document, documentType) {
  try {
    let riskScore = 0;
    const riskFactors = [];

    const highRiskKeywords = [
      "weapon", "explosive", "threat", "attack", "terrorism", "smuggling",
      "trafficking", "cartel", "gang", "violence", "murder", "kidnapping",
      "ransom", "extortion", "money laundering", "fraud", "corruption"
    ];

    const text = document.text || document.transcriptionText || "";
    const lowerText = text.toLowerCase();

    highRiskKeywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        riskScore += 10;
        riskFactors.push(keyword);
      }
    });

    const entities = document.entities || {};
    if (entities.persons && entities.persons.length > 5) {
      riskScore += 15;
      riskFactors.push("Multiple persons mentioned");
    }

    if (entities.phoneNumbers && entities.phoneNumbers.length > 3) {
      riskScore += 10;
      riskFactors.push("Multiple phone numbers");
    }

    if (entities.organizations && entities.organizations.length > 3) {
      riskScore += 10;
      riskFactors.push("Multiple organizations");
    }

    if (riskScore >= 30) {
      const alert = new Alert({
        type: "risk_profile",
        severity: riskScore >= 50 ? "critical" : riskScore >= 40 ? "high" : "medium",
        title: `High-Risk Document Detected`,
        description: `A document has been flagged with a risk score of ${riskScore}. Risk factors include: ${riskFactors.slice(0, 3).join(", ")}.`,
        details: {
          riskScore,
          documentIds: [{
            id: document._id,
            type: documentType
          }],
          metadata: {
            riskFactors,
            documentFilename: document.filename || document.originalFilename,
            detectedAt: new Date()
          }
        },
        agencies: [document.agency],
        triggeredBy: "AI"
      });

      await alert.save();
      return alert;
    }

    return null;
  } catch (error) {
    console.error("Error checking risk profile:", error);
    return null;
  }
}

export async function triggerAlertChecks(document, documentType, io) {
  try {
    const alerts = [];

    if (document.entities) {
      // Handle persons - extract text from objects or use strings directly
      if (document.entities.persons) {
        for (const person of document.entities.persons) {
          const personName = typeof person === 'string' ? person : person.text;
          if (personName) {
            const alert = await checkEntityCrossMatch(personName, "person", document._id, documentType, document.agency);
            if (alert) alerts.push(alert);
          }
        }
      }

      // Handle organizations - extract text from objects or use strings directly
      if (document.entities.organizations) {
        for (const org of document.entities.organizations) {
          const orgName = typeof org === 'string' ? org : org.text;
          if (orgName) {
            const alert = await checkEntityCrossMatch(orgName, "organization", document._id, documentType, document.agency);
            if (alert) alerts.push(alert);
          }
        }
      }

      // Handle places - extract text from objects or use strings directly
      if (document.entities.places) {
        for (const place of document.entities.places) {
          const placeName = typeof place === 'string' ? place : place.text;
          if (placeName) {
            const geoAlert = await checkGeoFenceSpike(placeName, document.agency);
            if (geoAlert) alerts.push(geoAlert);
          }
        }
      }
    }

    const riskAlert = await checkRiskProfile(document, documentType);
    if (riskAlert) alerts.push(riskAlert);

    if (io && alerts.length > 0) {
      alerts.forEach(alert => {
        if (alert.agencies && alert.agencies.length > 0) {
          alert.agencies.forEach(agency => {
            io.emit(`alert:${agency}`, alert.toObject());
          });
        } else {
          io.emit("alert:all", alert.toObject());
        }
      });
    }

    return alerts;
  } catch (error) {
    console.error("Error triggering alert checks:", error);
    return [];
  }
}
