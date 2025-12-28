import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

let model = null;

/**
 * Load the COCO-SSD model
 * This only needs to be done once
 */
export async function loadModel() {
  if (!model) {
    console.log('🔄 Loading TensorFlow.js COCO-SSD model...');
    // Load with 'lite_mobilenet_v2' for better accuracy
    // Options: 'lite_mobilenet_v2' (more accurate) or 'mobilenet_v2' (faster)
    model = await cocoSsd.load({
      base: 'lite_mobilenet_v2' // Better accuracy than default
    });
    console.log('✅ Model loaded successfully with lite_mobilenet_v2!');
  }
  return model;
}

/**
 * Detect objects in an image blob
 * @param {Blob} imageBlob - The image to analyze
 * @returns {Promise<Object>} - Detection results in Roboflow-compatible format
 */
export async function detectObjects(imageBlob) {
  try {
    // Load model if not already loaded
    const detectionModel = await loadModel();
    
    console.log('📦 Image blob size:', imageBlob.size, 'bytes, type:', imageBlob.type);
    
    // Convert blob to image element
    const img = await blobToImage(imageBlob);
    
    console.log('🖼️ Image loaded:', {
      width: img.width,
      height: img.height,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete
    });
    
    // Preprocess image for better detection
    const processedCanvas = preprocessImage(img);
    console.log('✨ Image preprocessed with contrast enhancement');
    
    // Run detection with optimized parameters
    // maxNumBoxes: maximum number of boxes to detect (default 20)
    // minScore: minimum confidence threshold
    console.log('🔍 Running object detection...');
    
    // First try with lower threshold to see what's being detected
    const allPredictions = await detectionModel.detect(processedCanvas, 20, 0.2); // Lower threshold for debugging
    console.log(`🔎 Raw detections (20%+ confidence): ${allPredictions.length} objects`);
    if (allPredictions.length > 0) {
      console.log('📊 All detections:', allPredictions.map(p => `${p.class} (${(p.score * 100).toFixed(1)}%)`));
    }
    
    // Filter to only show good confidence detections
    const predictions = allPredictions.filter(p => p.score >= 0.4); // Lowered to 40% for now
    
    console.log(`✅ Found ${predictions.length} objects with 40%+ confidence`);
    
    if (predictions.length > 0) {
      console.log('🎯 Detected objects:', predictions.map(p => `${p.class} (${(p.score * 100).toFixed(1)}%)`));
      
      // Log high confidence detections
      const highConfidence = predictions.filter(p => p.score >= 0.7);
      if (highConfidence.length > 0) {
        console.log('⭐ High confidence detections:', highConfidence.map(p => `${p.class} (${(p.score * 100).toFixed(1)}%)`));
      }
    } else {
      console.warn('⚠️ No objects detected with confidence >= 40%. Try a clearer video or different angle.');
    }
    
    // Convert to Roboflow-compatible format
    const formattedPredictions = predictions.map(pred => ({
      class: pred.class,
      label: pred.class,
      confidence: pred.score,
      bbox: pred.bbox,
      // Normalize bounding box to 0-1 range
      boundingBox: {
        x: pred.bbox[0] / img.width,
        y: pred.bbox[1] / img.height,
        width: pred.bbox[2] / img.width,
        height: pred.bbox[3] / img.height
      }
    }));
    
    return {
      predictions: formattedPredictions,
      image: {
        width: img.width,
        height: img.height
      }
    };
  } catch (error) {
    console.error('❌ Error in object detection:', error);
    console.error('Error details:', error.message, error.stack);
    return { predictions: [] };
  }
}

/**
 * Convert a blob to an HTML image element
 * @param {Blob} blob - The image blob
 * @returns {Promise<HTMLImageElement>}
 */
function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    
    img.crossOrigin = 'anonymous'; // Enable CORS
    
    img.onload = () => {
      // Wait for image to be fully decoded
      if (img.decode) {
        img.decode()
          .then(() => {
            URL.revokeObjectURL(url);
            resolve(img);
          })
          .catch(err => {
            console.error('Image decode error:', err);
            URL.revokeObjectURL(url);
            resolve(img); // Still resolve even if decode fails
          });
      } else {
        URL.revokeObjectURL(url);
        resolve(img);
      }
    };
    
    img.onerror = (err) => {
      console.error('Image load error:', err);
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Preprocess image to improve detection accuracy
 * Applies contrast enhancement and sharpening
 * @param {HTMLImageElement} img - The source image
 * @returns {HTMLCanvasElement} - Preprocessed image as canvas
 */
function preprocessImage(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  
  // Draw original image
  ctx.drawImage(img, 0, 0);
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Apply contrast enhancement
  const contrast = 1.2; // Increase contrast by 20%
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = factor * (data[i] - 128) + 128;     // Red
    data[i + 1] = factor * (data[i + 1] - 128) + 128; // Green
    data[i + 2] = factor * (data[i + 2] - 128) + 128; // Blue
    // Alpha channel (i + 3) remains unchanged
  }
  
  // Put enhanced image data back
  ctx.putImageData(imageData, 0, 0);
  
  return canvas;
}

/**
 * Get list of detectable classes
 * COCO-SSD can detect 80 classes including:
 * - People: person
 * - Vehicles: car, truck, bus, motorcycle, bicycle
 * - Animals: dog, cat, bird, horse, etc.
 * - Objects: backpack, umbrella, handbag, etc.
 */
export const DETECTABLE_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
  'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];
