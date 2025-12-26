import mongoose from "mongoose";

const TranscriptionSchema = new mongoose.Schema({
  // Basic transcription info
  filename: String,
  originalAudio: String, // URL/path to the original uploaded audio file
  transcript: String, // Full transcription text from Whisper
  agency: String,
  uploadedBy: String,

  // Extracted entities from the transcript
  entities: {
    persons: [{
      text: String,
      confidence: Number,
      source: {
        type: String,
        default: "nlp"
      }
    }],
    places: [{
      text: String,
      confidence: Number,
      source: {
        type: String,
        default: "nlp"
      }
    }],
    dates: [{
      text: String,
      confidence: Number,
      source: {
        type: String,
        default: "nlp"
      }
    }],
    organizations: [{
      text: String,
      confidence: Number,
      source: {
        type: String,
        default: "nlp"
      }
    }],
    phoneNumbers: [{
      text: String,
      confidence: Number,
      source: {
        type: String,
        default: "nlp"
      }
    }]
  },

  // Processing metadata
  processingTime: Number,
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },

  // AI-generated summary and analysis
  aiSummary: {
    executiveSummary: String,
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

  // Visibility and sharing
  visibility: {
    type: [String],
    default: []
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Transcription', TranscriptionSchema);
