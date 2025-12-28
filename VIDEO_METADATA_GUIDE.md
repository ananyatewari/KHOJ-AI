# Video Metadata Extraction & Analysis Feature

## Overview

The Video Metadata Extraction feature automatically extracts comprehensive metadata from uploaded CCTV videos using FFmpeg/FFprobe, including technical specifications, embedded GPS coordinates, camera information, and provides AI-powered analysis for CCTV suitability assessment.

---

## Features

### 1. **Comprehensive Metadata Extraction**

#### Technical Metadata
- **Video Stream**: Codec, resolution, frame rate, bitrate, aspect ratio, pixel format
- **Audio Stream**: Codec, sample rate, channels, bitrate
- **Container Format**: Format name, duration, file size, total bitrate

#### Embedded Metadata
- **Recording Time**: Creation timestamp from video file
- **Camera/Device Info**: Make and model of recording device
- **GPS Coordinates**: Latitude/longitude if embedded in video
- **Additional Tags**: Title, artist, comment, encoder, software, copyright

### 2. **AI-Powered Analysis**

#### Quality Assessment
- Automatic quality rating: Excellent, Good, Fair, Poor
- Based on resolution, frame rate, bitrate, and codec
- Quality score calculation (0-100)

#### CCTV Suitability Analysis
- Suitability rating for CCTV analysis purposes
- Score based on technical parameters
- Recommendations for optimal settings

#### Smart Recommendations
- Suggestions for improving video quality
- Warnings about suboptimal settings
- Best practices for CCTV footage

#### Alerts
- Missing GPS data notifications
- Unusual codec warnings
- Duration alerts
- Timestamp availability checks

---

## How It Works

### Backend Processing Flow

1. **Upload**: User uploads video file
2. **Storage**: Video saved to server disk
3. **Metadata Extraction**: FFprobe extracts all available metadata
4. **Analysis**: AI analyzes metadata for quality and suitability
5. **Database Update**: Comprehensive metadata stored in MongoDB
6. **Real-time Notification**: Socket.IO emits completion event
7. **Display**: Frontend shows metadata in organized tabs

### Metadata Structure

```javascript
{
  basic: {
    duration: 120.5,           // seconds
    size: 52428800,            // bytes
    bitrate: 3500000,          // bits/sec
    format: "mov,mp4,m4a,3gp,3g2,mj2",
    formatLongName: "QuickTime / MOV"
  },
  video: {
    codec: "h264",
    codecLongName: "H.264 / AVC / MPEG-4 AVC",
    width: 1920,
    height: 1080,
    fps: 30,
    aspectRatio: "16:9",
    pixelFormat: "yuv420p",
    bitrate: 3200000,
    profile: "High",
    level: 40
  },
  audio: {
    codec: "aac",
    codecLongName: "AAC (Advanced Audio Coding)",
    sampleRate: 48000,
    channels: 2,
    bitrate: 128000
  },
  embedded: {
    creationTime: "2025-12-28T10:00:00.000Z",
    make: "Apple",
    model: "iPhone 14 Pro",
    location: {
      latitude: 40.7128,
      longitude: -74.0060,
      raw: "+40.7128-074.0060/"
    },
    encoder: "Lavf58.76.100"
  },
  derived: {
    totalFrames: 3615,
    resolution: "1920x1080",
    quality: "excellent",
    estimatedFileSize: "50.00 MB"
  }
}
```

### Analysis Structure

```javascript
{
  summary: "Video is 2m 0s long with 1920x1080 resolution at 30 FPS. Quality assessment: excellent. Recorded on 12/28/2025...",
  
  recommendations: [
    "Consider using higher quality video for better object detection accuracy",
    "Higher frame rates (30+ FPS) improve motion tracking"
  ],
  
  alerts: [
    { level: "warning", message: "No GPS location data embedded in video" },
    { level: "info", message: "Uncommon video codec: h265" }
  ],
  
  suitability: {
    rating: "excellent",
    score: 85,
    message: "Highly suitable for CCTV analysis"
  }
}
```

---

## Usage

### Step 1: Upload Video
1. Navigate to **CCTV Analysis** page
2. Click **"Upload Video"** tab
3. Fill in camera information (optional)
4. Upload your video file
5. Wait for upload to complete

### Step 2: Automatic Metadata Extraction
- Metadata extraction starts automatically after upload
- Process takes 5-15 seconds depending on video size
- Real-time logs show extraction progress
- Socket.IO notification when complete

### Step 3: View Metadata
1. Go to **"Video Library"** tab
2. Click on uploaded video
3. Click **"Video Metadata"** tab
4. Explore metadata in organized tabs:
   - **Overview**: Summary, quality, suitability
   - **Technical Details**: Video/audio stream specs
   - **Embedded Data**: GPS, camera info, timestamps
   - **AI Analysis**: Recommendations and alerts

---

## Frontend Components

### VideoMetadataView.jsx

Comprehensive metadata display component with:

#### Tab Navigation
- **Overview Tab**: Key metrics, quality assessment, suitability score
- **Technical Tab**: Detailed video/audio stream information
- **Embedded Tab**: GPS coordinates, camera info, recording time
- **Analysis Tab**: AI recommendations and alerts

#### Features
- Color-coded quality indicators
- Interactive GPS links (Google Maps)
- Responsive grid layouts
- Progress bars for suitability scores
- Alert badges with severity levels

---

