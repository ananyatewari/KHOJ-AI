import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function extractEntities(text) {
  const defaults = {
    persons: [],
    places: [],
    dates: [],
    organizations: [],
    phoneNumbers: []
  };

  if (!text) return defaults;

  // Allow override via env var; fall back to gpt-3.5-turbo if needed
  const preferredModel = process.env.OPENAI_ENTITY_MODEL || process.env.AI_MODEL || 'gpt-4';

  const prompt = `Extract named entities from the following text and categorize them. Return as JSON with these exact categories: persons, places, dates, organizations, phoneNumbers. Each entity should have 'text' and 'confidence' (0-1) fields.

Text:
${text}

Return ONLY valid JSON, no additional text.`;

  async function callModel(model) {
    return openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are an entity extraction expert. Extract named entities from text and categorize them accurately. Always return valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.0,
      max_tokens: 800
    });
  }

  try {
    let response;
    try {
      response = await callModel(preferredModel);
    } catch (err) {
      const isModelError = err && (err.code === 'model_not_found' || err.status === 404 || (err.error && err.error.code === 'model_not_found'));
      if (isModelError && preferredModel !== 'gpt-3.5-turbo') {
        console.warn(`Preferred entity model ${preferredModel} unavailable — retrying with gpt-3.5-turbo`);
        response = await callModel('gpt-3.5-turbo');
      } else {
        throw err;
      }
    }

    const content = response?.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content from entity model');

    // Attempt to extract JSON from content
    const match = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    const jsonText = match ? (match[1] || match[0]) : content;

    let entities = {};
    try {
      entities = JSON.parse(jsonText);
    } catch (e) {
      console.warn('Failed to parse entity JSON, returning defaults. Raw content:', jsonText);
      return defaults;
    }

    // Normalize and ensure correct shape
    entities = { ...defaults, ...entities };
    Object.keys(entities).forEach((key) => {
      if (!Array.isArray(entities[key])) entities[key] = [];
      entities[key] = entities[key].map((entity) => ({
        text: entity.text || entity,
        confidence: typeof entity.confidence === 'number' ? entity.confidence : 0.85,
        source: 'nlp'
      }));
    });

    return entities;
  } catch (error) {
    console.error('Error extracting entities:', error);
    return defaults;
  }
}
