import mongoose from "mongoose";

const SocialMediaPostSchema = new mongoose.Schema({
  postId: {
    type: String,
    required: true,
    unique: true
  },
  
  platform: {
    type: String,
    enum: ["twitter", "facebook", "instagram", "reddit", "youtube", "linkedin", "other"],
    required: true
  },
  
  author: {
    username: String,
    displayName: String,
    followersCount: Number,
    verified: Boolean,
    profileImageUrl: String
  },
  
  content: {
    text: {
      type: String,
      required: true
    },
    imageUrl: String,
    videoUrl: String,
    hashtags: [String],
    mentions: [String],
    urls: [String]
  },
  
  metadata: {
    likes: Number,
    shares: Number,
    comments: Number,
    views: Number,
    location: {
      name: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    language: String,
    createdAt: Date,
    updatedAt: Date
  },
  
  analysis: {
    isCrimeRelated: {
      type: Boolean,
      default: false
    },
    crimeType: {
      type: String,
      enum: ["theft", "assault", "burglary", "vandalism", "fraud", "drugs", "violence", "suspicious_activity", "other"]
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium"
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    keywords: [String],
    sentiment: {
      type: String,
      enum: ["positive", "negative", "neutral"],
      default: "neutral"
    },
    entities: [{
      text: String,
      type: String,
      confidence: Number
    }]
  },
  
  relatedEvent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SocialMediaEvent"
  },
  
  status: {
    type: String,
    enum: ["pending", "processed", "flagged", "dismissed"],
    default: "pending"
  },
  
  processedAt: Date,
  
  source: {
    type: String,
    default: "external_api"
  }
}, { timestamps: true });

SocialMediaPostSchema.index({ "analysis.isCrimeRelated": 1, createdAt: -1 });
SocialMediaPostSchema.index({ platform: 1, "metadata.createdAt": -1 });
SocialMediaPostSchema.index({ "analysis.severity": 1, createdAt: -1 });
SocialMediaPostSchema.index({ postId: 1 }, { unique: true });
SocialMediaPostSchema.index({ relatedEvent: 1 });

export default mongoose.model("SocialMediaPost", SocialMediaPostSchema);
