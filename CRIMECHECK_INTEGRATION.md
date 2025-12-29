# CrimeCheck.in Integration - Criminal Database Feature

## Overview

KHOJ-AI now integrates with CrimeCheck.in, India's largest database of court records, to automatically verify persons mentioned in documents against criminal records. This feature provides real-time criminal background checks and alerts for law enforcement agencies.

## Features

### 🔍 Automatic Criminal Background Checks
- **Real-time verification**: When documents are uploaded (PDF, OCR, Audio), all extracted person names are automatically checked against CrimeCheck.in database
- **Intelligent caching**: Results are cached for 7 days to minimize API calls and improve performance
- **Mock data support**: Works with demo data when API key is not available

### 🚨 Critical Alerts System
- **Instant notifications**: Critical alerts generated when criminal records are found
- **Severity-based classification**: Alerts categorized as Critical, High, Medium, or Low based on case severity
- **Real-time Socket.IO updates**: Immediate notifications to all relevant agencies
- **Multi-agency coordination**: Alerts shared across agencies for coordinated response

### 📊 Criminal Intelligence Dashboard
- **Statistics widget**: Shows critical alerts, today's matches, and total alerts
- **Recent matches**: Quick view of recently detected persons with criminal records
- **Risk assessment**: Automatic risk level calculation based on court case severity
- **Trend tracking**: Monitor criminal detection patterns over time

### 👤 Detailed Criminal Profiles
- **Court case details**: Complete information about all court cases
- **Case status tracking**: Trial ongoing, under investigation, convicted, etc.
- **Related documents**: Links to all KHOJ-AI documents mentioning the person
- **Risk indicators**: Visual risk level badges and severity indicators
- **Historical tracking**: Number of times person has been detected in system

### 🔗 Cross-Agency Intelligence
- **Document correlation**: Links criminal records to all related documents across agencies
- **Event enhancement**: Criminal background automatically added to event intelligence
- **Chatbot integration**: AI chatbot can answer questions about persons with criminal records
- **Search enhancement**: Criminal badges appear in search results

## Architecture

### Backend Components

1. **CrimeCheck Service** (`server/services/crimeCheckService.js`)
   - API integration with CrimeCheck.in
   - Mock data for demo purposes
   - Caching mechanism
   - Error handling and fallbacks

2. **Criminal Record Model** (`server/models/CriminalRecord.js`)
   - Stores cached criminal records
   - Tracks related documents
   - Maintains check history

3. **Criminal Check Helper** (`server/utils/criminalCheckHelper.js`)
   - Document processing logic
   - Alert creation
   - Batch checking capabilities

4. **Criminal Routes** (`server/routes/criminals.js`)
   - `/api/criminals/check/:personName` - Check person against database
   - `/api/criminals/profile/:personName` - Get full criminal profile
   - `/api/criminals/alerts` - Get criminal match alerts
   - `/api/criminals/stats` - Get statistics for dashboard
   - `/api/criminals/check-company` - Check company via MCA

### Frontend Components

1. **CriminalRecordBadge** (`client/src/components/criminal/CriminalRecordBadge.jsx`)
   - Small badge showing case count
   - Color-coded by severity
   - Clickable to view full profile

2. **CriminalProfileModal** (`client/src/components/criminal/CriminalProfileModal.jsx`)
   - Full-screen modal with complete criminal profile
   - Court case details with charges, status, and dates
   - Related documents list
   - Risk assessment display

3. **CriminalAlertsWidget** (`client/src/components/dashboard/CriminalAlertsWidget.jsx`)
   - Dashboard widget showing criminal alert statistics
   - Recent matches list
   - Quick access to criminal profiles

## Data Flow

```
Document Upload
    ↓
Text/Entity Extraction
    ↓
For each Person Entity:
    ↓
Check Cache (7 days)
    ↓
If not cached → Query CrimeCheck.in API
    ↓
If Records Found:
    ├─→ Create Criminal Record in DB
    ├─→ Generate CRITICAL Alert
    ├─→ Boost Event Severity Score
    ├─→ Send Real-time Notification
    ├─→ Update Dashboard Widget
    └─→ Add Badge to Person Entity
```

## Configuration

### Environment Variables

Add to `.env` file:

```bash
# CrimeCheck.in API Configuration
CRIMECHECK_API_KEY=your_api_key_here
CRIMECHECK_API_URL=https://api.crimecheck.in
API_BASE_URL=http://localhost:3000
```

For demo/testing without API key:
```bash
CRIMECHECK_API_KEY=demo
```

### API Key Setup

