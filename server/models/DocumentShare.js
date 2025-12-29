import mongoose from "mongoose";

const DocumentShareSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Document",
    required: true
  },
  uploadedBy: String,
  uploadedByAgency: String,
  scope: {
    type: String,
    enum: ["agency", "cross-agency", "specific-agencies"],
    default: "agency"
  },
  visibleToAgencies: [String],
  approvalStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  approvedBy: String, 
  approvedAt: Date,
  
  sharedAt: { type: Date, default: Date.now },
  expiresAt: Date, 
  
  createdAt: { type: Date, default: Date.now }
});

DocumentShareSchema.index({ documentId: 1, scope: 1 });
DocumentShareSchema.index({ approvalStatus: 1, scope: 1 });
DocumentShareSchema.index({ uploadedByAgency: 1, approvalStatus: 1 });

export default mongoose.model("DocumentShare", DocumentShareSchema);
