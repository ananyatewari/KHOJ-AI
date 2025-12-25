// EasyOCR processor for handwriting recognition
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import axios from 'axios';
import FormData from 'form-data';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Configuration
const EASYOCR_SERVICE_URL = 'http://localhost:5000';

/**
 * Start the EasyOCR Python service
 * This function spawns a Python process running the EasyOCR service
 * @returns {ChildProcess} The spawned process
 */
export function startEasyOCRService() {
  try {
    // Fix for ES modules where __dirname is not defined - using standard approach
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const pythonScript = path.join(__dirname, 'easyocr_service.py');
    
    console.log('Starting EasyOCR service...');
    
    const process = spawn('python', [pythonScript, '--port', '5000']);
    
    process.stdout.on('data', (data) => {
      console.log(`EasyOCR service: ${data.toString().trim()}`);
    });
    
    process.stderr.on('data', (data) => {
      console.error(`EasyOCR service error: ${data.toString().trim()}`);
    });
    
    process.on('close', (code) => {
      console.log(`EasyOCR service exited with code ${code}`);
    });
    
    // Allow time for the service to start
    setTimeout(async () => {
      try {
        const response = await axios.get(`${EASYOCR_SERVICE_URL}/health`);
        if (response.data.status === 'healthy') {
          console.log('EasyOCR service is running and healthy');
        }
      } catch (error) {
        console.error('EasyOCR service health check failed:', error.message);
      }
    }, 5000);
    
    return process;
  } catch (error) {
    console.error('Failed to start EasyOCR service:', error);
    throw error;
  }
}

/**
 * Perform handwriting OCR using EasyOCR
 * @param {String} imagePath - Path to the image file
 * @returns {Object} OCR results with text and word information
 */
export async function recognizeHandwriting(imagePath) {
  try {
    // Create form data with the image
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    
    // Send the image to the EasyOCR service
    const response = await axios.post(
      `${EASYOCR_SERVICE_URL}/recognize`, 
      formData, 
      {
        headers: {
          ...formData.getHeaders()
        },
        timeout: 30000 // 30 second timeout
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error recognizing handwriting:', error);
    throw new Error(`Handwriting recognition failed: ${error.message}`);
  }
}

/**
 * Check if an image contains handwriting
 * This is a simple heuristic that can be improved
 * @param {String} imagePath - Path to the image file
 * @returns {Boolean} True if the image likely contains handwriting
 */
export async function isHandwrittenImage(imagePath) {
  try {
    // For now, we'll assume any image provided to this function is handwritten
    // In a production environment, you'd want a more sophisticated detection method
    return true;
  } catch (error) {
    console.error('Error detecting if image contains handwriting:', error);
    return false;
  }
}