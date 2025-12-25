import mongoose from "mongoose";

const PromptTemplateSchema = new mongoose.Schema({
  agency: { type: String, required: true },
  template: { type: String, required: true },
  isDefault: { type: Boolean, default: false }
});

export default mongoose.model("PromptTemplate", PromptTemplateSchema);
