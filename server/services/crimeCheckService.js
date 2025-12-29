import axios from 'axios';
import CriminalRecord from '../models/CriminalRecord.js';

const CRIMECHECK_API_BASE = process.env.CRIMECHECK_API_URL || 'https://api.crimecheck.in';
const CRIMECHECK_API_KEY = process.env.CRIMECHECK_API_KEY;

/**
 * Check if a person has criminal records in Indian court database
 * @param {string} personName - Name of the person to check
 * @param {object} additionalDetails - Optional details like DOB, location
 * @returns {Promise<object>} Criminal record information
 */
export async function checkCriminalRecord(personName, additionalDetails = {}) {
  try {
    if (!personName || personName.trim().length < 3) {
      return { hasRecord: false, records: [], cached: false };
    }

    // Check cache first (avoid repeated API calls)
    const cached = await CriminalRecord.findOne({
      name: { $regex: new RegExp(`^${personName}$`, 'i') },
      updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 days cache
    });

    if (cached) {
      console.log(`[CrimeCheck] Using cached record for: ${personName}`);
      return {
        hasRecord: cached.hasRecord,
        records: cached.courtCases || [],
        cached: true,
        lastChecked: cached.updatedAt
      };
    }

    // If no API key, return mock data for demo purposes
    if (!CRIMECHECK_API_KEY || CRIMECHECK_API_KEY === 'demo') {
      console.log(`[CrimeCheck] Using mock data for: ${personName}`);
      return await getMockCriminalData(personName);
    }

    // Make API call to CrimeCheck.in
    console.log(`[CrimeCheck] Querying API for: ${personName}`);
    const response = await axios.post(
      `${CRIMECHECK_API_BASE}/records`,
      {
        name: personName,
        dob: additionalDetails.dob,
        location: additionalDetails.location,
        pan: additionalDetails.pan,
        aadhar: additionalDetails.aadhar
      },
      {
        headers: {
          'Authorization': `Bearer ${CRIMECHECK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    const hasRecord = response.data.records && response.data.records.length > 0;
    const records = hasRecord ? response.data.records.map(formatCourtCase) : [];

    // Cache the result
    await CriminalRecord.findOneAndUpdate(
      { name: personName },
      {
        name: personName,
        hasRecord,
        courtCases: records,
        riskLevel: calculateRiskLevel(records),
        lastChecked: new Date(),
        source: 'crimecheck.in'
      },
      { upsert: true, new: true }
    );

    return {
      hasRecord,
      records,
      cached: false,
      lastChecked: new Date()
    };

  } catch (error) {
    console.error(`[CrimeCheck] Error checking criminal record for ${personName}:`, error.message);
    
    // On error, try to return cached data even if expired
    const expiredCache = await CriminalRecord.findOne({
      name: { $regex: new RegExp(`^${personName}$`, 'i') }
    });

    if (expiredCache) {
      console.log(`[CrimeCheck] Using expired cache for: ${personName}`);
      return {
        hasRecord: expiredCache.hasRecord,
        records: expiredCache.courtCases || [],
        cached: true,
        expired: true,
        lastChecked: expiredCache.updatedAt,
        error: 'API unavailable, using cached data'
      };
    }

    return {
      hasRecord: false,
      records: [],
      error: error.message,
      cached: false
    };
  }
}

/**
 * Format court case data from API response
 */
function formatCourtCase(caseData) {
  return {
    caseNumber: caseData.case_number || caseData.caseNumber,
    charges: Array.isArray(caseData.charges) ? caseData.charges : [caseData.charges],
    court: caseData.court_name || caseData.court,
    state: caseData.state,
    filedDate: caseData.filed_date || caseData.filedDate,
    status: caseData.status || 'Unknown',
    verdict: caseData.verdict,
    nextHearing: caseData.next_hearing || caseData.nextHearing,
    severity: determineCaseSeverity(caseData.charges),
    description: caseData.description || '',
    amountInvolved: caseData.amount_involved || caseData.amountInvolved
  };
}

/**
 * Determine severity of court case based on charges
 */
function determineCaseSeverity(charges) {
  const chargesStr = Array.isArray(charges) ? charges.join(' ').toLowerCase() : String(charges).toLowerCase();
  
  const criticalKeywords = ['murder', 'terrorism', 'rape', 'ndps', 'drug trafficking', 'kidnapping'];
  const highKeywords = ['robbery', 'assault', 'fraud', 'cheating', 'extortion', 'money laundering'];
  const mediumKeywords = ['theft', 'forgery', 'criminal breach', 'intimidation'];

  if (criticalKeywords.some(kw => chargesStr.includes(kw))) return 'critical';
  if (highKeywords.some(kw => chargesStr.includes(kw))) return 'high';
  if (mediumKeywords.some(kw => chargesStr.includes(kw))) return 'medium';
  
  return 'low';
}

/**
 * Calculate overall risk level based on court cases
 */
function calculateRiskLevel(courtCases) {
  if (!courtCases || courtCases.length === 0) return 'none';

  const severityCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  };

  courtCases.forEach(c => {
    severityCounts[c.severity] = (severityCounts[c.severity] || 0) + 1;
  });

  if (severityCounts.critical > 0) return 'critical';
  if (severityCounts.high >= 2 || (severityCounts.high >= 1 && courtCases.length >= 3)) return 'high';
  if (severityCounts.high >= 1 || severityCounts.medium >= 2) return 'medium';
  
  return 'low';
}

/**
 * Check company/organization records via MCA
 */
export async function checkMCARecords(companyName) {
  try {
    if (!CRIMECHECK_API_KEY || CRIMECHECK_API_KEY === 'demo') {
      return getMockMCAData(companyName);
    }

    const response = await axios.post(
      `${CRIMECHECK_API_BASE}/mca`,
      { company_name: companyName },
      {
        headers: {
          'Authorization': `Bearer ${CRIMECHECK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    return {
      hasIssues: response.data.has_issues || false,
      companyName: response.data.company_name,
      cin: response.data.cin,
      status: response.data.status,
      directors: response.data.directors || [],
      disqualifiedDirectors: response.data.disqualified_directors || [],
      pendingCases: response.data.pending_cases || [],
      riskLevel: response.data.risk_level || 'low'
    };

  } catch (error) {
    console.error(`[CrimeCheck] Error checking MCA records for ${companyName}:`, error.message);
    return {
      hasIssues: false,
      error: error.message
    };
  }
}

/**
 * Request detailed background report (async)
 */
export async function requestDetailedReport(personName, callbackUrl) {
  try {
    if (!CRIMECHECK_API_KEY || CRIMECHECK_API_KEY === 'demo') {
      return { reportId: 'DEMO-' + Date.now(), status: 'pending' };
    }

    const response = await axios.post(
      `${CRIMECHECK_API_BASE}/report`,
      {
        name: personName,
        callback_url: callbackUrl
      },
      {
        headers: {
          'Authorization': `Bearer ${CRIMECHECK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      reportId: response.data.report_id,
      status: response.data.status,
      estimatedTime: response.data.estimated_time
    };

  } catch (error) {
    console.error(`[CrimeCheck] Error requesting detailed report:`, error.message);
    throw error;
  }
}

/**
 * Mock data for demo purposes (when API key not available)
 */
async function getMockCriminalData(personName) {
  const lowerName = personName.toLowerCase();
  
  // Demo criminal records for specific names
  const mockDatabase = {
    'rajesh kumar': {
      hasRecord: true,
      records: [
        {
          caseNumber: 'CR/2023/4567',
          charges: ['NDPS Act Section 8(c) - Drug Trafficking', 'IPC Section 120B - Criminal Conspiracy'],
          court: 'Mumbai Sessions Court',
          state: 'Maharashtra',
          filedDate: '2023-11-15',
          status: 'Trial Ongoing',
          nextHearing: '2025-01-05',
          severity: 'critical',
          description: 'Accused of trafficking narcotic substances across state borders'
        },
        {
          caseNumber: 'CR/2022/8901',
          charges: ['IPC Section 420 - Cheating and Dishonestly Inducing Delivery of Property'],
          court: 'Andheri Magistrate Court',
          state: 'Maharashtra',
          filedDate: '2022-08-22',
          status: 'Under Investigation',
          severity: 'medium',
          amountInvolved: '₹2,50,000',
          description: 'Financial fraud case involving fake business transactions'
        }
      ]
    },
    'vikram singh': {
      hasRecord: true,
      records: [
        {
          caseNumber: 'CR/2024/1234',
          charges: ['IPC Section 379 - Theft'],
          court: 'Delhi District Court',
          state: 'Delhi',
          filedDate: '2024-03-10',
          status: 'Pending',
          severity: 'low',
          description: 'Theft of electronic goods'
        }
      ]
    }
  };

  const match = mockDatabase[lowerName];
  
  if (match) {
    // Save to database so profile route can find it
    await CriminalRecord.findOneAndUpdate(
      { name: personName },
      {
        name: personName,
        hasRecord: true,
        courtCases: match.records,
        riskLevel: calculateRiskLevel(match.records),
        lastChecked: new Date(),
        source: 'crimecheck.in (mock)'
      },
      { upsert: true, new: true }
    );
    
    return {
      hasRecord: true,
      records: match.records,
      cached: false,
      mock: true,
      lastChecked: new Date()
    };
  }

  return {
    hasRecord: false,
    records: [],
    cached: false,
    mock: true,
    lastChecked: new Date()
  };
}

/**
 * Mock MCA data for demo
 */
function getMockMCAData(companyName) {
  const lowerName = companyName.toLowerCase();
  
  if (lowerName.includes('abc logistics')) {
    return {
      hasIssues: true,
      companyName: 'ABC Logistics Pvt Ltd',
      cin: 'U63000MH2015PTC123456',
      status: 'Active',
      directors: [
        { name: 'Rajesh Kumar', din: 'DIN12345678', status: 'Disqualified' },
        { name: 'Amit Sharma', din: 'DIN87654321', status: 'Active' }
      ],
      disqualifiedDirectors: ['Rajesh Kumar'],
      pendingCases: [
        {
          caseType: 'Money Laundering Investigation',
          agency: 'Enforcement Directorate',
          status: 'Under Investigation'
        }
      ],
      riskLevel: 'high',
      mock: true
    };
  }

  return {
    hasIssues: false,
    companyName,
    status: 'Active',
    directors: [],
    disqualifiedDirectors: [],
    pendingCases: [],
    riskLevel: 'low',
    mock: true
  };
}

export default {
  checkCriminalRecord,
  checkMCARecords,
  requestDetailedReport
};
