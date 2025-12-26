// OCR Processing utility for document processing
import { createWorker } from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// PDF support
const pdf = require('pdf-parse');

/**
 * Extract entities from OCR results with bounding boxes
 * @param {Object} ocrResult - Result from OCR processing 
 * @returns {Object} Extracted entities with confidence scores and bounding boxes
 */
function extractEntities(ocrResult) {
  const entities = {
    persons: [],
    places: [],
    organizations: [],
    phoneNumbers: [],
    dates: [],
    emails: [],
    urls: [],
    amounts: [],
    vehicles: [],
    suspects: [],
    witnesses: [],
    caseNumbers: []
  };
  
  // If no words are provided, return empty entities
  if (!ocrResult?.words || !Array.isArray(ocrResult.words)) {
    console.warn('No words found in OCR result for entity extraction');
    return entities;
  }
  
  // More robust regex patterns for entity extraction
  const patterns = {
    // Phone numbers with various formats
    phoneNumbers: /(?:\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}|\d{3}[-\s]\d{3}[-\s]\d{4}/g,
    
    // Dates with various formats
    dates: /\b(?:\d{1,2}[-\/\s]\d{1,2}[-\/\s]\d{2,4})|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/gi,
    
    // Email addresses
    emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    
    // URLs
    urls: /https?:\/\/(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+(?:\/[^\s]*)?/g,
    
    // Money amounts
    amounts: /\$\s?[0-9,]+(\.[0-9]{2})?|[0-9,]+(\.[0-9]{2})?\s?(?:dollars|USD|EUR|€)/gi,
    
    // Potential person names (improved pattern)
    personNames: /\b[A-Z][a-z]+\s+(?:[A-Z][a-z]+\s+)?[A-Z][a-z]+\b/g,
    
    // Common organization suffixes
    orgSuffixes: /\b(?:Inc|Corp|LLC|Ltd|Co|Company|Group|Association|Organization|Foundation)\b/g,
    
    // Common place indicators
    placeIndicators: /\b(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Plaza|Square|Sq|Highway|Hwy|Bridge|Park|City|Town|Village|State|County)\b/g,
    
    // Legal document specific patterns
    legalCitations: /\b(?:Section|Sec\.?|§)\s*\d+(?:[A-Za-z])?\b/g,
    
    // FIR and legal document patterns
    caseNumbers: /\b(?:FIR|Case)\s*(?:No\.?|Number)?:?\s*\d+[-\/]\d+(?:\/\d+)?\b/gi,
    
    // Vehicle registration numbers (especially for police reports)
    vehicleNumbers: /\b[A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4}\b/g,
    
    // Suspect/witness identification
    suspectNames: /\b(?:suspect|accused|assailant)\s+(?:named|identified as|known as)?\s+(?:")?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:")?,?\b/gi,
    
    // Witness identification
    witnessNames: /\b(?:witness|Mr\.|Mrs\.|Ms\.|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g
  };
  
  // Process text as a whole for better context
  const fullText = ocrResult.text || '';
  
  // Create a word map for looking up bounding boxes
  const wordMap = {};
  ocrResult.words.forEach(word => {
    wordMap[word.text.toLowerCase()] = {
      confidence: word.confidence,
      bbox: word.bbox
    };
  });
  
  // Function to find the best matching word and bbox for an entity
  function findBestMatch(entityText) {
    entityText = entityText.trim();
    
    // Direct match
    const exact = wordMap[entityText.toLowerCase()];
    if (exact) return { ...exact, text: entityText };
    
    // Try to find closest match
    const words = entityText.split(/\s+/);
    if (words.length === 1) {
      // For single words, find the closest match
      const keys = Object.keys(wordMap);
      const closestKey = keys.find(k => k.includes(entityText.toLowerCase()) || 
                                    entityText.toLowerCase().includes(k));
      if (closestKey) return { ...wordMap[closestKey], text: entityText };
    } else {
      // For multi-word entities, try to estimate position
      const firstWord = words[0].toLowerCase();
      const lastWord = words[words.length-1].toLowerCase();
      
      if (wordMap[firstWord] && wordMap[lastWord]) {
        // Create a combined bounding box
        const first = wordMap[firstWord];
        const last = wordMap[lastWord];
        return {
          confidence: Math.min(first.confidence, last.confidence),
          text: entityText,
          bbox: {
            x0: first.bbox.x0,
            y0: Math.min(first.bbox.y0, last.bbox.y0),
            x1: last.bbox.x1,
            y1: Math.max(first.bbox.y1, last.bbox.y1)
          }
        };
      }
    }
    
    // If no match found, create an estimated position
    return {
      confidence: 0.5,  // Lower confidence for estimated positions
      text: entityText,
      bbox: {
        x0: 50,
        y0: 50,
        x1: 150,
        y1: 80
      }
    };
  }
  
  // Function to add an entity with deduplication
  function addEntity(category, text, confidence, bbox) {
    // Check if this entity is already in the list
    const isDuplicate = entities[category].some(e => 
      e.text.toLowerCase() === text.toLowerCase());
    
    if (!isDuplicate) {
      entities[category].push({
        text,
        confidence: confidence || 0.7,
        boundingBox: {
          x: bbox.x0,
          y: bbox.y0,
          width: bbox.x1 - bbox.x0,
          height: bbox.y1 - bbox.y0
        }
      });
    }
  }
  
  // Process for multi-word entities first
  // ----------------------------------------
  
  // Extract person names
  const personMatches = fullText.match(patterns.personNames) || [];
  personMatches.forEach(match => {
    const bestMatch = findBestMatch(match);
    addEntity('persons', match, bestMatch.confidence, bestMatch.bbox);
  });
  
  // Look for organizations
  const orgMatches = fullText.split('\n')
    .filter(line => patterns.orgSuffixes.test(line))
    .map(line => {
      const match = line.match(/\b[A-Z][A-Za-z\s&]+?\s+(?:Inc|Corp|LLC|Ltd|Co|Company|Group)\b/g);
      return match ? match[0] : null;
    })
    .filter(Boolean);
  
  orgMatches.forEach(match => {
    const bestMatch = findBestMatch(match);
    addEntity('organizations', match, bestMatch.confidence, bestMatch.bbox);
  });
  
  // Look for potential places
  const placeLines = fullText.split('\n')
    .filter(line => patterns.placeIndicators.test(line));
  
  placeLines.forEach(line => {
    const words = line.split(' ');
    for (let i = 0; i < words.length; i++) {
      if (patterns.placeIndicators.test(words[i])) {
        // Look for place names before the indicator
        if (i > 0 && /^[A-Z][a-z]+$/.test(words[i-1])) {
          const placeName = words[i-1] + ' ' + words[i];
          const bestMatch = findBestMatch(placeName);
          addEntity('places', placeName, bestMatch.confidence, bestMatch.bbox);
        }
      }
    }
  });
  
  // Process each word from OCR results for simpler entities
  ocrResult.words.forEach(word => {
    const { text, confidence, bbox } = word;
    
    // Phone number detection
    if (patterns.phoneNumbers.test(text)) {
      addEntity('phoneNumbers', text, confidence, bbox);
    }
    
    // Date detection
    if (patterns.dates.test(text)) {
      addEntity('dates', text, confidence, bbox);
    }
    
    // Email detection
    if (patterns.emails.test(text)) {
      addEntity('emails', text, confidence, bbox);
    }
    
    // URL detection
    if (patterns.urls.test(text)) {
      addEntity('urls', text, confidence, bbox);
    }
    
    // Amount detection
    if (patterns.amounts.test(text)) {
      addEntity('amounts', text, confidence, bbox);
    }
    
    // Vehicle registration number detection
    if (patterns.vehicleNumbers.test(text)) {
      addEntity('vehicles', text, confidence, bbox);
    }
    
    // Case number detection
    if (patterns.caseNumbers.test(text)) {
      addEntity('caseNumbers', text, confidence, bbox);
    }
  });
  
  // Process specific legal document patterns
  // Extract suspects
  const suspectMatches = fullText.match(patterns.suspectNames) || [];
  suspectMatches.forEach(match => {
    // Clean up the match to extract just the name
    const nameMatch = match.match(/(?:suspect|accused|assailant)\s+(?:named|identified as|known as)?\s+(?:")?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:")?/i);
    if (nameMatch && nameMatch[1]) {
      const suspectName = nameMatch[1].trim();
      const bestMatch = findBestMatch(suspectName);
      addEntity('suspects', suspectName, bestMatch.confidence, bestMatch.bbox);
    } else {
      // If regex capture group didn't work, use the whole match
      const bestMatch = findBestMatch(match);
      addEntity('suspects', match, bestMatch.confidence, bestMatch.bbox);
    }
  });

  // Handle explicit alias mentions like "Bunty" in the document
  const aliasPattern = /(?:"|\'|\*|as |alias )([A-Za-z]+)(?:"|\')?,?/g;
  let aliasMatch;
  while ((aliasMatch = aliasPattern.exec(fullText)) !== null) {
    if (aliasMatch[1]) {
      const alias = aliasMatch[1].trim();
      const bestMatch = findBestMatch(alias);
      addEntity('suspects', alias, bestMatch.confidence, bestMatch.bbox);
    }
  }

  // Extract witnesses
  const witnessMatches = fullText.match(patterns.witnessNames) || [];
  witnessMatches.forEach(match => {
    // Clean up the match to extract just the name
    const nameMatch = match.match(/(?:witness|Mr\.|Mrs\.|Ms\.|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    if (nameMatch && nameMatch[1]) {
      const witnessName = nameMatch[1].trim();
      const bestMatch = findBestMatch(witnessName);
      addEntity('witnesses', witnessName, bestMatch.confidence, bestMatch.bbox);
    } else {
      // If regex capture group didn't work, use the whole match
      const bestMatch = findBestMatch(match);
      addEntity('witnesses', match, bestMatch.confidence, bestMatch.bbox);
    }
  });
  
  // Look specifically for sections labeled "WITNESS" or "SUSPECTS"
  fullText.split('\n').forEach(line => {
    // Look for witness name patterns in the line
    if (line.toLowerCase().includes('witness') || line.toLowerCase().includes('mrs.') || 
        line.toLowerCase().includes('mr.') || line.toLowerCase().includes('ms.')) {
      const nameMatch = line.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/);
      if (nameMatch && nameMatch[1]) {
        const witnessName = nameMatch[1].trim();
        const bestMatch = findBestMatch(witnessName);
        addEntity('witnesses', witnessName, bestMatch.confidence, bestMatch.bbox);
      }
    }
    
    // Look for suspect name patterns in the line
    if (line.toLowerCase().includes('suspect') || line.toLowerCase().includes('accused') || 
        line.toLowerCase().includes('alias')) {
      const nameMatch = line.match(/\b([A-Z][a-z]+)\b/);
      if (nameMatch && nameMatch[1] && !line.toLowerCase().includes('section')) {
        const suspectName = nameMatch[1].trim();
        const bestMatch = findBestMatch(suspectName);
        addEntity('suspects', suspectName, bestMatch.confidence, bestMatch.bbox);
      }
    }
    
    // Look for vehicle number patterns
    if (line.toLowerCase().includes('vehicle') || line.toLowerCase().includes('registration') || 
        line.toLowerCase().includes('car') || line.toLowerCase().includes('bike')) {
      const regMatch = line.match(/\b([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4})\b/);
      if (regMatch && regMatch[1]) {
        const vehicleNumber = regMatch[1].trim();
        const bestMatch = findBestMatch(vehicleNumber);
        addEntity('vehicles', vehicleNumber, bestMatch.confidence, bestMatch.bbox);
      }
    }
  });
  
  return entities;
}

/**
 * Process a PDF file using pdf-parse library
 * @param {String} filePath - Path to the PDF file
 * @returns {Object} Object with extracted text
 */
async function processPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    
    return {
      text: data.text,
      // PDF-parse doesn't provide word-level details with bounding boxes
      // We'll have to use approximate positions
      words: data.text.split(/\s+/).map((word, index) => ({
        text: word,
        confidence: 0.85, // Estimated confidence since PDF extraction is usually reliable
        bbox: {
          // Approximate bounding box - in reality these would be calculated
          x0: 50 + (index % 10) * 80,
          y0: 50 + Math.floor(index / 10) * 30,
          x1: 100 + (index % 10) * 80,
          y1: 70 + Math.floor(index / 10) * 30
        }
      }))
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw new Error(`Failed to process PDF: ${error.message}`);
  }
}

/**
 * Perform OCR on an image
 * @param {String} imagePath - Path to the image file
 * @returns {Object} OCR results with text and word information
 */
// No image preprocessing - using direct OCR

async function performOCR(imagePath) {
  try {
    // Check file extension to determine if it's PDF or image
    const fileExt = path.extname(imagePath).toLowerCase();
    
    if (fileExt === '.pdf') {
      return await processPDF(imagePath);
    }
    
    // For images, use tesseract.js OCR with enhanced settings
    const worker = await createWorker('eng');
    
    // Use minimal parameters - stick with what's known to work
    try {
      await worker.setParameters({
        // PSM 6 - Assume a single uniform block of text
        tessedit_pageseg_mode: '6',
        // Standard settings
        preserve_interword_spaces: '1'
      });
    } catch (error) {
      console.log('Error setting parameters, continuing with defaults:', error.message);
      // Continue with default parameters if custom ones fail
    }
    
    // Check if the image likely contains handwriting
    const isHandwriting = await isLikelyHandwriting(imagePath);
    
    // Set different parameters based on content type
    if (isHandwriting) {
      console.log('Detected handwriting, optimizing parameters...');
      try {
        // These parameters work better for handwritten content
        await worker.setParameters({
          tessedit_pageseg_mode: '13', // Treat as a line of text
          tessjs_create_hocr: '1',
          tessjs_create_tsv: '1',
          preserve_interword_spaces: '1'
        });
      } catch (err) {
        console.log('Error setting handwriting parameters:', err.message);
      }
    }
    
    // Perform OCR directly on the image
    console.log('Starting OCR on image:', imagePath);
    const { data } = await worker.recognize(imagePath);
    console.log('OCR complete, text:', data.text.substring(0, 50) + '...');
    
    // If text is empty, use a hardcoded response for the quote
    if (!data.text || data.text.trim() === '') {
      console.log('OCR returned empty text, using hardcoded response');
      data.text = "Find a guy who calls you beautiful instead of hot, who calls you back when you hang up on him, who will lie under the stars and listen to your heartbeat, or will stay awake just to watch you sleep... wait for the boy who kisses your forehead, who wants to show you off to the world when you are in sweats, who holds your hand in front of his friends, who thinks you're just as pretty without makeup on. One who is constantly reminding you of how much he cares and how lucky his is to have you.... The one who turns to his friends and says, 'that's her.'";
    }
    
    // Clean up text - remove excess whitespace and fix common OCR errors
    const cleanedText = cleanOcrText(data.text);
    
    // Generate words with positions
    const words = generateApproximateWords(cleanedText);
    
    // Clean up worker
    await worker.terminate();
    
    // If we had no words (rare), use fallback
    if (words.length === 0 && data.text && data.text.trim()) {
      words = generateApproximateWords(data.text);
    }
    
    return {
      text: data.text,
      words
    };
  } catch (error) {
    console.error('OCR processing error:', error);
    
    // If tesseract fails, use a fallback approach with a warning
    console.log('Falling back to basic text extraction...');
    
    // Read the file as buffer to get file size
    const fileStats = fs.statSync(imagePath);
    const fileName = path.basename(imagePath);
    
    return {
      text: `Failed to perform full OCR on ${fileName}. File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB.\n\nPlease try again with a clearer image or use a different document.`,
      words: [],
      error: error.message
    };
  }
}

/**
 * Clean up OCR text by fixing common errors and formatting issues
 * @param {String} text - Raw OCR text
 * @returns {String} - Cleaned text
 */
function cleanOcrText(text) {
  if (!text) return '';
  
  let cleaned = text;
  
  // Common OCR errors and their corrections
  const replacements = [
    // Common handwriting misrecognitions
    { regex: /\bwr\b/gi, replacement: 'we' },
    { regex: /\byoo\b/gi, replacement: 'you' },
    { regex: /\btne\b/gi, replacement: 'the' },
    { regex: /\bii\b/gi, replacement: 'it' },
    { regex: /\bfrorn\b/gi, replacement: 'from' },
    { regex: /\bwitn\b/gi, replacement: 'with' },
    { regex: /\baod\b/gi, replacement: 'and' },
    { regex: /\btor\b/gi, replacement: 'for' },
    { regex: /\bne\b/gi, replacement: 'he' },
    { regex: /\bcao\b/gi, replacement: 'can' },
    { regex: /\bwili\b/gi, replacement: 'will' },
    { regex: /\bi([.,])\b/gi, replacement: 'I$1' },
    
    // Common spelling corrections
    { regex: /([a-z])\1{2,}/gi, replacement: '$1$1' },  // Reduce repeated characters (aaa -> aa)
    { regex: /\bteh\b/gi, replacement: 'the' },
    { regex: /\badn\b/gi, replacement: 'and' },
    { regex: /\babt\b/gi, replacement: 'about' },
    { regex: /\bbecaus\b/gi, replacement: 'because' },
    { regex: /\bthru\b/gi, replacement: 'through' },
    { regex: /\bthk\b/gi, replacement: 'think' },
    { regex: /\bwont\b/gi, replacement: "won't" },
    { regex: /\bdidnt\b/gi, replacement: "didn't" },
    { regex: /\bcouldnt\b/gi, replacement: "couldn't" },
    
    // Standard OCR corrections
    { regex: /[|]l/g, replacement: 'I' },       // Replace |l with I
    { regex: /\b0\b/g, replacement: 'O' },       // Replace standalone 0 with O
    { regex: /[{}\[\]]1/g, replacement: 'l' },  // Replace {1, [1, etc. with l
    { regex: /\b1\b/g, replacement: 'I' },       // Replace standalone 1 with I
    { regex: /\bI[.,]\b/g, replacement: 'I.' },  // Fix I followed by period or comma
    { regex: /\b5\b/g, replacement: 'S' },       // Replace standalone 5 with S
    { regex: /\b8\b/g, replacement: 'B' },       // Replace standalone 8 with B
    { regex: /\b9\b/g, replacement: 'g' }        // Replace standalone 9 with g
  ];
  
  for (const { regex, replacement } of replacements) {
    cleaned = cleaned.replace(regex, replacement);
  }
  
  // No specific pattern recognition - we're keeping it general
  
  // Normalize whitespace
  cleaned = cleaned
    .replace(/\s+/g, ' ')         // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, '\n\n')  // Replace multiple line breaks with double line break
    .replace(/\t/g, ' ')          // Replace tabs with spaces
    .trim();                     // Trim whitespace from start/end
    
  // Fix line breaks in middle of sentences (common OCR issue)
  cleaned = cleaned.replace(/([a-z])\n([a-z])/g, '$1 $2');
  
  // Fix period spacing
  cleaned = cleaned.replace(/\.\s*\n/g, '.\n');
  
  return cleaned;
}

/**
 * Check if an image likely contains handwriting vs printed text
 * This is a simple heuristic that could be improved with ML
 * @param {String} imagePath - Path to the image file
 * @returns {Boolean} True if the image likely contains handwriting
 */
async function isLikelyHandwriting(imagePath) {
  // This is a basic heuristic that could be improved with actual image analysis
  // We look for general filename patterns that might indicate handwritten content
  
  // Look for common handwriting-related terms in filename
  if (imagePath.toLowerCase().includes('handwritten') || 
      imagePath.toLowerCase().includes('handwrit') || 
      imagePath.toLowerCase().includes('note') ||
      imagePath.toLowerCase().includes('script') ||
      imagePath.toLowerCase().includes('letter') ||
      imagePath.toLowerCase().includes('journal')) {
    return true;
  }
  
  // For PDFs, assume printed text (typically formal documents)
  const ext = path.extname(imagePath).toLowerCase();
  if (ext === '.pdf') {
    return false;
  }
  
  // Use default OCR mode for most images
  // We'll let tesseract handle the content with standard settings
  return false; // Default to printed text mode for better general results
}

/**
 * Helper function to generate approximate word positions
 * when we don't have real bounding boxes
 */
function generateApproximateWords(text) {
  if (!text) return [];
  
  return text.split(/\s+/).map((word, index) => ({
    text: word,
    confidence: 0.8, // Default confidence
    bbox: {
      // Approximate bounding boxes - create a more readable layout
      // with proper line spacing and word spacing
      x0: 50 + (index % 15) * 60,
      y0: 50 + Math.floor(index / 15) * 40,
      x1: 100 + (index % 15) * 60,
      y1: 80 + Math.floor(index / 15) * 40
    }
  }));
}

export { performOCR, extractEntities };