# TensorFlow.js CCTV Detection Setup

## Overview

We've replaced Roboflow with **TensorFlow.js COCO-SSD** for object detection. This is a completely free, browser-based solution that requires no API keys or external services.

## Installation Steps

### 1. Install Dependencies

```bash
cd client
npm install @tensorflow/tfjs @tensorflow-models/coco-ssd
```

### 2. Remove Old .env File (Optional)

The `.env` file with Roboflow credentials is no longer needed. You can delete it or keep it for future reference:

```bash
# Optional: remove the .env file
rm client/.env
```

### 3. Restart Development Server

```bash
cd client
npm run dev
```

## How It Works

### Browser-Based Detection
- **No API calls**: Everything runs in the user's browser
- **No API keys**: No configuration needed
- **Offline capable**: Works without internet after initial load
- **Privacy-focused**: Video data never leaves the user's device

### COCO-SSD Model
- **Pre-trained**: Ready to use, no training required
- **80 object classes**: Including people, vehicles, animals, and common objects
- **Fast**: Processes frames in real-time
- **Accurate**: Based on the COCO dataset (Common Objects in Context)

## Detectable Objects

The model can detect 80 classes including:

### People & Animals
- person, dog, cat, bird, horse, sheep, cow, elephant, bear, zebra, giraffe

### Vehicles
- bicycle, car, motorcycle, airplane, bus, train, truck, boat

### Traffic & Street
- traffic light, fire hydrant, stop sign, parking meter, bench

### Common Objects
- backpack, umbrella, handbag, tie, suitcase, bottle, cup, fork, knife, spoon, bowl
- chair, couch, bed, dining table, toilet, tv, laptop, mouse, keyboard, cell phone
- And many more...

## Performance

### Speed
- **Model loading**: 2-5 seconds (one-time, on page load)
- **Frame processing**: ~100-500ms per frame
- **Total processing**: Depends on video length and device performance

### Accuracy
- **Confidence threshold**: 0.5 (50%) by default
- **Best for**: Clear, well-lit footage
- **Optimized for**: Common objects in typical CCTV scenarios

## Advantages Over Roboflow

| Feature | TensorFlow.js | Roboflow |
|---------|--------------|----------|
| Cost | Free | Free tier with limits |
| API Keys | Not required | Required |
| Rate Limits | None | Yes (free tier) |
| Privacy | Data stays local | Sent to cloud |
| Offline | Works offline | Requires internet |
| Setup | Zero config | API key setup |
| Speed | Fast (local) | Network dependent |

## Usage in Code

### Basic Detection
```javascript
import { detectObjects, loadModel } from './utils/tensorflowDetection.js';

// Load model once
await loadModel();

// Detect objects in an image
const result = await detectObjects(imageBlob);
console.log(result.predictions);
```

### Result Format
```javascript
{
  predictions: [
    {
      class: "person",
      label: "person",
      confidence: 0.95,
      bbox: [x, y, width, height],
      boundingBox: {
        x: 0.1,      // normalized 0-1
        y: 0.2,
        width: 0.3,
        height: 0.4
      }
    }
  ],
  image: {
    width: 640,
    height: 480
  }
}
```

## Troubleshooting

### Issue: Model fails to load
**Solution**: 
- Check internet connection (needed for first-time model download)
- Clear browser cache and reload
- Check browser console for errors

### Issue: Slow performance
**Solution**:
- Use shorter videos for testing
- Reduce frame extraction rate (currently 1 fps)
- Close other browser tabs
- Use a device with better CPU/GPU

### Issue: No objects detected
**Solution**:
- Ensure video has clear, visible objects
- Check lighting conditions in video
- Verify video is not corrupted
- Try with a test video containing people or vehicles

## Browser Compatibility

### Supported Browsers
- ✅ Chrome 57+
- ✅ Firefox 52+
- ✅ Safari 11+
- ✅ Edge 79+

### Requirements
- Modern browser with WebGL support
- JavaScript enabled
- ~50MB available memory for model

## Performance Optimization

### For Better Speed
1. **Reduce frame rate**: Edit `FrameExtractor.jsx` line 29
   ```javascript
   const frameInterval = 2; // Extract 1 frame every 2 seconds
   ```

2. **Lower image quality**: Edit `FrameExtractor.jsx` line 46
   ```javascript
   canvas.toBlob(resolve, "image/jpeg", 0.6); // Lower quality = faster
   ```

3. **Skip frames**: Process every Nth frame instead of all frames

### For Better Accuracy
1. **Use higher quality videos**: Better resolution = better detection
2. **Ensure good lighting**: Well-lit scenes work best
3. **Stable camera**: Reduce motion blur
4. **Clear subjects**: Objects should be clearly visible

## Comparison with Other Solutions

### TensorFlow.js COCO-SSD ✅ (Current)
- Free, no limits
- Browser-based
- No setup required
- Good accuracy for common objects

### Roboflow ❌ (Previous)
- Free tier limited
- Requires API key
- Cloud-based
- Better accuracy with custom models

### YOLO (Alternative)
- More accurate
- Requires backend server
- More complex setup
- Higher resource usage

### OpenCV.js (Alternative)
- More flexible
- Requires manual model setup
- Steeper learning curve
- Better for custom use cases

## Next Steps

1. **Test the system**: Upload a sample video
2. **Monitor performance**: Check browser console for timing
3. **Adjust settings**: Tune frame rate and quality as needed
4. **Custom models**: Consider training custom models if needed

## Support

For issues or questions:
1. Check browser console for errors
2. Verify all dependencies are installed
3. Ensure browser is up to date
4. Test with a simple video first

## References

- [TensorFlow.js Documentation](https://www.tensorflow.org/js)
- [COCO-SSD Model](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd)
- [COCO Dataset](https://cocodataset.org/)
