# AI Alerts & Notifications System

## Overview

The AI Alerts system provides real-time, intelligent notifications triggered by AI analysis of documents, OCR scans, and audio transcriptions. It automatically detects patterns, anomalies, and high-risk situations across the intelligence platform.

## Features

### 1. **AI-Triggered Alert Types**

#### Entity Cross-Match Alerts
- Detects when the same person, organization, or entity appears across multiple documents
- Automatically escalates to "Cross-Agency Alert" when entities appear in 3+ different agencies
- Tracks match count and source documents

#### Geo-Fence Spike Alerts
- Monitors location mentions across all document types
- Triggers when 5+ incidents occur in the same location within 24 hours
- Severity increases with incident count (5-7: medium, 7-10: high, 10+: critical)

#### High-Risk Profile Alerts
- Analyzes document content for high-risk keywords (weapons, threats, terrorism, etc.)
- Calculates risk scores based on keyword frequency and entity patterns
- Triggers at risk score ≥30 (30-40: medium, 40-50: high, 50+: critical)

#### Custom Alerts
- Extensible system for adding custom alert rules
- Can be triggered manually or programmatically

### 2. **Real-Time Notifications**

- **Toast Notifications**: Pop-up alerts appear in top-right corner when new alerts are triggered
- **Live Updates**: Socket.IO integration ensures instant delivery across all connected clients
- **Agency-Specific**: Alerts are routed to relevant agencies based on visibility rules
- **Badge Counter**: Unread alert count displayed on sidebar navigation

### 3. **Alert Management**

#### Alert Statuses
- **Unread**: New alert, not yet viewed
- **Read**: Alert has been viewed
- **Acknowledged**: User has taken action and documented it
- **Resolved**: Alert has been fully addressed
- **Dismissed**: Alert determined to be non-actionable

#### Alert Actions
- **View Details**: See full alert information including entities, documents, and risk factors
- **Acknowledge**: Mark alert as handled with action notes
- **Dismiss**: Remove alert from active queue
- **Notify Agencies**: Send alert to other agencies with custom message

### 4. **Agency Collaboration**

- **Cross-Agency Notifications**: Share critical alerts with other agencies
- **Notification Methods**: Internal (real-time), Email, SMS (configurable)
- **Notification Tracking**: Track which agencies were notified and when
- **Message Customization**: Add context when notifying other agencies

## Architecture

### Backend Components

#### Models
- **`Alert.js`**: Alert data model with severity, type, status, and notification tracking
- Indexes on status, severity, agencies, and creation date for fast queries

#### Routes
- **`/api/alerts`**: Get all alerts for user's agency
- **`/api/alerts/unread-count`**: Get count of unread alerts
- **`/api/alerts/:id`**: Get specific alert details
- **`/api/alerts/:id/read`**: Mark alert as read
- **`/api/alerts/:id/acknowledge`**: Acknowledge alert with action notes
- **`/api/alerts/:id/dismiss`**: Dismiss alert
- **`/api/alerts/:id/notify-agencies`**: Send alert to other agencies
- **`/api/alerts/create`**: Manually create alert

#### Alert Triggers (`alertTriggers.js`)
- **`checkEntityCrossMatch()`**: Checks for entity appearances across documents
- **`checkGeoFenceSpike()`**: Monitors location-based incident spikes
- **`checkRiskProfile()`**: Analyzes document risk factors
- **`triggerAlertChecks()`**: Main function that runs all checks on new documents

#### Integration Points
- **PDF Ingestion** (`routes/ingest.js`): Triggers alerts after document processing
- **OCR Processing** (`controller/ocrController.js`): Triggers alerts after OCR completion
- **Transcription** (`routes/transcription.js`): Triggers alerts after audio transcription

### Frontend Components

#### Context
- **`AlertsContext.jsx`**: Global state management for alerts
  - Manages alert list and unread count
  - Handles Socket.IO connections for real-time updates
  - Provides alert action functions (read, acknowledge, dismiss, notify)
  - Manages toast notification queue

#### Components
- **`AlertsPage.jsx`**: Main alerts dashboard
  - List view with filtering (status, severity, search)
  - Detail panel with alert information
  - Action buttons for alert management
  - Agency notification modal

- **`AlertToast.jsx`**: Individual toast notification
  - Displays alert summary
  - Click to navigate to alerts page
  - Auto-dismisses after 8 seconds

- **`AlertToastContainer.jsx`**: Toast notification manager
  - Positions toasts in top-right corner
  - Manages toast queue and animations

