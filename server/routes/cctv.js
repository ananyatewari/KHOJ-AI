import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import CCTVVideo from "../models/CCTVVideo.js";
import VideoProcessor from "../services/videoProcessor.js";
import ObjectDetectionService from "../services/objectDetection.js";
import FaceDetectionService from "../services/faceDetection.js";
import { emitLog } from "../utils/logger.js";

const router = express.Router();
const videoProcessor = new VideoProcessor();
const objectDetection = new ObjectDetectionService();
const faceDetection = new FaceDetectionService();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'videos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid video format. Allowed formats: MP4, AVI, MOV, MKV'), false);
    }
    cb(null, true);
  }
});

/**
 * Upload and process CCTV video
 */
router.post("/upload", upload.single("video"), async (req, res) => {
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("File:", req.file);
    const io = req.app.get("io");
  
  await emitLog(io, {
    level: "INFO",
    message: `CCTV video received – ${req.file.originalname}`,
    user: req.body.uploadedBy,
    agency: req.body.agency
  });

  try {
    if (!req.file) {
      console.error("No video uploaded");
      return res.status(400).json({ error: "No video uploaded" });
    }

    // Create CCTV video record
    const cctvVideo = new CCTVVideo({
      filename: req.file.filename,
      originalName: req.file.originalname,
      agency: req.body.agency,
      uploadedBy: req.body.uploadedBy,
      filePath: req.file.path,
      cameraInfo: {
        cameraId: req.body.cameraId || "",
        location: req.body.cameraLocation || "",
        coordinates: {
          latitude: parseFloat(req.body.latitude) || 0,
          longitude: parseFloat(req.body.longitude) || 0
        }
      },
      visibility: [req.body.agency]
    });

    // Save initial record
    await cctvVideo.save();

    // Skip ffmpeg-based processing since we're using browser-based extraction
    // processVideoAsync(cctvVideo._id, req.file.path, io);

    res.status(200).json({
      message: "Video uploaded successfully. Ready for frame extraction.",
      videoId: cctvVideo._id,
      status: "uploaded"
    });

  } catch (error) {
    console.error('Error uploading video:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get CCTV video by ID
 */
router.get("/:videoId", async (req, res) => {
  try {
    const video = await CCTVVideo.findById(req.params.videoId);
    
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Check visibility permissions
    if (!video.visibility.includes(req.user.agency) && video.agency !== req.user.agency) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(video);

  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all CCTV videos for agency
 */
router.get("/", async (req, res) => {
  try {
    // Check if user is authenticated and has an agency
    if (!req.user || !req.user.agency) {
      console.error('Authentication error - Missing user or agency:', {
        hasUser: !!req.user,
        userAgency: req.user?.agency
      });
      return res.status(401).json({ 
        error: "Authentication required",
        details: "User must be logged in and belong to an agency"
      });
    }

    const { page = 1, limit = 10, status, location } = req.query;
    const filter = {
      $or: [
        { agency: req.user.agency },
        { visibility: req.user.agency }
      ]
    };

    if (status) {
      filter.processingStatus = status;
    }

    if (location) {
      filter['cameraInfo.location'] = { $regex: location, $options: 'i' };
    }

    const videos = await CCTVVideo.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await CCTVVideo.countDocuments(filter);

    res.json({
      videos,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get detection results for a video
 */
router.get("/:videoId/detections", async (req, res) => {
  try {
    const video = await CCTVVideo.findById(req.params.videoId);
    
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Check visibility permissions
    if (!video.visibility.includes(req.user.agency) && video.agency !== req.user.agency) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({
      objectDetections: video.objectDetections,
      faceDetections: video.faceDetections,
      detectionSummary: video.detectionSummary
    });

  } catch (error) {
    console.error('Error fetching detections:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update video status
 */
router.patch("/:videoId/status", async (req, res) => {
  try {
    const { status } = req.body;
    
    const video = await CCTVVideo.findByIdAndUpdate(
      req.params.videoId,
      { processingStatus: status },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    res.json(video);

  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete video and associated files
 */
router.delete("/:videoId", async (req, res) => {
  try {
    const video = await CCTVVideo.findById(req.params.videoId);
    
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    // Check permissions
    if (video.agency !== req.user.agency) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Delete files
    if (fs.existsSync(video.filePath)) {
      fs.unlinkSync(video.filePath);
    }

    if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
      fs.unlinkSync(video.thumbnailPath);
    }

    // Clean up frames
    await videoProcessor.cleanup(video._id.toString());

    // Delete database record
    await CCTVVideo.findByIdAndDelete(req.params.videoId);

    res.json({ message: "Video deleted successfully" });

  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Async video processing function
 */
async function processVideoAsync(videoId, videoPath, io) {
  try {
    const startTime = Date.now();
    
    // Update status to processing
    await CCTVVideo.findByIdAndUpdate(videoId, {
      processingStatus: 'processing',
      'processingLogs': [{
        step: 'processing_started',
        status: 'started',
        message: 'Video processing started',
        timestamp: new Date()
      }]
    });

    // Extract metadata
    const metadata = await videoProcessor.extractMetadata(videoPath);
    
    await CCTVVideo.findByIdAndUpdate(videoId, {
      videoMetadata: metadata,
      'processingLogs': [{
        step: 'metadata_extracted',
        status: 'completed',
        message: `Metadata extracted: ${metadata.duration}s, ${metadata.width}x${metadata.height}`,
        timestamp: new Date(),
        duration: Date.now() - startTime
      }]
    });

    // Generate thumbnail
    const thumbnailPath = await videoProcessor.generateThumbnail(videoPath, videoId);
    
    await CCTVVideo.findByIdAndUpdate(videoId, {
      thumbnailPath: thumbnailPath,
      'processingLogs': [{
        step: 'thumbnail_generated',
        status: 'completed',
        message: 'Thumbnail generated',
        timestamp: new Date()
      }]
    });

    // Extract frames
    const frameInterval = Math.max(1, Math.floor(metadata.duration / 50)); // Max 50 frames
    const framesInfo = await videoProcessor.extractFrames(videoPath, videoId, frameInterval);
    
    await CCTVVideo.findByIdAndUpdate(videoId, {
      frameExtraction: {
        totalFrames: Math.floor(metadata.duration * metadata.fps),
        extractedFrames: framesInfo.totalFrames,
        frameInterval: frameInterval,
        extractionCompleted: true
      },
      'processingLogs': [{
        step: 'frames_extracted',
        status: 'completed',
        message: `Extracted ${framesInfo.totalFrames} frames`,
        timestamp: new Date()
      }]
    });

    // Process frames for object detection
    const allDetections = [];
    const allFaceDetections = [];
    
    for (let i = 0; i < framesInfo.frameFiles.length; i++) {
      const frameFile = framesInfo.frameFiles[i];
      const framePath = path.join(framesInfo.framesDir, frameFile);
      const frameNumber = i + 1;
      const timestamp = videoProcessor.calculateFrameTimestamp(frameNumber, frameInterval);
      
      try {
        const frameBuffer = await videoProcessor.getFrameBuffer(framePath);
        
        // Object detection
        const detection = await objectDetection.detectObjects(frameBuffer, frameNumber, timestamp);
        allDetections.push(detection);
        
        // Face detection
        const faceDetectionResult = await faceDetection.detectFaces(frameBuffer, frameNumber, timestamp);
        allFaceDetections.push(faceDetectionResult);
        
        // Update progress
        if (i % 10 === 0) {
          await CCTVVideo.findByIdAndUpdate(videoId, {
            'processingLogs': [{
              step: 'detection_progress',
              status: 'progress',
              message: `Processed ${i + 1}/${framesInfo.frameFiles.length} frames`,
              timestamp: new Date()
            }]
          });
        }
      } catch (error) {
        console.error(`Error processing frame ${frameNumber}:`, error);
      }
    }

    // Calculate summary
    const summary = objectDetection.calculateSummary(allDetections);
    const faceSummary = faceDetection.calculateFaceSummary(allFaceDetections);
    
    // Update video with detection results
    await CCTVVideo.findByIdAndUpdate(videoId, {
      objectDetections: allDetections,
      faceDetections: allFaceDetections,
      detectionSummary: {
        ...summary,
        uniqueFaces: faceSummary.uniqueFaces,
        recognizedFaces: faceSummary.recognizedFaces,
        unknownFaces: faceSummary.unknownFaces
      },
      processingStatus: 'completed',
      processedAt: new Date(),
      'processingLogs': [{
        step: 'processing_completed',
        status: 'completed',
        message: `Processing completed. Found ${summary.totalPersons} persons, ${summary.totalVehicles} vehicles, ${faceSummary.uniqueFaces} unique faces`,
        timestamp: new Date(),
        duration: Date.now() - startTime
      }]
    });

    // Emit completion event
    io.emit('cctv:processing_completed', {
      videoId,
      summary,
      agency: (await CCTVVideo.findById(videoId)).agency
    });

    // Clean up temporary files
    await videoProcessor.cleanup(videoId);

  } catch (error) {
    console.error('Error processing video:', error);
    
    await CCTVVideo.findByIdAndUpdate(videoId, {
      processingStatus: 'failed',
      'processingLogs': [{
        step: 'processing_failed',
        status: 'failed',
        message: error.message,
        timestamp: new Date()
      }]
    });

    io.emit('cctv:processing_failed', {
      videoId,
      error: error.message
    });
  }
};

/**
 * Get detection results for a video
 */
router.get('/:videoId/detections', async (req, res) => {
  try {
    const video = await CCTVVideo.findById(req.params.videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Check permissions
    if (video.agency !== req.user.agency && !video.visibility.includes(req.user.agency)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      videoId: video._id,
      processingStatus: video.processingStatus,
      objectDetections: video.objectDetections || [],
      faceDetections: video.faceDetections || [],
      detectionSummary: video.detectionSummary || {}
    });
  } catch (error) {
    console.error('Error fetching detections:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Save detection results from Roboflow
 */
router.post('/:videoId/detections', async (req, res) => {
  try {
    const { detections } = req.body;
    const video = await CCTVVideo.findById(req.params.videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Store detections
    video.objectDetections = detections;
    video.processingStatus = 'completed';
    await video.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving detections:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
