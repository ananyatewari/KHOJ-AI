import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import axios from 'axios';
import FormData from 'form-data';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const EASYOCR_SERVICE_URL = 'http://localhost:5000';

export function startEasyOCRService() {
  try {
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

export async function recognizeHandwriting(imagePath) {
  try {
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath));
    
    const response = await axios.post(
      `${EASYOCR_SERVICE_URL}/recognize`, 
      formData, 
      {
        headers: {
          ...formData.getHeaders()
        },
        timeout: 30000
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error recognizing handwriting:', error);
    throw new Error(`Handwriting recognition failed: ${error.message}`);
  }
}

export async function isHandwrittenImage(imagePath) {
  try {
    return true;
  } catch (error) {
    console.error('Error detecting if image contains handwriting:', error);
    return false;
  }
}