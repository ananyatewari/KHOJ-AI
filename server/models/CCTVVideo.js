import mongoose from "mongoose";

const CCTVVideoSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  
  originalName: {
    type: String,
    required: true
  },
  
  agency: {
    type: String,
    required: true
  },
  
  uploadedBy: {
    type: String,
    required: true
  },
  
  // Video metadata
  videoMetadata: {
    duration: Number,        // in seconds
    width: Number,
    height: Number,
    fps: Number,
    format: String,
    size: Number,            // in bytes
    codec: String,
    bitrate: Number,
    quality: String,         // excellent, good, fair, poor
    // Comprehensive metadata including GPS, camera info, analysis
    comprehensive: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
  // Camera information
  cameraInfo: {
    cameraId: String,
    location: {
      type: String,
      default: ""
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    installationDate: Date,
    cameraType: {
      type: String,
      enum: ["fixed", "ptz", "mobile", "bodycam"],
      default: "fixed"
    }
  },
  
  // Processing status
  processingStatus: {
    type: String,
    enum: ["uploaded", "processing", "completed", "failed"],
    default: "uploaded"
  },
  
  // Frame extraction info
  frameExtraction: {
    totalFrames: Number,
    extractedFrames: Number,
    frameInterval: Number,    // seconds between frames
    extractionCompleted: {
      type: Boolean,
      default: false
    }
  },
  
  // Object detection results
  objectDetections: [{
    frameNumber: Number,
    timestamp: Number,        // seconds from start
    objects: [{
      label: String,          // "person", "car", "truck", "weapon", etc.
      confidence: Number,     // 0-1
      boundingBox: {
        x: Number,            // normalized 0-1
        y: Number,
        width: Number,
        height: Number
      },
      attributes: {
        color: String,
        size: String,
        direction: String
      }
    }]
  }],
  
  // Face detection results
  faceDetections: [{
    frameNumber: Number,
    timestamp: Number,
    faces: [{
      confidence: Number,
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      },
      faceId: String,         // for tracking same face across frames
      embeddings: [Number],   // facial embeddings for recognition
      matchedPerson: String,  // if matched against database
      matchConfidence: Number
    }]
  }],
  
  // Summary statistics
  detectionSummary: {
    totalPersons: Number,
    totalVehicles: Number,
    totalWeapons: Number,
    uniqueFaces: Number,
    highConfidenceDetections: Number,
    suspiciousActivity: {
      type: Boolean,
      default: false
    },
    riskScore: {
      type: Number,
      default: 0
    }
  },

  // AI-extracted intelligence for inter-agency coordination
  intelligence: {
    threatLevel: {
      type: String,
      enum: ['high', 'medium', 'low', 'none'],
      default: 'none'
    },
    incidentType: String,
    summary: String,
    keyFindings: [String],
    entitiesDetected: {
      persons: [String],
      vehicles: [String],
      objects: [String],
      locations: [String]
    },
    temporalAnalysis: {
      peakActivity: String,
      patterns: [String],
      anomalies: [String]
    },
    riskIndicators: [String],
    agencyAlerts: [{
      agency: String,
      reason: String,
      priority: {
        type: String,
        enum: ['high', 'medium', 'low']
      }
    }],
    recommendations: [String],
    crossReferenceOpportunities: [String],
    analysisTimestamp: Date,
    detectionStats: mongoose.Schema.Types.Mixed
  },
  
  // Visibility and sharing
  visibility: {
    type: [String],
    default: []
  },
  
  // Processing logs
  processingLogs: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    step: String,
    status: String,
    message: String,
    duration: Number
  }],
  
  // File paths
  filePath: String,
  thumbnailPath: String,
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  processedAt: Date
});

// Indexes for efficient queries
CCTVVideoSchema.index({ agency: 1, createdAt: -1 });
CCTVVideoSchema.index({ processingStatus: 1 });
CCTVVideoSchema.index({ "cameraInfo.location": 1 });
CCTVVideoSchema.index({ "detectionSummary.suspiciousActivity": 1 });
CCTVVideoSchema.index({ "detectionSummary.riskScore": -1 });

// Post-save hook to trigger alerts
CCTVVideoSchema.post('save', async function(doc) {
  if (doc.isNew && doc.processingStatus === 'completed') {
    // Trigger alert if suspicious activity detected
    if (doc.detectionSummary.suspiciousActivity || doc.detectionSummary.riskScore > 50) {
      const { createRealTimeAlert } = await import("../utils/alertCreator.js");
      
      await createRealTimeAlert({
        type: "risk_profile",
        severity: doc.detectionSummary.riskScore > 70 ? "critical" : "high",
        title: `Suspicious Activity Detected: ${doc.originalName}`,
        description: `CCTV analysis detected suspicious activity with risk score ${doc.detectionSummary.riskScore}`,
        agencies: [doc.agency],
        details: {
          documentIds: [{
            id: doc._id,
            type: "CCTVVideo"
          }],
          riskScore: doc.detectionSummary.riskScore,
          suspiciousActivity: doc.detectionSummary.suspiciousActivity,
          metadata: {
            filename: doc.originalName,
            cameraLocation: doc.cameraInfo.location,
            totalDetections: doc.detectionSummary.totalPersons + doc.detectionSummary.totalVehicles
          }
        }
      });
    }
  }
});

export default mongoose.model("CCTVVideo", CCTVVideoSchema);
