import mongoose from "mongoose";
import { createRealTimeAlert } from "../utils/alertCreator.js";

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

// Post-save hook to trigger real-time alerts
TranscriptionSchema.post('save', async function(doc) {
  // Only trigger on new document creation and when status is completed
  if (doc.isNew && doc.status === 'completed') {
    // Create Alert document in MongoDB
    await createRealTimeAlert({
      type: "new_transcription",
      severity: "medium",
      title: `Transcription Completed: ${doc.filename}`,
      description: `Transcription processing completed for ${doc.filename} uploaded by ${doc.uploadedBy}`,
      agencies: [doc.agency],
      details: {
        documentIds: [{
          id: doc._id,
          type: "Transcription"
        }],
        metadata: {
          filename: doc.filename,
          uploadedBy: doc.uploadedBy,
          processingTime: doc.processingTime
        }
      }
    });
    
    // Emit WebSocket event for real-time notification
    const io = global.io;
    if (io) {
      io.emit('document:created', {
        documentId: doc._id,
        filename: doc.filename,
        agency: doc.agency,
        uploadedBy: doc.uploadedBy,
        entities: doc.entities,
        processingTime: doc.processingTime,
        timestamp: doc.createdAt,
        type: 'transcription'
      });
      
      // Send agency-specific notification
      io.emit(`agency:${doc.agency}:document`, {
        type: 'new_transcription',
        documentId: doc._id,
        filename: doc.filename,
        uploadedBy: doc.uploadedBy,
        timestamp: doc.createdAt
      });
    }
  }
});

export default mongoose.model('Transcription', TranscriptionSchema);
