import Event from "../models/Event.js";
import Document from "../models/Document.js";
import OcrDocument from "../models/OcrDocument.js";
import Transcription from "../models/Transcription.js";
import { createRealTimeAlert } from "../utils/alertCreator.js";

const ENTITY_MATCH_THRESHOLD = 0.3;
const TEMPORAL_WINDOW_HOURS = 48;
const SEMANTIC_SIMILARITY_THRESHOLD = 0.7;
const HIGH_SEVERITY_KEYWORDS = [
  "murder", "assault", "robbery", "theft", "kidnapping", "fraud", "terrorism",
  "violence", "weapon", "drug", "trafficking", "crime", "suspect", "victim",
  "emergency", "critical", "urgent", "threat", "danger", "attack"
];

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function calculateEntityOverlap(entities1, entities2) {
  const categories = ["persons", "places", "organizations", "phoneNumbers"];
  let totalMatches = 0;
  let totalEntities = 0;
  
  for (const category of categories) {
    const set1 = new Set(
      (entities1[category] || []).map(e => 
        (typeof e === "string" ? e : e.text).toLowerCase().trim()
      )
    );
    const set2 = new Set(
      (entities2[category] || []).map(e => 
        (typeof e === "string" ? e : e.text).toLowerCase().trim()
      )
    );
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    totalMatches += intersection.size;
    totalEntities += Math.max(set1.size, set2.size);
  }
  
  return totalEntities > 0 ? totalMatches / totalEntities : 0;
}

function isTemporallyClose(date1, date2, windowHours = TEMPORAL_WINDOW_HOURS) {
  const diff = Math.abs(new Date(date1) - new Date(date2));
  const hoursDiff = diff / (1000 * 60 * 60);
  return hoursDiff <= windowHours;
}

function calculateSeverityScore(text, entities) {
  let score = 0;
  const lowerText = (text || "").toLowerCase();
  let hasHighSeverityKeyword = false;
  
  HIGH_SEVERITY_KEYWORDS.forEach(keyword => {
    const matches = (lowerText.match(new RegExp(keyword, "gi")) || []).length;
    score += matches * 5;
    if (matches > 0) hasHighSeverityKeyword = true;
  });
  
  const totalEntities = 
    (entities.persons?.length || 0) +
    (entities.places?.length || 0) +
    (entities.organizations?.length || 0) +
    (entities.phoneNumbers?.length || 0);
  
  score += totalEntities * 2;
  
  // Auto-boost to high severity for any high-severity keywords
  if (hasHighSeverityKeyword && score < 40) {
    score = 40; // Ensure minimum "High Priority" classification
  }
  
  return Math.min(score, 100);
}

function mergeEntities(existingEntities, newEntities, documentId) {
  const merged = { ...existingEntities };
  const categories = ["persons", "places", "organizations", "phoneNumbers", "dates"];
  
  for (const category of categories) {
    if (!merged[category]) merged[category] = [];
    
    const newItems = newEntities[category] || [];
    
    newItems.forEach(item => {
      const text = typeof item === "string" ? item : item.text;
      if (!text) return;
      
      const existing = merged[category].find(
        e => e.text.toLowerCase() === text.toLowerCase()
      );
      
      if (existing) {
        existing.frequency += 1;
        if (!existing.sources.includes(documentId.toString())) {
          existing.sources.push(documentId.toString());
        }
      } else {
        merged[category].push({
          text,
          frequency: 1,
          sources: [documentId.toString()]
        });
      }
    });
  }
  
  return merged;
}

function calculateConfidenceScore(event) {
  const docCount = event.documents.length;
  const uniqueEntities = event.metadata.uniqueEntities || 0;
  const crossSourceEntities = Object.values(event.linkedEntities || {})
    .flat()
    .filter(e => e.sources && e.sources.length > 1).length;
  
  let confidence = 0;
  
  if (docCount >= 3) confidence += 0.3;
  else if (docCount === 2) confidence += 0.2;
  else confidence += 0.1;
  
  if (crossSourceEntities >= 3) confidence += 0.4;
  else if (crossSourceEntities >= 2) confidence += 0.3;
  else if (crossSourceEntities >= 1) confidence += 0.2;
  
  if (uniqueEntities >= 5) confidence += 0.3;
  else if (uniqueEntities >= 3) confidence += 0.2;
  else confidence += 0.1;
  
  return Math.min(confidence, 1);
}

