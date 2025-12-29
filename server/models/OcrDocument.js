import mongoose from "mongoose";
import { createRealTimeAlert } from "../utils/alertCreator.js";

const OcrDocumentSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: false
  },
  
  filename: String,
  originalImage: String, 
  text: String,
  agency: String,
  uploadedBy: String,
  
  entities: {
    persons: [{
      text: String,
      confidence: Number,
      source: {
        type: String,
        default: "ocr"
      },
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      }
    }],
    places: [{
      text: String,
      confidence: Number,
      source: {
        type: String,
        default: "ocr"
      },
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      }
    }],
    dates: [{
      text: String,
      confidence: Number,
      source: {
        type: String,
        default: "ocr"
      },
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      }
    }],
    organizations: [{
      text: String,
      confidence: Number,
      source: {
        type: String,
        default: "ocr"
      },
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      }
    }],
    phoneNumbers: [{
      text: String,
      confidence: Number,
      source: {
        type: String,
        default: "ocr"
      },
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
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
    keyFindings: [String],
    entityInsights: {
      persons: [String],
      places: [String],
      organizations: [String]
    },
    analystTakeaways: [String]
  },
  
  createdAt: { type: Date, default: Date.now }
});

OcrDocumentSchema.post('save', async function(doc) {
  if (doc.isNew && doc.status === 'completed') {
    await createRealTimeAlert({
      type: "new_ocr_document",
      severity: "medium",
      title: `OCR Document Processed: ${doc.filename}`,
      description: `OCR processing completed for ${doc.filename} uploaded by ${doc.uploadedBy}`,
      agencies: [doc.agency],
      details: {
        documentIds: [{
          id: doc._id,
          type: "OcrDocument"
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
        type: 'ocr_document'
      });
      
      io.emit(`agency:${doc.agency}:document`, {
        type: 'new_ocr_document',
        documentId: doc._id,
        filename: doc.filename,
        uploadedBy: doc.uploadedBy,
        timestamp: doc.createdAt
      });
    }
  }
});

export default mongoose.model("OcrDocument", OcrDocumentSchema);