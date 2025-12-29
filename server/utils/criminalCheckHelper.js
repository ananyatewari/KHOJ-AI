import Alert from "../models/Alert.js";
import CriminalRecord from "../models/CriminalRecord.js";
import { checkCriminalRecord } from "../services/crimeCheckService.js";

/**
 * Check criminal records for all persons in a document
 * @param {Object} document - Document with entities
 * @param {String} documentType - Type of document
 * @param {Object} io - Socket.IO instance for real-time updates
 * @returns {Array} Array of created alerts
 */
export async function checkCriminalRecordsForDocument(document, documentType, io) {
  const alerts = [];
  
  if (!document.entities || !document.entities.persons || document.entities.persons.length === 0) {
    return alerts;
  }

  const persons = document.entities.persons;
  const locationContext = document.entities.places?.[0];

  for (const person of persons) {
    const personName = typeof person === 'string' ? person : person.text;
    
    if (!personName || personName.trim().length < 3) {
      continue;
    }

    try {
      // Query CrimeCheck API
      const crimeCheck = await checkCriminalRecord(personName, {
        location: locationContext
      });

      if (crimeCheck.hasRecord && crimeCheck.records.length > 0) {
        console.log(`[CriminalCheck] Court records found for: ${personName} (${crimeCheck.records.length} cases)`);

        // Update CriminalRecord with document reference
        const criminalRecord = await CriminalRecord.findOne({ name: personName });
        if (criminalRecord) {
          await criminalRecord.addRelatedDocument(document._id, documentType);
        }

        // Determine alert severity based on case severity
        const maxSeverity = getMaxSeverity(crimeCheck.records);
        const alertSeverity = mapCaseSeverityToAlertSeverity(maxSeverity);

        // Create alert
        const { createRealTimeAlert } = await import("./alertCreator.js");
        const alert = await createRealTimeAlert({
          type: "criminal_match",
          severity: alertSeverity,
          title: `Court Records Found: ${personName}`,
          description: `${personName} has ${crimeCheck.records.length} court case(s) in Indian judicial system. ${getSeverityDescription(crimeCheck.records)}`,
          details: {
            criminalRecord: {
              personName,
              caseCount: crimeCheck.records.length,
              riskLevel: crimeCheck.records[0]?.severity || 'unknown',
              courtCases: crimeCheck.records.map(c => ({
                caseNumber: c.caseNumber,
                charges: c.charges,
                court: c.court,
                status: c.status,
                severity: c.severity
              })),
              source: crimeCheck.cached ? 'crimecheck.in (cached)' : 'crimecheck.in'
            },
            documentIds: [{
              id: document._id,
              type: documentType
            }],
            metadata: {
              lastChecked: crimeCheck.lastChecked,
              cached: crimeCheck.cached,
              mock: crimeCheck.mock || false
            }
          },
          agencies: [document.agency],
          triggeredBy: "CrimeCheck AI"
        });

        alerts.push(alert);

        // Emit real-time alert via Socket.IO
        if (io) {
          io.emit(`alert:${document.agency}`, alert.toObject());
          io.emit("alert:all", alert.toObject());
        }

        // Emit log
        if (io) {
          const { emitLog } = await import("./logger.js");
          await emitLog(io, {
            level: "WARNING",
            message: `🚨 Criminal record match: ${personName} - ${crimeCheck.records.length} court case(s)`,
            user: document.uploadedBy,
            agency: document.agency
          });
        }
      }

    } catch (error) {
      console.error(`[CriminalCheck] Error checking ${personName}:`, error.message);
    }
  }

  return alerts;
}

/**
 * Get maximum severity from court cases
 */
function getMaxSeverity(courtCases) {
  const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
  let maxSeverity = 'low';
  let maxValue = 0;

  courtCases.forEach(c => {
    const value = severityOrder[c.severity] || 0;
    if (value > maxValue) {
      maxValue = value;
      maxSeverity = c.severity;
    }
  });

  return maxSeverity;
}

/**
 * Map case severity to alert severity
 */
function mapCaseSeverityToAlertSeverity(caseSeverity) {
  const mapping = {
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'medium' // Even low severity cases should be medium alerts
  };
  return mapping[caseSeverity] || 'medium';
}

/**
 * Get human-readable severity description
 */
function getSeverityDescription(courtCases) {
  const criticalCases = courtCases.filter(c => c.severity === 'critical');
  const highCases = courtCases.filter(c => c.severity === 'high');

  if (criticalCases.length > 0) {
    const charges = criticalCases[0].charges.slice(0, 2).join(', ');
    return `Includes critical charges: ${charges}.`;
  }

  if (highCases.length > 0) {
    const charges = highCases[0].charges.slice(0, 2).join(', ');
    return `Includes serious charges: ${charges}.`;
  }

  return 'Review case details for more information.';
}

/**
 * Batch check multiple persons at once
 */
export async function batchCheckCriminalRecords(personNames, context = {}) {
  const results = [];

  for (const name of personNames) {
    try {
      const result = await checkCriminalRecord(name, context);
      results.push({
        name,
        ...result
      });
    } catch (error) {
      results.push({
        name,
        hasRecord: false,
        error: error.message
      });
    }
  }

  return results;
}

export default {
  checkCriminalRecordsForDocument,
  batchCheckCriminalRecords
};