async function findRelatedDocuments(document, documentType) {
  const { entities, embedding, createdAt, _id } = document;
  const relatedDocs = [];
  
  const timeWindow = new Date(Date.now() - TEMPORAL_WINDOW_HOURS * 60 * 60 * 1000);
  
  const documents = await Document.find({
    _id: { $ne: _id },
    createdAt: { $gte: timeWindow }
  }).limit(50);
  
  const ocrDocs = await OcrDocument.find({
    _id: { $ne: _id },
    createdAt: { $gte: timeWindow }
  }).limit(50);
  
  const transcriptions = await Transcription.find({
    _id: { $ne: _id },
    createdAt: { $gte: timeWindow }
  }).limit(50);
  
  const allDocs = [
    ...documents.map(d => ({ ...d.toObject(), type: 'Document' })),
    ...ocrDocs.map(d => ({ ...d.toObject(), type: 'OcrDocument' })),
    ...transcriptions.map(d => ({ ...d.toObject(), type: 'Transcription' }))
  ];
  
  for (const doc of allDocs) {
    let matchScore = 0;
    
    const entityOverlap = calculateEntityOverlap(entities, doc.entities || {});
    matchScore += entityOverlap * 0.5;
    
    if (isTemporallyClose(createdAt, doc.createdAt)) {
      matchScore += 0.2;
    }
    
    if (embedding && doc.embedding && doc.embedding.length > 0) {
      const similarity = cosineSimilarity(embedding, doc.embedding);
      if (similarity >= SEMANTIC_SIMILARITY_THRESHOLD) {
        matchScore += 0.3;
      }
    }
    
    if (matchScore >= ENTITY_MATCH_THRESHOLD) {
      relatedDocs.push({
        document: doc,
        documentType: doc.type,
        matchScore
      });
    }
  }
  
  return relatedDocs;
}

