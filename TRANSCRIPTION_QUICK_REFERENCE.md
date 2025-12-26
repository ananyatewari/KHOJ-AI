# Audio Transcription - Quick Reference

## 🚀 Quick Start

1. **Start Server**: `cd server && npm run dev`
2. **Start Client**: `cd client && npm run dev`
3. **Login**: Use your credentials
4. **Navigate**: Click "🎙️ Audio Transcription" in sidebar
5. **Upload**: Drag audio file or click to browse
6. **Wait**: Processing takes 30-60 seconds
7. **View**: Results show with transcript, entities, and summary

## 📁 New Files Created

### Backend

```
server/
├── models/Transcription.js          [NEW] MongoDB schema
├── routes/transcription.js           [NEW] API endpoints
├── utils/extractEntities.js          [NEW] Entity extraction
└── services/
    ├── aiService.js                  [MODIFIED] ES6 conversion
    └── transcriptionService.js       [MODIFIED] ES6 imports
```

### Frontend

```
client/src/
├── context/TranscriptionContext.jsx  [NEW] State management
├── components/transcription/
│   └── AudioUploader.jsx             [NEW] Upload component
├── pages/
│   ├── TranscriptionPage.jsx         [NEW] Main page
│   └── TranscriptionView.jsx         [NEW] Detail page
└── components/layout/
    └── SideBar.jsx                   [MODIFIED] Added nav link
```

## 🔌 API Endpoints

### Upload & Process

```
POST /api/transcription/process
Content-Type: multipart/form-data
Authorization: Bearer {token}

Body:
- audio: File
- userId: string (optional)
- agency: string (optional)

Response: { transcription: {...} }
```

### Get Transcription

```
GET /api/transcription/:id
Authorization: Bearer {token}

Response: { id, transcript, entities, aiSummary, ... }
```

### List Transcriptions

```
GET /api/transcription/
Authorization: Bearer {token}

Response: { transcriptions: [...] }
```

## 🎯 Main Features

| Feature           | Status | Notes                                |
| ----------------- | ------ | ------------------------------------ |
| Audio Upload      | ✅     | MP3, WAV, M4A, MP4                   |
| Drag-Drop         | ✅     | Up to 5 files                        |
| Transcription     | ✅     | Whisper API                          |
| Entity Extraction | ✅     | 5 entity types                       |
| AI Summary        | ✅     | GPT-4 analysis                       |
| Key Points        | ✅     | Automatic                            |
| Decisions         | ✅     | Logged                               |
| Action Items      | ✅     | With assignees                       |
| Next Steps        | ✅     | Generated                            |
| Takeaways         | ✅     | Curated                              |
| Download          | ✅     | JSON format                          |
| Detail View       | ✅     | Tabs: Transcript, Entities, Analysis |
| Access Control    | ✅     | Agency-based                         |
| Database          | ✅     | MongoDB                              |

## 🗂️ File Types Supported

- `.mp3` - MPEG Audio
- `.wav` - Wave Audio
- `.m4a` - MPEG-4 Audio
- `.mp4` - MPEG-4 Video (extracts audio)

## 🔑 Environment Variables Needed

```bash
OPENAI_API_KEY=sk-... # Required for Whisper + GPT-4
MONGO_URI=mongodb://... # Required for database
```

## 🎨 UI/UX Details

### Sidebar

- Icon: 🎙️
- Label: "Audio Transcription"
- Color: Cyan to Blue gradient
- Route: `/app/transcription`

### Upload Page

- Title: "Audio Transcription & Analysis"
- Subtitle: "Upload up to 5 audio files..."
- Upload Area: Drag-drop or click
- Button: "Transcribe & Analyze 🚀"

### Results Display

- Shows: Filename, preview transcript, entities, summary
- Button: "View Full →" (navigates to detail)
- Button: "📥 Download Summary"

### Detail Page

- Tabs: 📝 Transcript | 🏷️ Entities | ✨ Analysis
- Content: Full details for each tab
- Download: "📥 Download as JSON"
- Back: "← Back to Transcriptions"

