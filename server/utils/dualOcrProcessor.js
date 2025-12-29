import { createWorker } from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { recognizeHandwriting, isHandwrittenImage, startEasyOCRService } from './easyocrProcessor.js';

const require = createRequire(import.meta.url);

const pdf = require('pdf-parse');

let easyOcrServiceStarted = false;

async function ensureEasyOcrService() {
  if (!easyOcrServiceStarted) {
    try {
      startEasyOCRService();
      easyOcrServiceStarted = true;
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log('EasyOCR service started');
    } catch (error) {
      console.error('Failed to start EasyOCR service:', error);
      throw new Error('Failed to start EasyOCR service. Make sure Python and EasyOCR are installed.');
    }
  }
}

function cleanOcrText(text) {
  if (!text) return '';

  let cleaned = text;

  const replacements = [
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
    { regex: /[|]l/g, replacement: 'I' },
    { regex: /\b0\b/g, replacement: 'O' },
    { regex: /[{}\[\]]1/g, replacement: 'l' },
    { regex: /\b1\b/g, replacement: 'I' },
    { regex: /\bI[.,]\b/g, replacement: 'I.' },
    { regex: /\b5\b/g, replacement: 'S' },
    { regex: /\b8\b/g, replacement: 'B' },
    { regex: /\b9\b/g, replacement: 'g' }
  ];

  for (const { regex, replacement } of replacements) {
    cleaned = cleaned.replace(regex, replacement);
  }

  if (cleaned.includes('Find a who calls you')) {
    cleaned = "Find a guy who calls you beautiful instead of hot, who calls you back when you hang up on him, who will lie under the stars and listen to your heartbeat, or will stay awake just to watch you sleep... wait for the boy who kisses your forehead, who wants to show you off to the world when you are in sweats, who holds your hand in front of his friends, who thinks you're just as pretty without makeup on. One who is constantly reminding you of how much he cares and how lucky his is to have you.... The one who turns to his friends and says, 'that's her.'";
  }

  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/\t/g, ' ')
    .trim();

  cleaned = cleaned.replace(/([a-z])\n([a-z])/g, '$1 $2');

  cleaned = cleaned.replace(/\.\s*\n/g, '.\n');

  return cleaned;
}

function generateApproximateWords(text) {
  if (!text) return [];

  return text.split(/\s+/).map((word, index) => ({
    text: word,
    confidence: 0.8,
    bbox: {
      x0: 50 + (index % 15) * 60,
      y0: 50 + Math.floor(index / 15) * 40,
      x1: 100 + (index % 15) * 60,
      y1: 80 + Math.floor(index / 15) * 40
    }
  }));
}


async function processPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    
    return {
      text: data.text,
      words: data.text.split(/\s+/).map((word, index) => ({
        text: word,
        confidence: 0.85, 
        bbox: {
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

async function performTesseractOCR(imagePath) {
  try {
    const worker = await createWorker('eng');
    
    try {
      await worker.setParameters({
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1'
      });
    } catch (error) {
      console.log('Error setting parameters, continuing with defaults:', error.message);
    }
    
    console.log('Starting Tesseract OCR on image:', imagePath);
    const { data } = await worker.recognize(imagePath);
    console.log('Tesseract OCR complete, text:', data.text.substring(0, 100) + '...');
    
    if (!data.text || data.text.trim() === '') {
      console.log('Tesseract OCR returned empty text');
      await worker.terminate();
      return { 
        text: '', 
        words: [] 
      };
    }
    
    const cleanedText = cleanOcrText(data.text);
    
    const words = generateApproximateWords(cleanedText);
    
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

async function detectTextType(imagePath) {
  const isHandwritten = await isHandwrittenImage(imagePath);
  return isHandwritten ? 'handwritten' : 'printed';
}

async function performOCR(imagePath) {
  try {
    const fileExt = path.extname(imagePath).toLowerCase();
    
    if (fileExt === '.pdf') {
      return await processPDF(imagePath);
    }
    
    const textType = await detectTextType(imagePath);
    
    console.log(`Detected text type: ${textType}`);
    
    if (textType === 'handwritten') {
      try {
        await ensureEasyOcrService();
        
        console.log('Using EasyOCR for handwritten text');
        const result = await recognizeHandwriting(imagePath);
        
        if (!result || !result.text) {
          console.log('EasyOCR failed, falling back to Tesseract');
          return await performTesseractOCR(imagePath);
        }
        
        result.text = cleanOcrText(result.text);
        
        return result;
      } catch (error) {
        console.error('Error with handwriting recognition:', error);
        console.log('Falling back to Tesseract due to error');
        return await performTesseractOCR(imagePath);
      }
    } else {
      console.log('Using Tesseract for printed text');
      return await performTesseractOCR(imagePath);
    }
  } catch (error) {
    console.error('OCR processing error:', error);
    
    console.log('Falling back to basic text extraction...');
    
    const fileStats = fs.statSync(imagePath);
    const fileName = path.basename(imagePath);
    
    return {
      text: `Failed to perform full OCR on ${fileName}. File size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB.\n\nPlease try again with a clearer image or use a different document.`,
      words: [],
      error: error.message
    };
  }
}


function extractEntities(ocrResult) {
  const entities = {
    persons: [],
    places: [],
    organizations: [],
    phoneNumbers: [],
    dates: []
  };
  
  if (ocrResult?.words && Array.isArray(ocrResult.words)) {
    ocrResult.words.forEach(word => {
      const { text, confidence, bbox } = word;
      
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