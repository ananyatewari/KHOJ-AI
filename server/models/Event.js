import mongoose from "mongoose";

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  
  description: String,
  
  status: {
    type: String,
    enum: ["active", "monitoring", "resolved", "archived"],
    default: "active"
  },
  
  documents: [{
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'documents.documentType'
    },
    documentType: {
      type: String,
      enum: ["Document", "OcrDocument", "Transcription"]
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    relevanceScore: {
      type: Number,
      default: 0.5
    }
  }],
  
  linkedEntities: {
    persons: [{
      text: String,
      frequency: { type: Number, default: 1 },
      sources: [String]
    }],
    places: [{
      text: String,
      frequency: { type: Number, default: 1 },
      sources: [String]
    }],
    organizations: [{
      text: String,
      frequency: { type: Number, default: 1 },
      sources: [String]
    }],
    phoneNumbers: [{
      text: String,
      frequency: { type: Number, default: 1 },
      sources: [String]
    }],
    dates: [{
      text: String,
      frequency: { type: Number, default: 1 },
      sources: [String]
    }]
  },
  
  severityScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  confidenceScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 1
  },
  
  timeline: {
    firstSeen: Date,
    lastUpdated: Date,
    keyDates: [{
      date: Date,
      description: String,
      documentId: mongoose.Schema.Types.ObjectId
    }]
  },
  
  agencies: [String],
  
  visibility: {
    type: [String],
    default: []
  },
  
  metadata: {
    totalDocuments: { type: Number, default: 0 },
    uniqueEntities: { type: Number, default: 0 },
    crossAgencyFlag: { type: Boolean, default: false }
  }
}, { timestamps: true });

EventSchema.index({ status: 1, createdAt: -1 });
EventSchema.index({ agencies: 1, status: 1 });
EventSchema.index({ severityScore: -1 });
EventSchema.index({ "timeline.lastUpdated": -1 });

export default mongoose.model("Event", EventSchema);
