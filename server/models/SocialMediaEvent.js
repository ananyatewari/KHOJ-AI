import mongoose from "mongoose";

const SocialMediaEventSchema = new mongoose.Schema({
  eventId: {
    type: String,
    required: true,
    unique: true
  },
  
  title: {
    type: String,
    required: true
  },
  
  description: {
    type: String,
    required: true
  },
  
  eventType: {
    type: String,
    enum: ["crime_spike", "emerging_threat", "verified_incident", "suspicious_pattern", "community_alert"],
    required: true
  },
  
  location: {
    name: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    radius: Number // in meters
  },
  
  severity: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    required: true
  },
  
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "SocialMediaPost"
  }],
  
  aggregatedMetrics: {
    totalPosts: Number,
    uniqueAuthors: Number,
    totalReach: Number, // sum of followers/views
    avgSentiment: {
      type: String,
      enum: ["positive", "negative", "neutral"]
    },
    timeSpan: {
      start: Date,
      end: Date
    }
  },
  
  keywords: [String],
  
  entities: [{
    text: String,
    type: String,
    count: Number,
    confidence: Number
  }],
  
  trendingHashtags: [{
    tag: String,
    count: Number,
    growth: Number // percentage growth
  }],
  
  status: {
    type: String,
    enum: ["active", "monitoring", "resolved", "false_positive"],
    default: "active"
  },
  
  alerts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Alert"
  }],
  
  agencies: [{
    type: String,
    required: true
  }],
  
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  source: {
    type: String,
    default: "ai_detection"
  }
}, { timestamps: true });

SocialMediaEventSchema.index({ status: 1, createdAt: -1 });
SocialMediaEventSchema.index({ severity: 1, createdAt: -1 });
SocialMediaEventSchema.index({ "location.coordinates": "2dsphere" });
SocialMediaEventSchema.index({ eventType: 1, status: 1 });
SocialMediaEventSchema.index({ eventId: 1 }, { unique: true });

export default mongoose.model("SocialMediaEvent", SocialMediaEventSchema);
