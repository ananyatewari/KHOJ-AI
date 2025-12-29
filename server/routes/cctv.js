import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import CCTVVideo from "../models/CCTVVideo.js";
import CCTVMetadata from "../models/CCTVMetadata.js";
import VideoProcessor from "../services/videoProcessor.js";
import ObjectDetectionService from "../services/objectDetection.js";
import FaceDetectionService from "../services/faceDetection.js";
import { emitLog } from "../utils/logger.js";
import { extractTextFromFile, isValidMetadataFile } from "../services/textExtractor.js";
import { extractEntities } from "../utils/nlp.js";
import { extractEntitiesAI } from "../services/aiEntities.js";
import { generateAISummary } from "../services/aiSummary.js";
import { extractVideoMetadata, analyzeVideoMetadata } from "../services/videoMetadataExtractor.js";
import { extractVideoIntelligence } from "../services/videoIntelligenceExtractor.js";

const router = express.Router();
const videoProcessor = new VideoProcessor();
const objectDetection = new ObjectDetectionService();
const faceDetection = new FaceDetectionService();

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
    fileSize: 100 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv'];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid video format. Allowed formats: MP4, AVI, MOV, MKV'), false);
    }
    cb(null, true);
  }
});

const metadataStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'metadata');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'metadata-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const metadataUpload = multer({
  storage: metadataStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 
  },
  fileFilter: (req, file, cb) => {
    if (!isValidMetadataFile(file.mimetype)) {
      return cb(new Error('Invalid file format. Allowed formats: PDF, TXT, DOC, DOCX'), false);
    }
    cb(null, true);
  }
});

