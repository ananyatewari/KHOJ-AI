# CCTV Analysis Troubleshooting Guide

## Current Issues and Solutions

### Issue 1: "No token" Error in Detection Results ✅ FIXED

**Problem**: DetectionResults component was not sending authentication token with API requests.

**Solution**: Added `Authorization` header with Bearer token to axios requests.

**File Changed**: `client/src/components/cctv/DetectionResults.jsx`

---

### Issue 2: Roboflow API 403 Errors ⚠️ REQUIRES SETUP

**Problem**: Console shows multiple "Roboflow API error: 403" messages.

**Root Cause**: Missing or incorrect Roboflow API credentials.

**Solution Steps**:

1. **Create a Roboflow Account**
   - Go to [https://roboflow.com](https://roboflow.com)
   - Sign up for a free account
   - Navigate to your workspace

2. **Get Your API Key**
   - Click on your profile → Settings
   - Copy your API key from the "Roboflow API" section

3. **Choose or Create a Model**
   - Use an existing model (e.g., COCO dataset for general object detection)
   - Or create your own custom model
   - Note the model ID (format: `workspace/model-name/version`)
   - Example: `coco-dataset/3` or `microsoft-coco/3`

4. **Configure Environment Variables**
   
   Create `.env` file in the `client` directory:
   ```bash
   cd client
   touch .env  # or create manually
   ```

   Add these lines to `.env`:
   ```
   VITE_ROBOFLOW_API_KEY=your_actual_api_key_here
   VITE_ROBOFLOW_MODEL_ID=your-model-id/version
   ```

   **Example**:
   ```
   VITE_ROBOFLOW_API_KEY=abc123xyz789def456
   VITE_ROBOFLOW_MODEL_ID=microsoft-coco/3
   ```

5. **Restart Development Server**
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

---

### Issue 3: Status Shows "Completed" But No Detections ✅ FIXED

**Problem**: Videos were marked as completed even when Roboflow API failed.

**Solution**: 
- Added validation to check if detections are empty
- Added warning messages when no objects are detected
- Backend now logs total detections count
- Frontend warns if >80% of frames have no detections

**Files Changed**: 
- `server/routes/cctv.js`
- `client/src/components/cctv/CCTVUpload.jsx`

---

## How to Test the Fixes

### 1. Setup Roboflow (One-time)
```bash
# In client directory
cd client
touch .env

# Edit .env and add:
# VITE_ROBOFLOW_API_KEY=your_key
# VITE_ROBOFLOW_MODEL_ID=your_model/version

# Restart dev server
npm run dev
```

### 2. Upload and Process a Video
1. Navigate to CCTV Analysis page
2. Fill in camera information (optional)
3. Upload a video file
4. Click "Start Frame Extraction"
5. Wait for processing to complete

### 3. Verify Results
- Check browser console for Roboflow API responses
- Should see: "Processing frame X/Y" messages
- Should NOT see: "Roboflow API error: 403"
- After completion, status should show "completed"
- Click "View Results" to see detections

---

## Console Messages Explained

### ✅ Good Messages
```
Processing frame 1/30
Processing frame 2/30
...
Sending detections to backend: 30
Detections saved successfully
```

### ⚠️ Warning Messages
```
Warning: Most frames returned no detections. 
Please verify your Roboflow API key and model ID in the .env file.
```
**Action**: Check your `.env` file configuration.

### ❌ Error Messages
```
Roboflow API error: 403 (Forbidden)
```
**Action**: Invalid API key or model ID. Verify credentials.

```
No token
```
**Action**: This should be fixed now. If you still see it, clear browser cache and reload.

---

## Recommended Roboflow Models

For general CCTV object detection, use these pre-trained models:

1. **Microsoft COCO** (Recommended for beginners)
   - Model ID: `microsoft-coco/3`
   - Detects: people, cars, trucks, buses, motorcycles, etc.
   - Free tier available

2. **COCO Dataset**
   - Model ID: `coco-dataset/3`
   - Similar to Microsoft COCO
   - 80 object classes

3. **Custom Models**
   - Train your own for specific use cases
   - Better accuracy for your specific needs
   - Requires labeled training data

---

## Verification Checklist

Before uploading videos, verify:

- [ ] `.env` file exists in `client` directory
- [ ] `VITE_ROBOFLOW_API_KEY` is set correctly
- [ ] `VITE_ROBOFLOW_MODEL_ID` is set correctly
- [ ] Development server was restarted after creating `.env`
- [ ] Browser console shows no 403 errors
- [ ] Test with a short video first (< 1 minute)

---

## Performance Tips

1. **Video Length**: Start with videos under 2 minutes
2. **Frame Rate**: System extracts 1 frame/second (configurable)
3. **API Limits**: Roboflow free tier has rate limits
4. **Processing Time**: ~1-2 seconds per frame

---

## Common Errors and Solutions

### Error: "Failed to save detections"
**Cause**: Backend couldn't save to database
**Solution**: Check MongoDB connection in server logs

### Error: "No detections provided"
**Cause**: All frames returned empty results from Roboflow
**Solution**: 
1. Verify API credentials
2. Check if video has visible objects
3. Try a different video

### Error: "Access denied"
**Cause**: User doesn't have permission to view video
**Solution**: Ensure user belongs to the correct agency

---

## Files Modified in This Fix

1. **client/src/components/cctv/DetectionResults.jsx**
   - Added authentication token to API requests
   - Added null-safe default values for detections

2. **client/src/components/cctv/CCTVUpload.jsx**
   - Added Roboflow error detection
   - Added warning messages for API failures
   - Added informational banner about setup

3. **client/src/components/cctv/FrameExtractor.jsx**
   - Improved UI with styled button
   - Added progress bar

4. **client/src/utils/roboflow.js**
   - Fixed environment variable names (VITE_ prefix)
   - Added error handling for API failures

5. **server/routes/cctv.js**
   - Added validation for empty detections
   - Added detection counting logic
   - Added warning responses

6. **client/.env.example**
   - Created template for environment variables

---

## Next Steps

1. **Setup Roboflow credentials** (see steps above)
2. **Restart development server**
3. **Test with a sample video**
4. **Check console for any remaining errors**
5. **View detection results**

---

## Support

If you continue to experience issues:

1. Check browser console for error messages
2. Check server logs for backend errors
3. Verify MongoDB is running
4. Verify Roboflow API key is valid
5. Try with a different video file

For Roboflow-specific issues, visit [Roboflow Documentation](https://docs.roboflow.com/)
