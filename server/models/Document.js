import mongoose from "mongoose";

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

export default mongoose.model("Document", DocumentSchema);
