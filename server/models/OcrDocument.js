import mongoose from "mongoose";

const OcrDocumentSchema = new mongoose.Schema({
  // Original document reference (for linking to existing document system)
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: false
  },
  
  // Basic document info
  filename: String,
  originalImage: String, // URL to the original uploaded image/document
  text: String,
  agency: String,
  uploadedBy: String,
  
  // OCR extracted entities with bounding boxes
  entities: {
    persons: [{
      text: String,
      confidence: Number,
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
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
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
  
  // Timestamps
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("OcrDocument", OcrDocumentSchema);