export async function findOrCreateEvent(document, documentType = "Document", io = null) {
  const { entities, text, createdAt, agency, embedding } = document;
  
  const recentEvents = await Event.find({
    status: { $in: ["active", "monitoring"] },
    "timeline.lastUpdated": {
      $gte: new Date(Date.now() - TEMPORAL_WINDOW_HOURS * 60 * 60 * 1000)
    }
  }).limit(50);
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const event of recentEvents) {
    let matchScore = 0;
    
    const entityOverlap = calculateEntityOverlap(entities, event.linkedEntities);
    matchScore += entityOverlap * 0.5;
    
    if (isTemporallyClose(createdAt, event.timeline.lastUpdated)) {
      matchScore += 0.2;
    }
    
    if (embedding && event.documents.length > 0) {
      const eventDocIds = event.documents.map(d => d.documentId);
      const eventDocs = await Document.find({ _id: { $in: eventDocIds } }).limit(5);
      
      let maxSimilarity = 0;
      for (const eventDoc of eventDocs) {
        if (eventDoc.embedding && eventDoc.embedding.length > 0) {
          const similarity = cosineSimilarity(embedding, eventDoc.embedding);
          maxSimilarity = Math.max(maxSimilarity, similarity);
        }
      }
      
      if (maxSimilarity >= SEMANTIC_SIMILARITY_THRESHOLD) {
        matchScore += 0.3;
      }
    }
    
    if (matchScore > bestScore && matchScore >= ENTITY_MATCH_THRESHOLD) {
      bestScore = matchScore;
      bestMatch = event;
    }
  }
  
  if (bestMatch) {
    bestMatch.documents.push({
      documentId: document._id,
      documentType,
      addedAt: new Date(),
      relevanceScore: bestScore
    });
    
    bestMatch.linkedEntities = mergeEntities(
      bestMatch.linkedEntities,
      entities,
      document._id
    );
    
    bestMatch.timeline.lastUpdated = new Date();
    if (!bestMatch.timeline.firstSeen) {
      bestMatch.timeline.firstSeen = createdAt;
    }
    
    if (!bestMatch.agencies.includes(agency)) {
      bestMatch.agencies.push(agency);
    }
    
    if (!bestMatch.visibility.includes(agency)) {
      bestMatch.visibility.push(agency);
    }
    
    const allText = text + " " + JSON.stringify(entities);
    const newSeverity = calculateSeverityScore(allText, entities);
    bestMatch.severityScore = Math.max(bestMatch.severityScore, newSeverity);
    
    bestMatch.metadata.totalDocuments = bestMatch.documents.length;
    bestMatch.metadata.uniqueEntities = Object.values(bestMatch.linkedEntities)
      .flat().length;
    bestMatch.metadata.crossAgencyFlag = bestMatch.agencies.length > 1;
    
    bestMatch.confidenceScore = calculateConfidenceScore(bestMatch);
    
    await bestMatch.save();
    
    return { event: bestMatch, isNew: false };
  }
  
  const relatedDocs = await findRelatedDocuments(document, documentType);
  
  if (relatedDocs.length === 0) {
    console.log(`[Event Creation] No related documents found for ${documentType} ${document._id}. Event will be created when a related document is found.`);
    return { event: null, isNew: false };
  }
  
  console.log(`[Event Creation] Found ${relatedDocs.length} related document(s). Creating new event.`);
  
  const severityScore = calculateSeverityScore(text, entities);
  
  const newEvent = await Event.create({
    title: `Event ${new Date().toISOString().split('T')[0]} - ${agency}`,
    description: `Auto-generated event from document ingestion`,
    status: "active",
    documents: [{
      documentId: document._id,
      documentType,
      addedAt: new Date(),
      relevanceScore: 1.0
    }],
    linkedEntities: mergeEntities({}, entities, document._id),
    severityScore,
    confidenceScore: 0.1,
    timeline: {
      firstSeen: createdAt,
      lastUpdated: createdAt,
      keyDates: []
    },
    agencies: [agency],
    visibility: [agency],
    metadata: {
      totalDocuments: 1,
      uniqueEntities: Object.values(entities).flat().length,
      crossAgencyFlag: false,
      relatedDocumentsFound: relatedDocs.length
    }
  });
  
  for (const related of relatedDocs) {
    newEvent.documents.push({
      documentId: related.document._id,
      documentType: related.documentType,
      addedAt: new Date(),
      relevanceScore: related.matchScore
    });
    
    newEvent.linkedEntities = mergeEntities(
      newEvent.linkedEntities,
      related.document.entities || {},
      related.document._id
    );
    
    if (!newEvent.agencies.includes(related.document.agency)) {
      newEvent.agencies.push(related.document.agency);
    }
    
    if (!newEvent.visibility.includes(related.document.agency)) {
      newEvent.visibility.push(related.document.agency);
    }
  }
  
  newEvent.metadata.totalDocuments = newEvent.documents.length;
  newEvent.metadata.uniqueEntities = Object.values(newEvent.linkedEntities).flat().length;
  newEvent.metadata.crossAgencyFlag = newEvent.agencies.length > 1;
  newEvent.confidenceScore = calculateConfidenceScore(newEvent);
  
  await newEvent.save();
  
  // Create alert for new event
  const severityLevel = 
    newEvent.severityScore >= 70 ? "critical" :
    newEvent.severityScore >= 40 ? "high" : "medium";
  
  await createRealTimeAlert({
    type: "event_created",
    severity: severityLevel,
    title: `New Event Created: ${newEvent.title}`,
    description: `A new intelligence event has been created with ${newEvent.documents.length} related documents. Severity score: ${newEvent.severityScore}.`,
    agencies: newEvent.agencies,
    details: {
      eventId: newEvent._id,
      documentCount: newEvent.documents.length,
      severityScore: newEvent.severityScore,
      confidenceScore: newEvent.confidenceScore,
      crossAgency: newEvent.metadata.crossAgencyFlag,
      relatedDocumentId: document._id,
      documentType
    },
    relatedEvent: newEvent._id
  });
  
  // Emit real-time notification for new event creation
  if (io) {
    io.emit("event:created", {
      eventId: newEvent._id,
      title: newEvent.title,
      severityScore: newEvent.severityScore,
      agencies: newEvent.agencies,
      documentType,
      documentId: document._id,
      timestamp: new Date()
    });
    
    // Send agency-specific notifications
    newEvent.agencies.forEach(eventAgency => {
      io.emit(`agency:${eventAgency}:event`, {
        type: "new_event",
        eventId: newEvent._id,
        title: newEvent.title,
        severityScore: newEvent.severityScore,
        documentType,
        timestamp: new Date()
      });
    });
  }
  
  return { event: newEvent, isNew: true };
}

export async function updateEventTitle(eventId) {
  const event = await Event.findById(eventId);
  if (!event) return;
  
  const topEntities = [];
  
  ["persons", "places", "organizations"].forEach(category => {
    const entities = event.linkedEntities[category] || [];
    const sorted = entities.sort((a, b) => b.frequency - a.frequency);
    if (sorted.length > 0) {
      topEntities.push(sorted[0].text);
    }
  });
  
  if (topEntities.length > 0) {
    const severityLabel = 
      event.severityScore >= 70 ? "Critical" :
      event.severityScore >= 40 ? "High Priority" :
      "Active";
    
    event.title = `${severityLabel}: ${topEntities.slice(0, 2).join(", ")}`;
    await event.save();
  }
}
