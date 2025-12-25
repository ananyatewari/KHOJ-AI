import mongoose from "mongoose";

const DocumentSchema = new mongoose.Schema({
  filename: String,
  text: String,
  agency: String,
  uploadedBy: String,

  entities: {
    persons: [String],
    places: [String],
    dates: [String],
    organizations: [String],
    phoneNumbers: [String]
  },

  embedding: {
  type: [Number],
  default: []
},

  indexed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});


export default mongoose.model("Document", DocumentSchema);
