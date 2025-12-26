import axios from 'axios';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const transcribeAudio = async (audioFilePath) => {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(audioFilePath));
  formData.append('model', 'whisper-1');  // Use the Whisper model for transcription

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.text; // The transcription text from Whisper
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error('Failed to transcribe audio');
  }
};

export { transcribeAudio };
