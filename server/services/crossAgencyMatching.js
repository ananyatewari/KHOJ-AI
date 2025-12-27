import Event from "../models/Event.js";
import Document from "../models/Document.js";
import OcrDocument from "../models/OcrDocument.js";
import Transcription from "../models/Transcription.js";

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
  let matchedEntities = [];
  
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
    
    intersection.forEach(entity => {
      matchedEntities.push({ category, text: entity });
    });
  }
  
  return {
    score: totalEntities > 0 ? totalMatches / totalEntities : 0,
    matchedEntities,
    totalMatches
  };
}

export async function findSimilarCrossAgencyEvents(eventId, userAgency) {
  try {
    const sourceEvent = await Event.findById(eventId);
    if (!sourceEvent) {
      throw new Error("Event not found");
    }
    
    console.log(`[Cross-Agency Search] User agency: ${userAgency}`);
    console.log(`[Cross-Agency Search] Source event agencies:`, sourceEvent.agencies);
    
    const crossAgencyEvents = await Event.find({
      _id: { $ne: eventId },
      agencies: { $nin: [userAgency] },
      status: { $in: ["active", "monitoring", "resolved"] }
    }).limit(100);
    
    console.log(`[Cross-Agency Search] Found ${crossAgencyEvents.length} events from other agencies`);
    crossAgencyEvents.slice(0, 5).forEach(e => {
      console.log(`  - Event: ${e.title}, Agencies: ${e.agencies.join(', ')}`);
    });
    
    const matches = [];
    
    for (const targetEvent of crossAgencyEvents) {
      let matchScore = 0;
      let matchDetails = {
        entityOverlap: 0,
        semanticSimilarity: 0,
        temporalProximity: 0,
        matchedEntities: []
      };
      
      const entityMatch = calculateEntityOverlap(
        sourceEvent.linkedEntities,
        targetEvent.linkedEntities
      );
      matchDetails.entityOverlap = entityMatch.score;
      matchDetails.matchedEntities = entityMatch.matchedEntities;
      matchScore += entityMatch.score * 0.6;
      
      const timeDiff = Math.abs(
        new Date(sourceEvent.timeline.lastUpdated) - 
        new Date(targetEvent.timeline.lastUpdated)
      );
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
      if (daysDiff <= 7) {
        const temporalScore = 1 - (daysDiff / 7);
        matchDetails.temporalProximity = temporalScore;
        matchScore += temporalScore * 0.2;
      }
      
      const sourceDocIds = sourceEvent.documents.map(d => d.documentId);
      const targetDocIds = targetEvent.documents.map(d => d.documentId);
      
      const sourceDocs = await Document.find({ 
        _id: { $in: sourceDocIds },
        embedding: { $exists: true, $ne: [] }
      }).limit(3);
      
      const targetDocs = await Document.find({ 
        _id: { $in: targetDocIds },
        embedding: { $exists: true, $ne: [] }
      }).limit(3);
      
      let maxSimilarity = 0;
      for (const sourceDoc of sourceDocs) {
        for (const targetDoc of targetDocs) {
          if (sourceDoc.embedding && targetDoc.embedding) {
            const similarity = cosineSimilarity(
              sourceDoc.embedding,
              targetDoc.embedding
            );
            maxSimilarity = Math.max(maxSimilarity, similarity);
          }
        }
      }
      
      matchDetails.semanticSimilarity = maxSimilarity;
      matchScore += maxSimilarity * 0.2;
      
      if (matchScore >= 0.15) {
        matches.push({
          event: targetEvent,
          matchScore,
          matchDetails
        });
      }
    }
    
    console.log(`[Cross-Agency Search] Found ${matches.length} matches above threshold (0.15)`);
    matches.slice(0, 3).forEach(m => {
      console.log(`  - Match: ${m.event.title} (${Math.round(m.matchScore * 100)}%)`);
      console.log(`    Entity: ${Math.round(m.matchDetails.entityOverlap * 100)}%, Semantic: ${Math.round(m.matchDetails.semanticSimilarity * 100)}%, Temporal: ${Math.round(m.matchDetails.temporalProximity * 100)}%`);
    });
    
    matches.sort((a, b) => b.matchScore - a.matchScore);
    
    return matches.slice(0, 10);
  } catch (error) {
    console.error("Error finding cross-agency matches:", error);
    throw error;
  }
}

export async function findSimilarEventsForDocument(documentId, documentType, userAgency) {
  try {
    let document;
    
    switch (documentType) {
      case "Document":
        document = await Document.findById(documentId);
        break;
      case "OcrDocument":
        document = await OcrDocument.findById(documentId);
        break;
      case "Transcription":
        document = await Transcription.findById(documentId);
        break;
      default:
        throw new Error("Invalid document type");
    }
    
    if (!document) {
      throw new Error("Document not found");
    }
    
    const crossAgencyEvents = await Event.find({
      agencies: { $nin: [userAgency] },
      status: { $in: ["active", "monitoring", "resolved"] }
    }).limit(100);
    
    const matches = [];
    
    for (const event of crossAgencyEvents) {
      let matchScore = 0;
      let matchDetails = {
        entityOverlap: 0,
        semanticSimilarity: 0,
        matchedEntities: []
      };
      
      const entityMatch = calculateEntityOverlap(
        document.entities || {},
        event.linkedEntities
      );
      matchDetails.entityOverlap = entityMatch.score;
      matchDetails.matchedEntities = entityMatch.matchedEntities;
      matchScore += entityMatch.score * 0.6;
      
      if (document.embedding && document.embedding.length > 0) {
        const eventDocIds = event.documents.map(d => d.documentId);
        const eventDocs = await Document.find({ 
          _id: { $in: eventDocIds },
          embedding: { $exists: true, $ne: [] }
        }).limit(3);
        
        let maxSimilarity = 0;
        for (const eventDoc of eventDocs) {
          if (eventDoc.embedding) {
            const similarity = cosineSimilarity(
              document.embedding,
              eventDoc.embedding
            );
            maxSimilarity = Math.max(maxSimilarity, similarity);
          }
        }
        
        matchDetails.semanticSimilarity = maxSimilarity;
        matchScore += maxSimilarity * 0.4;
      }
      
      if (matchScore >= 0.25) {
        matches.push({
          event,
          matchScore,
          matchDetails
        });
      }
    }
    
    matches.sort((a, b) => b.matchScore - a.matchScore);
    
    return matches.slice(0, 10);
  } catch (error) {
    console.error("Error finding similar events for document:", error);
    throw error;
  }
}
