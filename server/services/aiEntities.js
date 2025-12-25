import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function extractEntitiesAI(text) {
  if (!text || text.length < 200) return null;

  const systemPrompt = `
You are an intelligence analyst.

Extract ONLY factual named entities from the document.

Rules:
- Do NOT hallucinate
- Only include entities explicitly present
- Deduplicate entities
- Keep names concise

Return STRICT JSON with this schema:
{
  "persons": string[],
  "places": string[],
  "organizations": string[]
}
`;

  const userPrompt = `
DOCUMENT CONTENT:
${text.slice(0, 8000)}
`;

  const completion = await groq.chat.completions.create({
    model: process.env.AI_MODEL,
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  const raw = completion.choices[0].message.content;

  // Safe JSON extraction
  const match =
    raw.match(/```json\s*([\s\S]*?)\s*```/) ||
    raw.match(/\{[\s\S]*\}/);

  if (!match) return null;

  return JSON.parse(match[1] || match[0]);
}
