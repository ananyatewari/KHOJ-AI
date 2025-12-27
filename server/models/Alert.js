import mongoose from "mongoose";

const AlertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["entity_match", "geo_spike", "risk_profile", "cross_agency", "custom", "event_created", "document_created", "new_document", "new_ocr_document", "new_transcription"],
    required: true
  },
  
  severity: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "medium"
  },
  
  title: {
    type: String,
    required: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  details: {
    entityName: String,
    entityType: String,
    matchCount: Number,
    agencies: [String],
    locations: [String],
    documentIds: [{
      id: mongoose.Schema.Types.ObjectId,
      type: {
        type: String,
        enum: ["Document", "OcrDocument", "Transcription"]
      }
    }],
    riskScore: Number,
    geoFence: {
      location: String,
      incidentCount: Number,
      timeWindow: String
    },
    metadata: mongoose.Schema.Types.Mixed
  },
  
  relatedEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Event"
  },
  
  status: {
    type: String,
    enum: ["unread", "read", "acknowledged", "resolved", "dismissed"],
    default: "unread"
  },
  
  agencies: {
    type: [String],
    default: []
  },
  
  notifiedAgencies: [{
    agency: String,
    notifiedAt: Date,
    method: {
      type: String,
      enum: ["email", "sms", "internal"]
    },
    status: {
      type: String,
      enum: ["pending", "sent", "failed"]
    }
  }],
  
  triggeredBy: {
    type: String,
    default: "AI"
  },
  
  actionTaken: {
    type: String,
    default: ""
  },
  
  readBy: [{
    userId: mongoose.Schema.Types.ObjectId,
    readAt: Date
  }],
  
  acknowledgedBy: {
    userId: mongoose.Schema.Types.ObjectId,
    acknowledgedAt: Date
  },
  
  expiresAt: Date
}, { timestamps: true });

AlertSchema.index({ status: 1, createdAt: -1 });
AlertSchema.index({ agencies: 1, status: 1 });
AlertSchema.index({ severity: 1, createdAt: -1 });
AlertSchema.index({ type: 1, status: 1 });
AlertSchema.index({ expiresAt: 1 });

export default mongoose.model("Alert", AlertSchema);