#### Sidebar Integration
- Alerts navigation link with unread badge
- Real-time badge count updates
- Red gradient styling for visibility

## Usage

### For End Users

1. **Viewing Alerts**
   - Click "AI Alerts" in the sidebar
   - Use filters to find specific alerts (status, severity, type)
   - Search by alert title or description

2. **Handling Alerts**
   - Click an alert to view full details
   - Review entities, documents, and risk factors
   - Add action notes and acknowledge
   - Or dismiss if not actionable

3. **Notifying Agencies**
   - Click "Notify Agencies" button
   - Select target agencies
   - Add custom message with context
   - Send notification

4. **Toast Notifications**
   - Appear automatically when new alerts trigger
   - Click toast to go to alerts page
   - Close manually or wait for auto-dismiss

### For Developers

#### Adding New Alert Types

1. Create alert trigger function in `alertTriggers.js`:
```javascript
export async function checkCustomPattern(document, documentType) {
  // Your detection logic here
  
  if (conditionMet) {
    const alert = new Alert({
      type: "custom",
      severity: "high",
      title: "Custom Alert Title",
      description: "Alert description",
      details: {
        // Custom metadata
      },
      agencies: [document.agency],
      triggeredBy: "AI"
    });
    
    await alert.save();
    return alert;
  }
  
  return null;
}
```

2. Add to `triggerAlertChecks()` function:
```javascript
const customAlert = await checkCustomPattern(document, documentType);
if (customAlert) alerts.push(customAlert);
```

#### Manually Creating Alerts

```javascript
// Backend
const alert = new Alert({
  type: "custom",
  severity: "critical",
  title: "Manual Alert",
  description: "Description",
  agencies: ["CBI", "NIA"],
  triggeredBy: "System Admin"
});
await alert.save();

// Emit via Socket.IO
io.emit("alert:CBI", alert.toObject());
io.emit("alert:NIA", alert.toObject());
```

#### Customizing Alert Thresholds

Edit thresholds in `alertTriggers.js`:
```javascript
// Entity cross-match threshold
if (matchingDocs.length >= 2) { // Change this number

// Geo-fence spike threshold
if (totalIncidents >= 5) { // Change this number

// Risk score threshold
if (riskScore >= 30) { // Change this number
```

## Alert Severity Levels

| Severity | Color | Use Case |
|----------|-------|----------|
| **Low** | Blue | Informational alerts, minor patterns |
| **Medium** | Yellow | Notable patterns, requires attention |
| **High** | Orange | Significant patterns, urgent attention |
| **Critical** | Red | Immediate threats, highest priority |

## Socket.IO Events

### Client Listens For:
- `alert:{agency}`: Agency-specific alerts
- `alert:all`: Global alerts (no specific agency)
- `alert:agency:{agency}`: Notifications from other agencies

### Server Emits:
- When alert is created
- When agency notification is sent
- Real-time delivery to all connected clients

## Configuration

### Environment Variables
None required - uses existing MongoDB and Socket.IO setup

### Customization Options
- Alert thresholds in `alertTriggers.js`
- Available agencies in `AlertsPage.jsx` (line 60)
- Toast auto-dismiss time in `AlertsContext.jsx` (line 183)
- Severity colors in components (can be customized via Tailwind)

## Security Considerations

- Alerts respect agency visibility rules
- Authentication required for all alert endpoints
- Agency-based access control on alert viewing
- Notification tracking for audit trails

## Performance

- Indexed queries for fast alert retrieval
- Async alert checks don't block document processing
- Socket.IO for efficient real-time updates
- Alert expiration system (optional, via `expiresAt` field)

## Future Enhancements

- Email/SMS integration for external notifications
- Alert analytics dashboard
- Machine learning for alert prioritization
- Alert templates and custom rules UI
- Alert history and audit logs
- Scheduled alert reports
- Alert correlation and pattern detection

## Troubleshooting

### Alerts Not Appearing
1. Check Socket.IO connection in browser console
2. Verify user agency matches alert visibility
3. Check alert status filters

### Toast Notifications Not Showing
1. Ensure AlertsProvider wraps the app
2. Check AlertToastContainer is rendered
3. Verify Socket.IO connection

### Alert Triggers Not Firing
1. Check entity extraction is working
2. Verify thresholds are being met
3. Check server logs for errors in alert checks

## API Reference

See `server/routes/alerts.js` for complete API documentation.

## Support

For issues or questions, check server logs and browser console for error messages.
