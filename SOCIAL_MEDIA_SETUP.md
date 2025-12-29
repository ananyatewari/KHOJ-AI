# Social Media API Integration Setup

## Overview
The social media monitoring service automatically fetches posts from the configured API endpoint and filters them for crime-related content using NLP keyword analysis.

## Configuration

### 1. Environment Variables
Add this to your `.env` file:

```env
SOCIAL_MEDIA_API_URL=https://dummy-social-media-a9ip.onrender.com/api/posts
```

### 2. API Response Format
The API returns posts in this format:

```json
{
  "posts": [
    {
      "id": "695260adc47adeb2a6efc240",
      "content": "huge stampede in dwarka sector 27, delhi. hope everyone is safe!!!",
      "username": "ananya",
      "userId": "69525c68c47adeb2a6efc215",
      "imageUrl": null,
      "createdAt": "2025-12-29T11:06:21.276Z",
      "likes": 0
    }
  ]
}
```

## How It Works

### 1. Automatic Fetching
- The service starts automatically when the server starts
- Fetches posts every 5 seconds from the configured API endpoint
- Processes all posts and filters for crime-related content

### 2. NLP Filtering
The service uses keyword-based NLP to detect crime-related posts. Keywords include:

**General Crime Terms:**
- crime, criminal, illegal, theft, steal, robbery, burglary
- assault, attack, violence, fight, weapon, gun, knife, shooting
- murder, kill, homicide, death, injure, hurt, victim

**Specific Crimes:**
- fraud, scam, drugs, narcotics, overdose, vandalism, arson
- kidnap, abduction, harassment, stalking, threat, intimidation

**Suspicious Activity:**
- suspicious, strange, unusual, weird, concerning, alarming
- emergency, danger, unsafe, risky

**Law Enforcement:**
- police, cop, officer, detective, investigation, arrest
- detain, custody, jail, prison, court, legal, law

**Emergency Situations:**
- stampede, panic, crowd crush, accident, incident, tragedy
- 112, emergency, help, danger, flee, escape, chase, ambulance, fire

### 3. Post Analysis
Each post is analyzed for:
- **Crime-related**: Whether it matches any crime keywords
- **Crime Type**: theft, assault, drugs, fraud, vandalism, suspicious_activity
- **Severity**: low, medium, high, critical
- **Confidence**: 0-100% based on keyword matches
- **Sentiment**: positive, negative, neutral

### 4. Event Creation
When crime-related posts are detected:
- Posts with 60%+ confidence create new events
- Related posts within 2 hours and 5km are grouped together
- High severity events trigger automatic alerts

## API Endpoints

### Get All Posts
```
GET /api/social-media/posts
```

Query parameters:
- `page` - Page number (default: 1)
- `limit` - Posts per page (default: 20)
- `platform` - Filter by platform
- `severity` - Filter by severity (low, medium, high, critical)
- `isCrimeRelated` - Filter crime-related posts (true/false)
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `search` - Search in content, username, or keywords

### Get Crime-Related Posts Only
```
GET /api/social-media/posts/crime
```

Query parameters:
- `page`, `limit`, `severity`, `crimeType`, `startDate`, `endDate`

### Get Social Media Events
```
GET /api/social-media/events
```

Query parameters:
- `page`, `limit`, `severity`, `status`, `eventType`, `startDate`, `endDate`

### Get Statistics
```
GET /api/social-media/stats
```

Returns:
- Total posts
- Crime posts in last 24h and 7d
- Active events
- Platform statistics
- Crime type distribution

### Service Control (Protected)
```
POST /api/social-media/service/start
POST /api/social-media/service/stop
GET /api/social-media/service/status
POST /api/social-media/fetch (manual trigger)
```

## Testing

### Manual Test
Run the test script:
```bash
cd server
node test-social-media.js
```

This will:
1. Fetch posts from the API
2. Analyze each post for crime-related content
3. Show matched keywords and confidence scores
4. Display summary statistics

### Check Service Status
```bash
curl http://localhost:3000/api/social-media/service/status
```

### View Crime Posts
```bash
curl http://localhost:3000/api/social-media/posts/crime
```

## Example Detection

**Input Post:**
```
"huge stampede in dwarka sector 27, delhi. hope everyone is safe!!!"
```

**Analysis Result:**
- Crime-Related: ✓ YES
- Matched Keywords: [stampede, emergency, danger]
- Crime Type: suspicious_activity
- Severity: high
- Confidence: 45%

## Troubleshooting

### Service Not Starting
1. Check if `SOCIAL_MEDIA_API_URL` is set in `.env`
2. Verify MongoDB connection is working
3. Check server logs for errors

### No Posts Being Detected
1. Verify API endpoint is accessible
2. Check if posts contain crime-related keywords
3. Review keyword list in `socialMediaService.js`

### Posts Not Saving to Database
1. Ensure MongoDB is running
2. Check for duplicate post IDs
3. Verify schema validation

## Database Models

### SocialMediaPost
Stores individual posts with analysis results

### SocialMediaEvent
Groups related crime posts into events

### Alert
Creates alerts for high-severity events

## Notes

- The service runs continuously in the background
- Duplicate posts are automatically skipped
- Posts are analyzed in real-time as they're fetched
- Crime-related posts trigger event creation and alerts
- All data is stored in MongoDB for historical analysis