1. Visit [crimecheck.ai](https://crimecheck.ai)
2. Sign up for an account
3. Generate API credentials
4. Add to `.env` file

## Mock Data

The system includes mock criminal data for demo purposes:

- **Rajesh Kumar**: 2 court cases (Drug Trafficking - Critical, Cheating - Medium)
- **Vikram Singh**: 1 court case (Theft - Low)
- **ABC Logistics Pvt Ltd**: Company with disqualified director and money laundering investigation

## Usage Examples

### Check Person Against Database

```javascript
// API Call
GET /api/criminals/check/Rajesh%20Kumar
Authorization: Bearer <token>

// Response
{
  "personName": "Rajesh Kumar",
  "hasRecord": true,
  "recordCount": 2,
  "records": [
    {
      "caseNumber": "CR/2023/4567",
      "charges": ["NDPS Act Section 8(c) - Drug Trafficking"],
      "court": "Mumbai Sessions Court",
      "status": "Trial Ongoing",
      "severity": "critical"
    }
  ],
  "cached": false,
  "lastChecked": "2025-12-29T07:00:00.000Z"
}
```

### Get Criminal Profile

```javascript
// API Call
GET /api/criminals/profile/Rajesh%20Kumar
Authorization: Bearer <token>

// Response includes:
// - Full profile with all court cases
// - Related documents from KHOJ-AI
// - Alert history
// - Risk assessment
```

### Get Dashboard Statistics

```javascript
// API Call
GET /api/criminals/stats
Authorization: Bearer <token>

// Response
{
  "totalAlerts": 15,
  "criticalAlerts": 3,
  "todayAlerts": 2,
  "uniquePersons": 8,
  "recentMatches": [...]
}
```

## Integration Points

### 1. Document Ingestion
- PDF uploads (`server/routes/ingest.js`)
- OCR processing (`server/routes/ocr.js`)
- Audio transcription (`server/routes/transcription.js`)

### 2. Event System
- Criminal records boost event severity scores
- Court cases added to event intelligence
- Cross-agency event matching enhanced with criminal context

### 3. Alert System
- New alert type: `criminal_match`
- Severity automatically determined from case severity
- Real-time notifications via Socket.IO

### 4. Dashboard
- Criminal alerts widget
- Statistics and trends
- Recent matches display

### 5. Search
- Criminal badges in search results
- Filter by persons with criminal records
- Quick access to criminal profiles

## Security & Privacy

- **Role-based access**: Only authenticated users can access criminal data
- **Agency visibility**: Users only see criminal records related to their agency's documents
- **Audit trail**: All criminal checks are logged with timestamps
- **Data caching**: Reduces API calls while maintaining data freshness (7-day cache)
- **Error handling**: Graceful fallbacks when API is unavailable

## Performance Optimizations

1. **Caching Strategy**: 7-day cache for criminal records to minimize API calls
2. **Batch Processing**: Can check multiple persons simultaneously
3. **Async Processing**: Criminal checks don't block document ingestion
4. **Lazy Loading**: Criminal profiles loaded on-demand
5. **Mock Data**: Demo mode works without API for testing/development

## Future Enhancements

- [ ] Facial recognition integration with criminal database
- [ ] Predictive analytics for criminal activity patterns
- [ ] Automated warrant notifications
- [ ] Integration with fingerprint databases
- [ ] Real-time court case status updates
- [ ] Multi-language support for regional courts
- [ ] Advanced search with criminal record filters
- [ ] Export criminal intelligence reports

## Troubleshooting

### API Key Issues
- Ensure `CRIMECHECK_API_KEY` is set in `.env`
- Verify API key is valid and active
- Check API rate limits

### No Criminal Records Found
- Verify person name spelling
- Check if cache needs refresh (7 days)
- Ensure API is accessible

### Alerts Not Appearing
- Check Socket.IO connection
- Verify user agency permissions
- Check alert status filters

## Demo Scenario

For hackathon demo, use these test cases:

1. **Upload document mentioning "Rajesh Kumar"**
   - System detects 2 court cases
   - Critical alert generated
   - Event severity boosted to 95/100
   - Criminal profile accessible

2. **Cross-agency coordination**
   - Multiple agencies upload documents about same person
   - System correlates across agencies
   - Unified criminal intelligence view

3. **Chatbot query**
   - Ask: "What do we know about Rajesh Kumar?"
   - Response includes criminal background from CrimeCheck.in

## Support

For issues or questions:
- Check logs in `server/logs/`
- Review API documentation at [apidoc.crimecheck.in](https://apidoc.crimecheck.in/)
- Contact CrimeCheck.in support for API issues

---

**Built for SHIELD 1.0 Hackathon**  
**Powered by CrimeCheck.in - India's Largest Court Records Database**
