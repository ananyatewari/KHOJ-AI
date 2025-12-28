import mongoose from "mongoose";

const CCTVMetadataSchema = new mongoose.Schema({
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
  
  // Associated CCTV video (optional)
  cctvVideoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CCTVVideo'
  },
  
  // Extracted text content
  textContent: {
    type: String,
    default: ""
  },
  
  // AI-extracted entities
  entities: {
    persons: [{
      text: String,
      count: { type: Number, default: 1 }
    }],
    places: [{
      text: String,
      count: { type: Number, default: 1 }
    }],
    organizations: [{
      text: String,
      count: { type: Number, default: 1 }
    }],
    dates: [String],
    phones: [String],
    emails: [String]
  },
  
  // AI-generated summary and analysis
  aiAnalysis: {
    executiveSummary: String,
    keyFindings: [String],
    entityInsights: {
      persons: [String],
      places: [String],
      organizations: [String]
    },
    analystTakeaways: [String],
    keyDiscussionPoints: [String],
    decisionsMade: [String],
    actionItems: [{
      item: String,
      assignee: String,
      dueDate: String
    }],
    nextSteps: [String],
    importantDeadlines: [String],
    takeaways: [String]
  },
  
  // Camera/location context
  cameraInfo: {
    cameraId: String,
    location: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Processing status
  processingStatus: {
    type: String,
    enum: ["uploaded", "processing", "completed", "failed"],
    default: "uploaded"
  },
  
  // Visibility and sharing
  visibility: {
    type: [String],
    default: []
  },
  
  // File info
  filePath: String,
  fileType: String,
  fileSize: Number,
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  processedAt: Date
});

// Indexes for efficient queries
CCTVMetadataSchema.index({ agency: 1, createdAt: -1 });
CCTVMetadataSchema.index({ cctvVideoId: 1 });
CCTVMetadataSchema.index({ processingStatus: 1 });
CCTVMetadataSchema.index({ "entities.persons.text": 1 });
CCTVMetadataSchema.index({ "entities.places.text": 1 });

export default mongoose.model("CCTVMetadata", CCTVMetadataSchema);
