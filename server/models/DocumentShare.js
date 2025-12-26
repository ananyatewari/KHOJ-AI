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
  // For 'specific-agencies' scope, list which agencies can see it
  visibleToAgencies: [String],
  // Approval workflow
  approvalStatus: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  },
  approvedBy: String, // admin username
  approvedAt: Date,
  
  sharedAt: { type: Date, default: Date.now },
  expiresAt: Date, // optional: expiry for time-limited shares
  
  createdAt: { type: Date, default: Date.now }
});

DocumentShareSchema.index({ documentId: 1, scope: 1 });
DocumentShareSchema.index({ approvalStatus: 1, scope: 1 });
DocumentShareSchema.index({ uploadedByAgency: 1, approvalStatus: 1 });

export default mongoose.model("DocumentShare", DocumentShareSchema);
