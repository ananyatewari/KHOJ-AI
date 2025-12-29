import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

let model = null;

export async function loadModel() {
  if (!model) {
    console.log('🔄 Loading TensorFlow.js COCO-SSD model...');
    model = await cocoSsd.load({
      base: 'lite_mobilenet_v2' 
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
    const detectionModel = await loadModel();
    
    console.log('📦 Image blob size:', imageBlob.size, 'bytes, type:', imageBlob.type);
    
    const img = await blobToImage(imageBlob);
    
    console.log('🖼️ Image loaded:', {
      width: img.width,
      height: img.height,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete
    });
    
    const processedCanvas = preprocessImage(img);
    console.log('✨ Image preprocessed with contrast enhancement');
    
    console.log('🔍 Running object detection...');
    
    const allPredictions = await detectionModel.detect(processedCanvas, 20, 0.2); 
    console.log(`🔎 Raw detections (20%+ confidence): ${allPredictions.length} objects`);
    if (allPredictions.length > 0) {
      console.log('📊 All detections:', allPredictions.map(p => `${p.class} (${(p.score * 100).toFixed(1)}%)`));
    }
    
    const predictions = allPredictions.filter(p => p.score >= 0.4); 
    
    console.log(`✅ Found ${predictions.length} objects with 40%+ confidence`);
    
    if (predictions.length > 0) {
      console.log('🎯 Detected objects:', predictions.map(p => `${p.class} (${(p.score * 100).toFixed(1)}%)`));
      
      const highConfidence = predictions.filter(p => p.score >= 0.7);
      if (highConfidence.length > 0) {
        console.log('⭐ High confidence detections:', highConfidence.map(p => `${p.class} (${(p.score * 100).toFixed(1)}%)`));
      }
    } else {
      console.warn('⚠️ No objects detected with confidence >= 40%. Try a clearer video or different angle.');
    }
    
    const formattedPredictions = predictions.map(pred => ({
      class: pred.class,
      label: pred.class,
      confidence: pred.score,
      bbox: pred.bbox,
      
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
    
    img.crossOrigin = 'anonymous'; 
    
    img.onload = () => {
      
      if (img.decode) {
        img.decode()
          .then(() => {
            URL.revokeObjectURL(url);
            resolve(img);
          })
          .catch(err => {
            console.error('Image decode error:', err);
            URL.revokeObjectURL(url);
            resolve(img); 
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
  
  ctx.drawImage(img, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  
  const contrast = 1.2; 
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  
  for (let i = 0; i < data.length; i += 4) {
    data[i] = factor * (data[i] - 128) + 128;   
    data[i + 1] = factor * (data[i + 1] - 128) + 128; 
    data[i + 2] = factor * (data[i + 2] - 128) + 128; 
 
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  return canvas;
}

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
