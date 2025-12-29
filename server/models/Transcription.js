import mongoose from "mongoose";
import { createRealTimeAlert } from "../utils/alertCreator.js";

const TranscriptionSchema = new mongoose.Schema({
  filename: String,
  originalAudio: String, 
  transcript: String, 
  agency: String,
  uploadedBy: String,

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

  processingTime: Number,
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  },

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

  visibility: {
    type: [String],
    default: []
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

TranscriptionSchema.post('save', async function(doc) {
  if (doc.isNew && doc.status === 'completed') {
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
