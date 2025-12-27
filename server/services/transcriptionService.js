import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const transcribeAudio = async (audioFilePath) => {
  throw new Error('This transcription service is deprecated. Use aiService.transcribeAudio() which uses ElevenLabs instead.');
};

export { transcribeAudio };
