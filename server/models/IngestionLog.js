import mongoose from "mongoose";

const IngestionLogSchema = new mongoose.Schema({
  documentId: mongoose.Schema.Types.ObjectId,
  level: {
    type: String,
    enum: ["INFO", "SUCCESS", "WARNING", "ERROR"],
    default: "INFO"
  },
  message: String,
  user: String,
  agency: String
}, { timestamps: true });

export default mongoose.model("IngestionLog", IngestionLogSchema);
