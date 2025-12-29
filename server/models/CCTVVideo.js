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
  
  videoMetadata: {
    duration: Number,        
    width: Number,
    height: Number,
    fps: Number,
    format: String,
    size: Number,            
    codec: String,
    bitrate: Number,
    quality: String,         
    comprehensive: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  
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
  
  processingStatus: {
    type: String,
    enum: ["uploaded", "processing", "completed", "failed"],
    default: "uploaded"
  },
  
  frameExtraction: {
    totalFrames: Number,
    extractedFrames: Number,
    frameInterval: Number,    
    extractionCompleted: {
      type: Boolean,
      default: false
    }
  },
  
  objectDetections: [{
    frameNumber: Number,
    timestamp: Number,        
    objects: [{
      label: String,          
      confidence: Number,     
      boundingBox: {
        x: Number,            
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
      faceId: String,         
      embeddings: [Number],   
      matchedPerson: String,  
      matchConfidence: Number
    }]
  }],
  
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
  
  visibility: {
    type: [String],
    default: []
  },
  
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

CCTVVideoSchema.index({ agency: 1, createdAt: -1 });
CCTVVideoSchema.index({ processingStatus: 1 });
CCTVVideoSchema.index({ "cameraInfo.location": 1 });
CCTVVideoSchema.index({ "detectionSummary.suspiciousActivity": 1 });
CCTVVideoSchema.index({ "detectionSummary.riskScore": -1 });

CCTVVideoSchema.post('save', async function(doc) {
  if (doc.isNew && doc.processingStatus === 'completed') {
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
