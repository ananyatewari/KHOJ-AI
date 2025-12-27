import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import { generateAISummary } from '../services/aiSummary.js';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Allow configuring chat model via environment; fall back to a widely-available model
const CHAT_MODEL = process.env.GROQ_CHAT_MODEL || process.env.CHATBOT_MODEL || 'llama-3.1-70b-versatile';

// (Using ElevenLabs as the single transcription provider)

const aiService = {
    async transcribeAudio(audioPath) {
        try {
            console.log('Starting transcription (ElevenLabs only) for:', audioPath);

            // ElevenLabs must be configured
            if (!process.env.ELEVENLABS_API_KEY) {
                throw new Error('ELEVENLABS_API_KEY is not set in the environment. Set it to use ElevenLabs STT.');
            }

            // Check if file exists
            if (!fs.existsSync(audioPath)) {
                throw new Error(`Audio file not found at path: ${audioPath}`);
            }

            const fileSize = (fs.statSync(audioPath).size / 1024 / 1024).toFixed(2);
            console.log('File size:', fileSize, 'MB');

            console.log('Sending file to ElevenLabs STT...');
            const form = new FormData();
            form.append('file', fs.createReadStream(audioPath));
            // ElevenLabs requires a model_id in the request body
            const elevenModel = process.env.ELEVENLABS_MODEL || 'scribe_v1';
            form.append('model_id', elevenModel);

            const elevenRes = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
                method: 'POST',
                headers: {
                    'xi-api-key': process.env.ELEVENLABS_API_KEY
                },
                body: form
            });

            if (!elevenRes.ok) {
                const body = await elevenRes.text();
                console.error('ElevenLabs STT failed:', elevenRes.status, body);
                throw new Error(`ElevenLabs STT failed with status ${elevenRes.status}: ${body}`);
            }

            const json = await elevenRes.json();
            const text = json.text || json.transcript || json.results?.[0]?.transcript || null;
            if (!text) {
                console.error('ElevenLabs STT returned no transcript:', JSON.stringify(json));
                throw new Error('ElevenLabs STT returned no transcript');
            }

            console.log('ElevenLabs transcription successful; length:', text.length);
            return text;
        } catch (error) {
            console.error('Error transcribing audio (ElevenLabs):', error.message || error);
            throw new Error(`Failed to transcribe audio: ${error.message}`);
        }
    },

    async processTranscript(transcript, entities = null) {
        try {
            // Reuse the intelligence document summarization pipeline
            const docs = [
                {
                    text: transcript,
                    entities: entities || {}
                }
            ];

            const structured = await generateAISummary({ documents: docs });
            return structured;
        } catch (error) {
            console.error('Error processing transcript via generateAISummary:', error);
            throw new Error('Failed to process transcript');
        }
    },


    async generateSummary(minutes) {
        try {
            const docs = (Array.isArray(minutes) ? minutes : [{ text: minutes }]).map(m => ({ text: m.text || m }));
            const structured = await generateAISummary({ documents: docs });
            return structured;
        } catch (error) {
            console.error('Error generating summary via generateAISummary:', error);
            throw new Error('Failed to generate summary');
        }
    }
};

export default aiService;
