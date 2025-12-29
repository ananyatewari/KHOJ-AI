import mongoose from "mongoose";

const CriminalRecordSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  
  aliases: [String],
  
  hasRecord: {
    type: Boolean,
    default: false
  },
  
  courtCases: [{
    caseNumber: String,
    charges: [String],
    court: String,
    state: String,
    filedDate: Date,
    status: {
      type: String,
      enum: ['Trial Ongoing', 'Under Investigation', 'Pending', 'Convicted', 'Acquitted', 'Closed', 'Unknown']
    },
    verdict: String,
    nextHearing: Date,
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low']
    },
    description: String,
    amountInvolved: String
  }],
  
  riskLevel: {
    type: String,
    enum: ['none', 'low', 'medium', 'high', 'critical'],
    default: 'none'
  },
  
  activeWarrants: {
    type: Boolean,
    default: false
  },
  
  convictionCount: {
    type: Number,
    default: 0
  },
  
  lastKnownLocation: String,
  
  associatedOrganizations: [String],
  
  relatedDocuments: [{
    documentId: mongoose.Schema.Types.ObjectId,
    documentType: {
      type: String,
      enum: ['Document', 'OcrDocument', 'Transcription']
    },
    detectedAt: Date
  }],
  
  source: {
    type: String,
    default: 'crimecheck.in'
  },
  
  lastChecked: {
    type: Date,
    default: Date.now
  },
  
  checkCount: {
    type: Number,
    default: 1
  },
  
  metadata: {
    dob: Date,
    photoUrl: String,
    fingerprints: String,
    additionalInfo: mongoose.Schema.Types.Mixed
  }
}, { 
  timestamps: true 
});

CriminalRecordSchema.index({ name: 1, hasRecord: 1 });
CriminalRecordSchema.index({ riskLevel: 1, hasRecord: 1 });
CriminalRecordSchema.index({ lastChecked: -1 });
CriminalRecordSchema.index({ 'courtCases.status': 1 });

CriminalRecordSchema.methods.incrementCheckCount = function() {
  this.checkCount += 1;
  this.lastChecked = new Date();
  return this.save();
};

CriminalRecordSchema.methods.addRelatedDocument = function(documentId, documentType) {
  const exists = this.relatedDocuments.some(
    doc => doc.documentId.toString() === documentId.toString()
  );
  
  if (!exists) {
    this.relatedDocuments.push({
      documentId,
      documentType,
      detectedAt: new Date()
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

export default mongoose.model("CriminalRecord", CriminalRecordSchema);
