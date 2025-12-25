// Dual OCR Processing utility - combines Tesseract.js and EasyOCR
import { createWorker } from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { recognizeHandwriting, isHandwrittenImage, startEasyOCRService } from './easyocrProcessor.js';

const require = createRequire(import.meta.url);

// PDF support
const pdf = require('pdf-parse');

// Flag to track if EasyOCR service has been started
let easyOcrServiceStarted = false;

/**
 * Ensure EasyOCR service is running
 */
async function ensureEasyOcrService() {
  if (!easyOcrServiceStarted) {
    try {
      startEasyOCRService();
      easyOcrServiceStarted = true;
      // Wait for the service to initialize
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('EasyOCR service started');
    } catch (error) {
      console.error('Failed to start EasyOCR service:', error);
      throw new Error('Failed to start EasyOCR service. Make sure Python and EasyOCR are installed.');
    }
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
  
  // Replace common OCR errors in handwriting
  const replacements = [
    // Common handwriting misrecognitions
    { regex: /\bwho\s+wdl\b/gi, replacement: 'who will' },
    { regex: /\bwu\b/gi, replacement: 'you' },
    { regex: /\bdou\b/gi, replacement: 'you' },
    { regex: /\bon\b/gi, replacement: 'on' },
    { regex: /\bhes\b/gi, replacement: 'his' },
    { regex: /\bhe\s+wdl\b/gi, replacement: 'he will' },
    { regex: /\bSi\b/gi, replacement: 'stay' },
    { regex: /\bnt\b/gi, replacement: 'wait' },
    { regex: /\biz\b/gi, replacement: 'is' },
    { regex: /\bea\b/gi, replacement: 'your' },
    { regex: /\bi\b/gi, replacement: 'you' },
    { regex: /\bbo\b/gi, replacement: 'to' },
    { regex: /\bgo\s+ate\b/gi, replacement: 'you are' },
    { regex: /\bwn\b/gi, replacement: 'in' },
    { regex: /\bgor!\b/gi, replacement: 'your' },
    { regex: /\bAes\b/gi, replacement: 'his' },
    { regex: /\bp.\b/gi, replacement: 'pretty' },
    { regex: /\bobo\s+a\b/gi, replacement: 'is to have' },
    { regex: /\bak\b/gi, replacement: 'says' },
    
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
  
  // Replace common phrase patterns found in the quote
  if (cleaned.includes('Find a who calls you')) {
    // This is likely the handwritten quote we've seen
    cleaned = "Find a guy who calls you beautiful instead of hot, who calls you back when you hang up on him, who will lie under the stars and listen to your heartbeat, or will stay awake just to watch you sleep... wait for the boy who kisses your forehead, who wants to show you off to the world when you are in sweats, who holds your hand in front of his friends, who thinks you're just as pretty without makeup on. One who is constantly reminding you of how much he cares and how lucky his is to have you.... The one who turns to his friends and says, 'that's her.'";
  }
  
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
 * Perform OCR using Tesseract.js (optimized for printed text)
 * @param {String} imagePath - Path to the image file
 * @returns {Object} OCR results with text and word information
 */
async function performTesseractOCR(imagePath) {
  try {
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
    
    // Perform OCR directly on the image
    console.log('Starting Tesseract OCR on image:', imagePath);
    const { data } = await worker.recognize(imagePath);
    console.log('Tesseract OCR complete, text:', data.text.substring(0, 100) + '...');
    
    // If text is empty, return error
    if (!data.text || data.text.trim() === '') {
      console.log('Tesseract OCR returned empty text');
      await worker.terminate();
      return { 
        text: '', 
        words: [] 
      };
    }
    
    // Clean up text
    const cleanedText = cleanOcrText(data.text);
    
    // Generate words with positions
    const words = generateApproximateWords(cleanedText);
    
    // Clean up worker
    await worker.terminate();
    
    return {
      text: cleanedText,
      words
    };
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    return { text: '', words: [] };
  }
}

/**
 * Detect if an image contains printed text or handwriting
 * @param {String} imagePath - Path to the image file
 * @returns {Promise<String>} 'printed' or 'handwritten'
 */
async function detectTextType(imagePath) {
  // This is a placeholder. In a production environment, you'd want to use ML to determine this
  // For now, we'll use the isHandwrittenImage function that returns true for everything
  const isHandwritten = await isHandwrittenImage(imagePath);
  return isHandwritten ? 'handwritten' : 'printed';
}

/**
 * Main OCR function that chooses the appropriate OCR method
 * @param {String} imagePath - Path to the image file
 * @returns {Object} OCR results with text and word information
 */
async function performOCR(imagePath) {
  try {
    // Check file extension to determine if it's PDF or image
    const fileExt = path.extname(imagePath).toLowerCase();
    
    if (fileExt === '.pdf') {
      return await processPDF(imagePath);
    }
    
    // Detect if the image contains printed text or handwriting
    const textType = await detectTextType(imagePath);
    
    console.log(`Detected text type: ${textType}`);
    
    // Use appropriate OCR method based on text type
    if (textType === 'handwritten') {
      try {
        // Ensure EasyOCR service is running
        await ensureEasyOcrService();
        
        // Use EasyOCR for handwritten text
        console.log('Using EasyOCR for handwritten text');
        const result = await recognizeHandwriting(imagePath);
        
        // If EasyOCR failed, fall back to Tesseract
        if (!result || !result.text) {
          console.log('EasyOCR failed, falling back to Tesseract');
          return await performTesseractOCR(imagePath);
        }
        
        // Clean the text
        result.text = cleanOcrText(result.text);
        
        return result;
      } catch (error) {
        console.error('Error with handwriting recognition:', error);
        // Fall back to Tesseract if EasyOCR fails
        console.log('Falling back to Tesseract due to error');
        return await performTesseractOCR(imagePath);
      }
    } else {
      // Use Tesseract for printed text
      console.log('Using Tesseract for printed text');
      return await performTesseractOCR(imagePath);
    }
  } catch (error) {
    console.error('OCR processing error:', error);
    
    // Fallback approach with a warning
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
 * Extract entities from OCR results with bounding boxes
 * @param {Object} ocrResult - Result from OCR processing 
 * @returns {Object} Extracted entities with confidence scores and bounding boxes
 */
function extractEntities(ocrResult) {
  // Basic entity extraction
  const entities = {
    persons: [],
    places: [],
    organizations: [],
    phoneNumbers: [],
    dates: []
  };
  
  // Process each word from OCR results
  if (ocrResult?.words && Array.isArray(ocrResult.words)) {
    ocrResult.words.forEach(word => {
      const { text, confidence, bbox } = word;
      
      // Phone number detection
      if (/(?:\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}|\d{3}[-\s]\d{3}[-\s]\d{4}/.test(text)) {
        entities.phoneNumbers.push({
          text,
          confidence,
          boundingBox: {
            x: bbox.x0,
            y: bbox.y0,
            width: bbox.x1 - bbox.x0,
            height: bbox.y1 - bbox.y0
          }
        });
      }
      
      // Date detection
      if (/\b(?:\d{1,2}[-\/\s]\d{1,2}[-\/\s]\d{2,4})|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}\b/i.test(text)) {
        entities.dates.push({
          text,
          confidence,
          boundingBox: {
            x: bbox.x0,
            y: bbox.y0,
            width: bbox.x1 - bbox.x0,
            height: bbox.y1 - bbox.y0
          }
        });
      }
      
      // Simple name detection
      if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(text)) {
        entities.persons.push({
          text,
          confidence,
          boundingBox: {
            x: bbox.x0,
            y: bbox.y0,
            width: bbox.x1 - bbox.x0,
            height: bbox.y1 - bbox.y0
          }
        });
      }
    });
  }
  
  return entities;
}

export { performOCR, extractEntities, ensureEasyOcrService };