router.post("/metadata/upload", metadataUpload.single("file"), async (req, res) => {
  const io = req.app.get("io");
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    await emitLog(io, {
      level: "INFO",
      message: `CCTV metadata file received – ${req.file.originalname}`,
      user: req.body.uploadedBy,
      agency: req.body.agency
    });

    const metadata = new CCTVMetadata({
      filename: req.file.filename,
      originalName: req.file.originalname,
      agency: req.body.agency,
      uploadedBy: req.body.uploadedBy,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      processingStatus: "processing",
      visibility: [req.body.agency],
      cameraInfo: {
        cameraId: req.body.cameraId || "",
        location: req.body.location || "",
        coordinates: {
          latitude: parseFloat(req.body.latitude) || 0,
          longitude: parseFloat(req.body.longitude) || 0
        }
      }
    });

    await metadata.save();

    processMetadataAsync(metadata._id, req.file.path, req.file.mimetype, io);

    res.status(200).json({
      message: "Metadata file uploaded successfully. Processing...",
      metadataId: metadata._id,
      status: "processing"
    });

  } catch (error) {
    console.error('Error uploading metadata file:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/metadata", async (req, res) => {
  try {
    if (!req.user || !req.user.agency) {
      return res.status(401).json({ 
        error: "Authentication required"
      });
    }

    const { page = 1, limit = 10, status } = req.query;
    const filter = {
      $or: [
        { agency: req.user.agency },
        { visibility: req.user.agency }
      ]
    };

    if (status) {
      filter.processingStatus = status;
    }

    const metadataFiles = await CCTVMetadata.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1);

    const total = await CCTVMetadata.countDocuments(filter);

    res.json({
      metadata: metadataFiles,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/metadata/:metadataId", async (req, res) => {
  try {
    const metadata = await CCTVMetadata.findById(req.params.metadataId);
    
    if (!metadata) {
      return res.status(404).json({ error: "Metadata not found" });
    }

    if (!metadata.visibility.includes(req.user.agency) && metadata.agency !== req.user.agency) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(metadata);

  } catch (error) {
    console.error('Error fetching metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/:videoId/metadata", async (req, res) => {
  try {
    const { metadata } = req.body;
    const video = await CCTVVideo.findById(req.params.videoId);
    
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    await CCTVVideo.findByIdAndUpdate(req.params.videoId, {
      videoMetadata: {
        duration: metadata.duration || 0,
        width: metadata.width || 0,
        height: metadata.height || 0,
        fps: metadata.fps || 0,
        format: metadata.format || 'mp4',
        size: metadata.size || 0,
        codec: metadata.codec || 'unknown',
        quality: metadata.quality || 'unknown',
        comprehensive: {
          basic: metadata,
          browserExtracted: true
        }
      }
    });

    res.json({ success: true, message: "Metadata saved successfully" });
  } catch (error) {
    console.error('Error saving video metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/metadata/:metadataId/download", async (req, res) => {
  try {
    const metadata = await CCTVMetadata.findById(req.params.metadataId);
    
    if (!metadata) {
      return res.status(404).json({ error: "Metadata not found" });
    }

    if (!metadata.visibility.includes(req.user.agency) && metadata.agency !== req.user.agency) {
      return res.status(403).json({ error: "Access denied" });
    }

    const report = generateMetadataReport(metadata);
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${metadata.originalName}_analysis.txt"`);
    res.send(report);

  } catch (error) {
    console.error('Error downloading metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

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

    await cctvVideo.save();

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

router.get("/:videoId", async (req, res) => {
  try {
    const video = await CCTVVideo.findById(req.params.videoId);
    
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    if (!video.visibility.includes(req.user.agency) && video.agency !== req.user.agency) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(video);

  } catch (error) {
    console.error('Error fetching video:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
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

router.get("/:videoId/detections", async (req, res) => {
  try {
    const video = await CCTVVideo.findById(req.params.videoId);
    
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

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

router.delete("/:videoId", async (req, res) => {
  try {
    const video = await CCTVVideo.findById(req.params.videoId);
    
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    if (video.agency !== req.user.agency) {
      return res.status(403).json({ error: "Access denied" });
    }

    if (fs.existsSync(video.filePath)) {
      fs.unlinkSync(video.filePath);
    }

    if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
      fs.unlinkSync(video.thumbnailPath);
    }

    await videoProcessor.cleanup(video._id.toString());

    await CCTVVideo.findByIdAndDelete(req.params.videoId);

    res.json({ message: "Video deleted successfully" });

  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: error.message });
  }
});

async function processVideoAsync(videoId, videoPath, io) {
  try {
    const startTime = Date.now();
    
    await CCTVVideo.findByIdAndUpdate(videoId, {
      processingStatus: 'processing',
      'processingLogs': [{
        step: 'processing_started',
        status: 'started',
        message: 'Video processing started',
        timestamp: new Date()
      }]
    });

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

    const allDetections = [];
    const allFaceDetections = [];
    
    for (let i = 0; i < framesInfo.frameFiles.length; i++) {
      const frameFile = framesInfo.frameFiles[i];
      const framePath = path.join(framesInfo.framesDir, frameFile);
      const frameNumber = i + 1;
      const timestamp = videoProcessor.calculateFrameTimestamp(frameNumber, frameInterval);
      
      try {
        const frameBuffer = await videoProcessor.getFrameBuffer(framePath);
        
        const detection = await objectDetection.detectObjects(frameBuffer, frameNumber, timestamp);
        allDetections.push(detection);
        
        const faceDetectionResult = await faceDetection.detectFaces(frameBuffer, frameNumber, timestamp);
        allFaceDetections.push(faceDetectionResult);
        
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

    const summary = objectDetection.calculateSummary(allDetections);
    const faceSummary = faceDetection.calculateFaceSummary(allFaceDetections);
    
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

    io.emit('cctv:processing_completed', {
      videoId,
      summary,
      agency: (await CCTVVideo.findById(videoId)).agency
    });

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


router.get('/:videoId/detections', async (req, res) => {
  try {
    const video = await CCTVVideo.findById(req.params.videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

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

router.post('/:videoId/detections', async (req, res) => {
  try {
    const { detections } = req.body;
    const video = await CCTVVideo.findById(req.params.videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (!detections || !Array.isArray(detections) || detections.length === 0) {
      console.error('No detections provided');
      return res.status(400).json({ 
        error: 'No detections provided. Please check Roboflow API configuration.' 
      });
    }

    console.log(`Saving ${detections.length} detection frames for video ${req.params.videoId}`);

    let maxPersonsInFrame = 0;
    let maxVehiclesInFrame = 0;
    let maxWeaponsInFrame = 0;
    let totalPersonsAcrossFrames = 0;
    let totalVehiclesAcrossFrames = 0;
    let totalWeaponsAcrossFrames = 0;
    let framesWithDetections = 0;
    let highConfidenceDetections = 0;
    let totalDetections = 0;

    detections.forEach(frame => {
      if (frame.objects && Array.isArray(frame.objects)) {
        let personsInThisFrame = 0;
        let vehiclesInThisFrame = 0;
        let weaponsInThisFrame = 0;
        
        frame.objects.forEach(obj => {
          const label = obj.class || obj.label || '';
          const confidence = obj.confidence || 0;

          totalDetections++;

          if (confidence > 0.7) {
            highConfidenceDetections++;
          }

          if (label.toLowerCase().includes('person') || label.toLowerCase().includes('people')) {
            personsInThisFrame++;
          }

          else if (label.toLowerCase().includes('car') || 
                   label.toLowerCase().includes('truck') || 
                   label.toLowerCase().includes('vehicle') ||
                   label.toLowerCase().includes('bus') ||
                   label.toLowerCase().includes('motorcycle') ||
                   label.toLowerCase().includes('bike')) {
            vehiclesInThisFrame++;
          }
          else if (label.toLowerCase().includes('weapon') || 
                   label.toLowerCase().includes('gun') || 
                   label.toLowerCase().includes('knife')) {
            weaponsInThisFrame++;
          }
        });
        
        if (frame.objects.length > 0) {
          framesWithDetections++;
        }
        maxPersonsInFrame = Math.max(maxPersonsInFrame, personsInThisFrame);
        maxVehiclesInFrame = Math.max(maxVehiclesInFrame, vehiclesInThisFrame);
        maxWeaponsInFrame = Math.max(maxWeaponsInFrame, weaponsInThisFrame);
        totalPersonsAcrossFrames += personsInThisFrame;
        totalVehiclesAcrossFrames += vehiclesInThisFrame;
        totalWeaponsAcrossFrames += weaponsInThisFrame;
      }
    });
    
    const avgPersonsPerFrame = framesWithDetections > 0 ? Math.round(totalPersonsAcrossFrames / framesWithDetections) : 0;
    const avgVehiclesPerFrame = framesWithDetections > 0 ? Math.round(totalVehiclesAcrossFrames / framesWithDetections) : 0;

    if (totalDetections === 0) {
      console.warn(`No objects detected in any frames for video ${req.params.videoId}`);
      video.processingStatus = 'completed';
      video.objectDetections = detections;
      video.detectionSummary = {
        totalPersons: 0,
        totalVehicles: 0,
        totalWeapons: 0,
        uniqueFaces: 0,
        highConfidenceDetections: 0,
        suspiciousActivity: false,
        riskScore: 0
      };
      video.processedAt = new Date();
      await video.save();
      
      return res.json({ 
        success: true,
        warning: 'No objects detected in video. This may indicate Roboflow API issues or empty frames.',
        summary: video.detectionSummary
      });
    }

    console.log('Extracting intelligence from detections...');
    const intelligence = await extractVideoIntelligence({
      detections,
      cameraInfo: video.cameraInfo,
      videoMetadata: video.videoMetadata,
      originalName: video.originalName
    });

    await CCTVVideo.findByIdAndUpdate(req.params.videoId, {
      objectDetections: detections,
      detectionSummary: {
        totalPersons: maxPersonsInFrame,
        totalVehicles: maxVehiclesInFrame,
        totalWeapons: maxWeaponsInFrame,
        highConfidenceDetections,
        suspiciousActivity: maxWeaponsInFrame > 0 || maxPersonsInFrame > 20,
        riskScore: calculateRiskScore(maxPersonsInFrame, maxVehiclesInFrame, maxWeaponsInFrame)
      },
      intelligence: intelligence || {},
      processingStatus: 'completed'
    });

    console.log('Detection summary:', {
      totalPersons: maxPersonsInFrame,
      totalVehicles: maxVehiclesInFrame,
      totalWeapons: maxWeaponsInFrame,
      totalDetections,
      highConfidenceDetections,
      framesWithDetections,
      riskScore: calculateRiskScore(maxPersonsInFrame, maxVehiclesInFrame, maxWeaponsInFrame),
      intelligenceExtracted: !!intelligence
    });

    res.json({ 
      success: true, 
      message: 'Detections saved and intelligence extracted successfully',
      summary: {
        totalPersons: maxPersonsInFrame,
        totalVehicles: maxVehiclesInFrame,
        totalWeapons: maxWeaponsInFrame,
        totalDetections,
        highConfidenceDetections,
        framesProcessed: detections.length
      },
      intelligence: intelligence ? {
        threatLevel: intelligence.threatLevel,
        incidentType: intelligence.incidentType,
        summary: intelligence.summary
      } : null
    });
  } catch (error) {
    console.error('Error saving detections:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

async function processMetadataAsync(metadataId, filePath, mimetype, io) {
  try {
    const startTime = Date.now();
    
    const text = await extractTextFromFile(filePath, mimetype);
    
    if (!text || text.length < 50) {
      throw new Error("Could not extract meaningful text from file");
    }

    await CCTVMetadata.findByIdAndUpdate(metadataId, {
      textContent: text
    });

    const ruleEntities = extractEntities(text);

    let aiEntities = null;
    try {
      aiEntities = await extractEntitiesAI(text);
    } catch (e) {
      console.error("AI entity extraction failed:", e.message);
    }

    const entities = aiEntities || ruleEntities;

    const normalizedEntities = {
      persons: Array.isArray(entities.persons) 
        ? entities.persons.map(p => typeof p === 'string' ? { text: p, count: 1 } : p)
        : [],
      places: Array.isArray(entities.places)
        ? entities.places.map(p => typeof p === 'string' ? { text: p, count: 1 } : p)
        : [],
      organizations: Array.isArray(entities.organizations)
        ? entities.organizations.map(o => typeof o === 'string' ? { text: o, count: 1 } : o)
        : [],
      dates: entities.dates || [],
      phones: entities.phones || [],
      emails: entities.emails || []
    };

    let aiAnalysis = null;
    try {
      aiAnalysis = await generateAISummary({
        documents: [{ text, entities }]
      });
    } catch (e) {
      console.error("AI summary generation failed:", e.message);
    }

    await CCTVMetadata.findByIdAndUpdate(metadataId, {
      entities: normalizedEntities,
      aiAnalysis: aiAnalysis,
      processingStatus: 'completed',
      processedAt: new Date()
    });

    const metadata = await CCTVMetadata.findById(metadataId);

    io.emit('cctv:metadata_completed', {
      metadataId,
      agency: metadata.agency
    });

    await emitLog(io, {
      level: "INFO",
      message: `CCTV metadata processing completed – ${metadata.originalName}`,
      user: metadata.uploadedBy,
      agency: metadata.agency
    });

  } catch (error) {
    console.error('Error processing metadata:', error);
    
    await CCTVMetadata.findByIdAndUpdate(metadataId, {
      processingStatus: 'failed'
    });

    io.emit('cctv:metadata_failed', {
      metadataId,
      error: error.message
    });
  }
}

function generateMetadataReport(metadata) {
  let report = `CCTV METADATA ANALYSIS REPORT\n`;
  report += `${'='.repeat(80)}\n\n`;
  
  report += `File: ${metadata.originalName}\n`;
  report += `Agency: ${metadata.agency}\n`;
  report += `Uploaded By: ${metadata.uploadedBy}\n`;
  report += `Date: ${metadata.createdAt.toLocaleString()}\n`;
  
  if (metadata.cameraInfo?.location) {
    report += `Camera Location: ${metadata.cameraInfo.location}\n`;
  }
  if (metadata.cameraInfo?.cameraId) {
    report += `Camera ID: ${metadata.cameraInfo.cameraId}\n`;
  }
  
  report += `\n${'='.repeat(80)}\n\n`;
  
  if (metadata.aiAnalysis) {
    report += `EXECUTIVE SUMMARY\n`;
    report += `${'-'.repeat(80)}\n`;
    report += `${metadata.aiAnalysis.executiveSummary || 'N/A'}\n\n`;
    
    if (metadata.aiAnalysis.keyFindings?.length > 0) {
      report += `KEY FINDINGS\n`;
      report += `${'-'.repeat(80)}\n`;
      metadata.aiAnalysis.keyFindings.forEach((finding, idx) => {
        report += `${idx + 1}. ${finding}\n`;
      });
      report += `\n`;
    }
    
    if (metadata.aiAnalysis.analystTakeaways?.length > 0) {
      report += `ANALYST TAKEAWAYS\n`;
      report += `${'-'.repeat(80)}\n`;
      metadata.aiAnalysis.analystTakeaways.forEach((takeaway, idx) => {
        report += `${idx + 1}. ${takeaway}\n`;
      });
      report += `\n`;
    }
    
    if (metadata.aiAnalysis.nextSteps?.length > 0) {
      report += `NEXT STEPS\n`;
      report += `${'-'.repeat(80)}\n`;
      metadata.aiAnalysis.nextSteps.forEach((step, idx) => {
        report += `${idx + 1}. ${step}\n`;
      });
      report += `\n`;
    }
  }
  
  if (metadata.entities) {
    report += `EXTRACTED ENTITIES\n`;
    report += `${'-'.repeat(80)}\n`;
    
    if (metadata.entities.persons?.length > 0) {
      report += `\nPersons:\n`;
      metadata.entities.persons.forEach(person => {
        const name = typeof person === 'string' ? person : person.text;
        report += `  - ${name}\n`;
      });
    }
    
    if (metadata.entities.places?.length > 0) {
      report += `\nPlaces:\n`;
      metadata.entities.places.forEach(place => {
        const name = typeof place === 'string' ? place : place.text;
        report += `  - ${name}\n`;
      });
    }
    
    if (metadata.entities.organizations?.length > 0) {
      report += `\nOrganizations:\n`;
      metadata.entities.organizations.forEach(org => {
        const name = typeof org === 'string' ? org : org.text;
        report += `  - ${name}\n`;
      });
    }
    
    if (metadata.entities.phones?.length > 0) {
      report += `\nPhone Numbers:\n`;
      metadata.entities.phones.forEach(phone => {
        report += `  - ${phone}\n`;
      });
    }
    
    if (metadata.entities.emails?.length > 0) {
      report += `\nEmail Addresses:\n`;
      metadata.entities.emails.forEach(email => {
        report += `  - ${email}\n`;
      });
    }
    
    report += `\n`;
  }
  
  report += `\n${'='.repeat(80)}\n`;
  report += `End of Report\n`;
  
  return report;
}

async function extractVideoMetadataAsync(videoId, videoPath, io) {
  try {
    await emitLog(io, {
      level: "INFO",
      message: "Extracting video metadata...",
      user: "system",
      agency: "system"
    });

    const metadata = await extractVideoMetadata(videoPath);
    
    const analysis = analyzeVideoMetadata(metadata);

    await CCTVVideo.findByIdAndUpdate(videoId, {
      videoMetadata: {
        duration: metadata.basic.duration,
        width: metadata.video?.width || 0,
        height: metadata.video?.height || 0,
        fps: metadata.video?.fps || 0,
        format: metadata.basic.format,
        size: metadata.basic.size,
        codec: metadata.video?.codec || 'unknown',
        bitrate: metadata.basic.bitrate,
        quality: metadata.derived.quality,
        comprehensive: {
          ...metadata,
          analysis
        }
      }
    });

    const video = await CCTVVideo.findById(videoId);

    io.emit('cctv:metadata_extracted', {
      videoId,
      metadata: metadata.derived,
      analysis,
      agency: video.agency
    });

    await emitLog(io, {
      level: "INFO",
      message: `Video metadata extracted: ${metadata.derived.resolution}, ${metadata.derived.quality} quality, ${analysis.suitability.rating} for CCTV analysis`,
      user: "system",
      agency: video.agency
    });

  } catch (error) {
    console.error('Error extracting video metadata:', error);
    
    if (error.message.includes('Cannot find ffprobe') || error.message.includes('ffmpeg')) {
      console.log('FFmpeg not found, using basic metadata extraction...');
      
      try {
        const fs = await import('fs');
        const stats = fs.statSync(videoPath);
        
        await CCTVVideo.findByIdAndUpdate(videoId, {
          videoMetadata: {
            size: stats.size,
            format: 'mp4',
            quality: 'unknown',
            comprehensive: {
              basic: {
                size: stats.size,
                format: 'mp4'
              },
              ffmpegNotInstalled: true,
              message: 'FFmpeg not installed. Install FFmpeg for comprehensive metadata extraction.'
            }
          }
        });

        const video = await CCTVVideo.findById(videoId);

        io.emit('cctv:metadata_extracted', {
          videoId,
          ffmpegNotInstalled: true,
          agency: video.agency
        });

        await emitLog(io, {
          level: "WARNING",
          message: `Video uploaded but FFmpeg not installed. Install FFmpeg for comprehensive metadata extraction.`,
          user: "system",
          agency: video.agency
        });
      } catch (fallbackError) {
        console.error('Fallback metadata extraction failed:', fallbackError);
      }
    } else {
      await emitLog(io, {
        level: "ERROR",
        message: `Failed to extract video metadata: ${error.message}`,
        user: "system",
        agency: "system"
      });
    }
  }
}

function calculateRiskScore(persons, vehicles, weapons) {
  let score = 0;
  
  if (weapons > 0) {
    score += 50;
  }
  
  if (persons > 20) {
    score += 30;
  } else if (persons > 10) {
    score += 20;
  } else if (persons > 5) {
    score += 10;
  }
  
  if (vehicles > 10) {
    score += 20;
  } else if (vehicles > 5) {
    score += 10;
  }
  
  return Math.min(score, 100);
}

export default router;
