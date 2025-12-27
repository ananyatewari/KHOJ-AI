import OcrDocument from "../models/OcrDocument.js";
import { performOCR, extractEntities } from "../utils/dualOcrProcessor.js";
import { generateAISummary } from "../services/aiSummary.js";
import { findOrCreateEvent, updateEventTitle } from "../services/eventLinking.js";
import { triggerAlertChecks } from "../utils/alertTriggers.js";
import path from "path";
import fs from "fs";

/**
 * Process a document using OCR and save results
 * @param {Object} file - Uploaded file object from multer
 * @param {Object} userData - User data (userId, agency)
 * @returns {Promise<Object>} Created OCR document
 */
export const processDocument = async (file, userData = {}) => {
  try {
    const startTime = Date.now();
    const filePath = file.path;
    const originalFilename = file.originalname;
    const uploadedBy = userData.userId || "unknown";
    const agency = userData.agency || "N/A";

    // Store the relative path to serve the image later
    const relativePath = `/uploads/${path.basename(filePath)}`;

    // Create document with processing status
    const newOcrDoc = new OcrDocument({
      originalImage: relativePath,
      filename: originalFilename,
      agency,
      uploadedBy,
      status: "processing"
    });

    await newOcrDoc.save();

    // Perform OCR on the uploaded image
    const ocrResult = await performOCR(filePath);

    // Extract entities with bounding boxes
    const entities = extractEntities(ocrResult);

    // Generate AI summary to enrich entities
    let aiSummary = null;
    try {
      aiSummary = await generateAISummary({
        documents: [
          {
            text: ocrResult.text,
            entities
          }
        ]
      });
    } catch (aiErr) {
      console.warn(
        `AI summary generation failed for ${originalFilename}:`,
        aiErr.message
      );
    }

    const mergedEntities = mergeAiEntityInsights(entities, aiSummary);

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Update document with OCR results
    newOcrDoc.text = ocrResult.text;
    newOcrDoc.entities = mergedEntities;
    newOcrDoc.aiSummary = aiSummary;
    newOcrDoc.processingTime = processingTime;
    newOcrDoc.status = "completed";

    await newOcrDoc.save();

    try {
      const { event, isNew } = await findOrCreateEvent(newOcrDoc, "OcrDocument");
      if (event) {
        if (isNew) {
          await updateEventTitle(event._id);
        }
        console.log(`OCR document linked to event: ${event._id} (${isNew ? 'new' : 'existing'} event with ${event.documents.length} document(s))`);
      } else {
        console.log(`OCR document ${newOcrDoc._id}: No related documents found. Event will be created when a matching document is uploaded.`);
      }
    } catch (eventErr) {
      console.error("Event linking failed for OCR document:", eventErr);
    }

    try {
      await triggerAlertChecks(newOcrDoc, "OcrDocument", null);
    } catch (alertErr) {
      console.error("Alert checks failed for OCR document:", alertErr);
    }

    return newOcrDoc;
  } catch (error) {
    console.error("OCR processing error:", error);
    throw error;
  }
};

function mergeAiEntityInsights(baseEntities = {}, aiSummary) {
  if (!aiSummary?.entityInsights) {
    return baseEntities;
  }

  const categories = ["persons", "places", "organizations"];
  const merged = { ...baseEntities };

  categories.forEach((category) => {
    const aiEntities = aiSummary.entityInsights[category] || [];
    if (!Array.isArray(aiEntities) || !aiEntities.length) return;

    merged[category] = merged[category] || [];

    const existingTexts = new Set(
      merged[category]
        .map((entry) => entry?.text?.toLowerCase())
        .filter(Boolean)
    );

    aiEntities.forEach((text) => {
      const normalized = text?.toLowerCase();
      if (!normalized || existingTexts.has(normalized)) return;

      merged[category].push({
        text,
        confidence: 0.92,
        source: "ai",
        boundingBox: null
      });
      existingTexts.add(normalized);
    });
  });

  return merged;
}

/**
 * Get OCR document by ID
 * @param {String} id - Document ID 
 * @returns {Promise<Object>} OCR document
 */
export const getOcrDocumentById = async (id) => {
  try {
    const doc = await OcrDocument.findById(id);
    if (!doc) {
      throw new Error('OCR document not found');
    }
    return doc;
  } catch (error) {
    console.error('Error fetching OCR document:', error);
    throw error;
  }
};

/**
 * Get list of OCR documents
 * @param {Object} filter - Filter criteria
 * @returns {Promise<Array>} List of OCR documents
 */
export const getOcrDocuments = async (filter = {}) => {
  try {
    return await OcrDocument.find(filter).sort({ createdAt: -1 });
  } catch (error) {
    console.error('Error fetching OCR documents:', error);
    throw error;
  }
};

/**
 * Delete an OCR document
 * @param {String} id - Document ID
 * @returns {Promise<Object>} Deletion result
 */
export const deleteOcrDocument = async (id) => {
  try {
    const doc = await OcrDocument.findById(id);
    if (!doc) {
      throw new Error('OCR document not found');
    }
    
    // Delete the file if it exists
    if (doc.originalImage) {
      const filePath = path.join(process.cwd(), doc.originalImage);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    
    return await OcrDocument.deleteOne({ _id: id });
  } catch (error) {
    console.error('Error deleting OCR document:', error);
    throw error;
  }
};