import mongoose from "mongoose";

const IngestionLogSchema = new mongoose.Schema({
  documentId: mongoose.Schema.Types.ObjectId,
  stage: String,
  status: String
}, { timestamps: true });

export default mongoose.model("IngestionLog", IngestionLogSchema);