## API Endpoints

### Get Video with Metadata
```
GET /api/cctv/:videoId
Headers: Authorization: Bearer <token>

Response:
{
  "_id": "...",
  "originalName": "cctv_footage.mp4",
  "videoMetadata": {
    "duration": 120,
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "quality": "excellent",
    "comprehensive": {
      "basic": {...},
      "video": {...},
      "audio": {...},
      "embedded": {...},
      "analysis": {...}
    }
  },
  ...
}
```

---

## Quality Assessment Criteria

### Scoring System (0-100 points)

#### Resolution (0-40 points)
- 4K (3840x2160): 40 points
- 1080p (1920x1080): 35 points
- 720p (1280x720): 25 points
- 480p (854x480): 15 points
- Below 480p: 5 points

#### Frame Rate (0-20 points)
- 60+ FPS: 20 points
- 30-59 FPS: 15 points
- 24-29 FPS: 10 points
- Below 24 FPS: 5 points

#### Bitrate (0-40 points)
- 10+ Mbps: 40 points
- 5-10 Mbps: 30 points
- 2-5 Mbps: 20 points
- 1-2 Mbps: 10 points
- Below 1 Mbps: 5 points

#### Codec (0-10 points)
- H.265/HEVC: 10 points
- H.264/AVC: 8 points
- Other: 5 points

### Quality Ratings
- **Excellent**: 85-100 points
- **Good**: 65-84 points
- **Fair**: 45-64 points
- **Poor**: 0-44 points

---

## CCTV Suitability Assessment

### Scoring Factors

1. **Quality (40%)**: Overall video quality score
2. **Resolution (30%)**: Minimum 720p recommended
3. **Frame Rate (20%)**: Minimum 24 FPS recommended
4. **Duration (10%)**: Optimal 1-10 minutes

### Suitability Ratings
- **Excellent (80-100%)**: Highly suitable for CCTV analysis
- **Good (60-79%)**: Suitable for CCTV analysis
- **Fair (40-59%)**: Acceptable with limitations
- **Poor (0-39%)**: May have limited accuracy

---

## GPS Data Extraction

### Supported Formats

1. **ISO 6709**: `+40.7128-074.0060/`
2. **QuickTime Location**: `com.apple.quicktime.location.ISO6709`
3. **Standard GPS Tags**: `GPS:GPSLatitude`, `GPS:GPSLongitude`
4. **Decimal Degrees**: Direct numeric values
5. **DMS Format**: `40° 26' 46.302" N`

### GPS Display
- Decimal degrees with 6 decimal places
- Direct link to Google Maps
- Raw format preservation
- Missing GPS alerts

---

## Technical Requirements

### Server Dependencies
```json
{
  "fluent-ffmpeg": "^2.1.3",
  "ffmpeg-static": "^5.3.0"
}
```

### FFmpeg Capabilities
- FFprobe for metadata extraction
- Support for all major video formats
- Embedded metadata parsing
- Stream analysis

---

## Performance

### Extraction Speed
- Small videos (< 100MB): 2-5 seconds
- Medium videos (100-500MB): 5-10 seconds
- Large videos (> 500MB): 10-20 seconds

### Optimization
- Asynchronous processing (non-blocking)
- Metadata extraction only (no transcoding)
- Efficient FFprobe usage
- Socket.IO for real-time updates

---

## Error Handling

### Common Issues

#### FFprobe Not Found
**Solution**: Ensure `ffmpeg-static` is installed
```bash
npm install ffmpeg-static
```

#### Metadata Extraction Failed
**Causes**: Corrupted video, unsupported format
**Solution**: Check video file integrity, try different format

#### No GPS Data
**Cause**: Video doesn't have embedded GPS
**Solution**: Normal for most CCTV cameras, not an error

---

## Best Practices

### For Optimal CCTV Analysis

1. **Resolution**: Use 1080p or higher
2. **Frame Rate**: 30 FPS minimum
3. **Bitrate**: 5 Mbps or higher
4. **Codec**: H.264 or H.265
5. **Duration**: Keep videos under 10 minutes
6. **GPS**: Enable GPS on recording device if available

### Video Upload Tips

1. Use original files (avoid re-encoding)
2. Maintain proper camera settings
3. Ensure good lighting conditions
4. Stable camera mounting
5. Regular camera maintenance

---

## Files Created/Modified

### Backend
- ✅ `server/services/videoMetadataExtractor.js` - Metadata extraction service
- ✅ `server/routes/cctv.js` - Added metadata extraction to upload
- ✅ `server/models/CCTVVideo.js` - Updated schema for comprehensive metadata

### Frontend
- ✅ `client/src/components/cctv/VideoMetadataView.jsx` - Metadata display component
- ✅ `client/src/pages/CCTVPage.jsx` - Added Video Metadata tab

### Documentation
- ✅ `VIDEO_METADATA_GUIDE.md` - This file

---

## Future Enhancements

- Scene detection and keyframe extraction
- Motion analysis and activity detection
- Face detection from metadata
- Automatic video quality enhancement suggestions
- Batch metadata extraction
- Metadata export (JSON, CSV)
- Video comparison tools
- Metadata-based search and filtering
- Integration with external mapping services
- Camera calibration recommendations

---

**Implementation Status: ✅ Complete**

The Video Metadata Extraction & Analysis feature is now fully integrated into the KHOJ-AI CCTV system and ready for use.
