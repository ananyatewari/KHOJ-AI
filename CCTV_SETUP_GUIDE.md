# CCTV Analysis Setup Guide

## Overview
The CCTV analysis feature allows you to upload video footage, extract frames, and perform object detection using Roboflow AI.

## Prerequisites

### 1. Roboflow Account Setup
1. Create a free account at [Roboflow](https://roboflow.com/)
2. Create or use an existing object detection model
3. Get your API key and model ID from the Roboflow dashboard

### 2. Environment Configuration

#### Client Setup
Create a `.env` file in the `client` directory:

```bash
cd client
cp .env.example .env
```

Edit `.env` and add your Roboflow credentials:
```
VITE_ROBOFLOW_API_KEY=your_actual_api_key_here
VITE_ROBOFLOW_MODEL_ID=your-model-id/version
```

**Example:**
```
VITE_ROBOFLOW_API_KEY=abc123xyz789
VITE_ROBOFLOW_MODEL_ID=coco-dataset/3
```

## How It Works

### Workflow
1. **Upload Video**: User uploads a video file (MP4, AVI, MOV, MKV up to 100MB)
2. **Extract Frames**: Browser extracts 1 frame per second from the video
3. **Object Detection**: Each frame is sent to Roboflow API for analysis
4. **Save Results**: Detection results are saved to MongoDB with status "completed"
5. **View Results**: User can view detection summary and detailed results

### Architecture
- **Frontend**: React with browser-based frame extraction (HTML5 video + canvas)
- **Backend**: Node.js/Express with MongoDB for storage
- **AI**: Roboflow API for object detection

## Usage

### 1. Upload a Video
1. Navigate to CCTV Analysis page
2. Fill in camera information (optional but recommended):
   - Camera ID
   - Location
   - Latitude/Longitude
3. Drag and drop or click to select a video file
4. Wait for upload to complete

### 2. Extract Frames & Analyze
1. After upload, click "Start Frame Extraction" button
2. Wait for frame extraction (progress bar shows status)
3. Frames are automatically sent to Roboflow for detection
4. Processing time depends on video length (typically 1-5 minutes)

### 3. View Results
1. Go to "Video Library" tab
2. Videos with status "completed" can be viewed
3. Click "View Results" to see:
   - Detection summary (persons, vehicles, risk score)
   - Frame-by-frame object detections
   - Confidence scores for each detection

## Detection Summary

The system automatically calculates:
- **Total Persons**: Count of people detected
- **Total Vehicles**: Count of cars, trucks, buses, motorcycles
- **Total Weapons**: Count of weapons detected
- **Risk Score**: Calculated based on detections (0-100)
  - Weapons detected: +50 points
  - More than 10 persons: +20 points
  - More than 5 vehicles: +10 points
- **Suspicious Activity**: Flagged if risk score > 50 or weapons detected

## Troubleshooting

### Issue: "Roboflow credentials not configured"
**Solution**: Ensure `.env` file exists in client directory with correct credentials

### Issue: Frame extraction not starting
**Solution**: 
- Check browser console for errors
- Ensure video file is valid and not corrupted
- Try a smaller video file first

### Issue: Processing takes too long
**Solution**: 
- Roboflow free tier has rate limits
- Consider using shorter videos for testing
- Upgrade Roboflow plan for higher limits

### Issue: No objects detected
**Solution**:
- Verify Roboflow model is trained for the objects you're looking for
- Check if video quality is sufficient
- Ensure proper lighting in the video

## API Endpoints

### POST `/api/cctv/upload`
Upload a video file
- **Body**: FormData with video file and camera info
- **Returns**: `{ videoId, status: "uploaded" }`

### POST `/api/cctv/:videoId/detections`
Save detection results
- **Body**: `{ detections: [...] }`
- **Returns**: `{ success: true, summary: {...} }`

### GET `/api/cctv`
Get all videos for user's agency
- **Returns**: `{ videos: [...], totalPages, currentPage, total }`

### GET `/api/cctv/:videoId/detections`
Get detection results for a video
- **Returns**: `{ objectDetections: [...], faceDetections: [...], detectionSummary: {...} }`

## Performance Tips

1. **Video Length**: Keep videos under 5 minutes for faster processing
2. **Frame Rate**: System extracts 1 frame/second (configurable in FrameExtractor.jsx line 29)
3. **File Size**: Compress videos before upload if possible
4. **Batch Processing**: Process one video at a time to avoid rate limits

## Security Notes

- Videos are stored on the server in `uploads/videos/` directory
- Only users from the same agency can view videos
- API authentication required for all endpoints
- Roboflow API key should never be exposed in client code (uses environment variables)

## Future Enhancements

- [ ] Real-time video streaming support
- [ ] Face recognition integration
- [ ] Custom alert rules based on detections
- [ ] Video playback with detection overlays
- [ ] Export detection reports (PDF/JSON)
- [ ] Multi-camera synchronization
