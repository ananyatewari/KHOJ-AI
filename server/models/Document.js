import mongoose from "mongoose";
import { createRealTimeAlert } from "../utils/alertCreator.js";

const DocumentSchema = new mongoose.Schema({
  filename: String,
  text: String,
  agency: String,
  uploadedBy: String,
  fileType: {
    type: String,
    default: "pdf"
  },

  entities: {
    persons: [String],
    places: [String],
    dates: [String],
    organizations: [String],
    phoneNumbers: [String]
  },

  aiSummary: {
    executiveSummary: String,
    keyFindings: [String],
    entityInsights: {
      persons: [String],
      places: [String],
      organizations: [String]
    },
    analystTakeaways: [String]
  },

  embedding: {
    type: [Number],
    default: []
  },

  chunks: [String],
  chunkEmbeddings: [[Number]],


  visibility: {
    type: [String],
    default: []
  },

  indexed: { type: Boolean, default: false },
  sharedWithChatbot: { type: Boolean, default: false },
  approvedForCrossAgency: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

DocumentSchema.index({ visibility: 1, createdAt: 1 });
DocumentSchema.index({ agency: 1, createdAt: 1 });

// Post-save hook to trigger real-time alerts
DocumentSchema.post('save', async function(doc) {
  // Only trigger on new document creation
  if (doc.isNew) {
    // Create Alert document in MongoDB
    await createRealTimeAlert({
      type: "new_document",
      severity: "medium",
      title: `New Document Uploaded: ${doc.filename}`,
      description: `${doc.filename} has been uploaded by ${doc.uploadedBy}`,
      agencies: [doc.agency],
      details: {
        documentIds: [{
          id: doc._id,
          type: "Document"
        }],
        metadata: {
          filename: doc.filename,
          uploadedBy: doc.uploadedBy,
          fileType: doc.fileType
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
        fileType: doc.fileType,
        entities: doc.entities,
        timestamp: doc.createdAt,
        type: 'document'
      });
      
      // Send agency-specific notification
      io.emit(`agency:${doc.agency}:document`, {
        type: 'new_document',
        documentId: doc._id,
        filename: doc.filename,
        uploadedBy: doc.uploadedBy,
        timestamp: doc.createdAt
      });
    }
  }
});

export default mongoose.model("Document", DocumentSchema);