## 🔄 Data Flow

```
User Upload
    ↓
Audio File → Multer (upload) → /api/transcription/process
    ↓
Whisper API (transcribe)
    ↓
GPT-4 (extract entities + analyze)
    ↓
Transcription Model (save to MongoDB)
    ↓
Response with: transcript, entities, summary
    ↓
Frontend Display (AudioUploader shows results)
    ↓
User clicks "View Full" → TranscriptionView (detail page)
```

## 📊 Database Schema (Key Fields)

```javascript
{
  filename: String,              // Original filename
  originalAudio: String,         // /uploads/filename
  transcript: String,            // Full text from Whisper
  entities: {                    // NLP extracted
    persons: [{text, confidence}],
    places: [{text, confidence}],
    // ... 3 more types
  },
  aiSummary: {                   // GPT-4 analysis
    executiveSummary: String,
    keyDiscussionPoints: [String],
    decisionsMade: [String],
    actionItems: [{item, assignee, dueDate}],
    nextSteps: [String],
    importantDeadlines: [String],
    takeaways: [String]
  },
  agency: String,                // User's agency
  uploadedBy: String,            // Username
  visibility: [String],          // Agencies with access
  status: 'processing|completed|failed',
  processingTime: Number,        // ms
  createdAt: Date,
  updatedAt: Date
}
```

## ⚡ Performance Tips

- Limit to ~5 files per batch
- Audio <30 minutes recommended
- Processing: ~30-60 seconds per file
- Network: Faster with wired connection
- Browser: Chrome/Firefox/Edge recommended
- Memory: 2GB+ RAM recommended

## 🐛 Common Issues & Fixes

| Issue                    | Solution                      |
| ------------------------ | ----------------------------- |
| "No audio file provided" | Check file was selected       |
| "Only audio files..."    | Use MP3, WAV, M4A, or MP4     |
| 500 Error                | Check OPENAI_API_KEY          |
| No entities shown        | Normal for low speech content |
| Timeout                  | File too large, split up      |
| Auth failed              | Refresh page, re-login        |
| Routes not found         | Restart server                |

## 📚 Documentation

- `TRANSCRIPTION_INTEGRATION.md` - Technical details
- `TRANSCRIPTION_SETUP_GUIDE.md` - Setup & testing
- `TRANSCRIPTION_CHECKLIST.md` - Complete checklist
- `TRANSCRIPTION_QUICK_REFERENCE.md` - This file

## 🎓 Code Examples

### Upload Audio (Frontend)

```javascript
const formData = new FormData();
formData.append("audio", audioFile);
const response = await axios.post("/api/transcription/process", formData, {
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "multipart/form-data",
  },
});
```

### Get Transcription (Frontend)

```javascript
const response = await axios.get(`/api/transcription/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

### Hook Usage

```javascript
import { useTranscriptionWorkspace } from "../context/TranscriptionContext";

const { selectedFiles, transcriptions, summary, uploading, handleSubmit } =
  useTranscriptionWorkspace();
```

## ✅ Quality Checklist

Before going live:

- [ ] Test with various audio formats
- [ ] Test with multiple file upload
- [ ] Verify all entities extract correctly
- [ ] Check summary quality
- [ ] Test download functionality
- [ ] Verify access control
- [ ] Check error messages
- [ ] Test on mobile (if needed)
- [ ] Performance test with large files
- [ ] Verify logging works
- [ ] Check database storage
- [ ] Test with slow network

## 📞 Support

For issues:

1. Check logs: `console` (frontend), terminal (backend)
2. Verify API keys are set
3. Check MongoDB connection
4. Review `/TRANSCRIPTION_SETUP_GUIDE.md`
5. See `/TRANSCRIPTION_CHECKLIST.md` for details

---

**Status**: ✅ Complete & Ready for Testing
**Last Updated**: 2024
**Version**: 1.0.0
