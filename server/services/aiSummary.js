import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function generateAISummary({ documents }) {
  if (!documents || !documents.length) return null;

  const combinedText = documents
    .map(d => d.text)
    .join("\n")
    .slice(0, 12000);

  const entityContext = documents.map(d => d.entities);

  // Phase 1: Free-form analysis
  const narrative = await generateNarrative({
    combinedText,
    entityContext
  });

  // Phase 2: Structured JSON
  const structured = await structureNarrativeToJson(narrative);

  return structured;
}

async function structureNarrativeToJson(narrativeText) {
  const systemPrompt = `
You convert intelligence reports into structured JSON.

Return ONLY valid JSON.
No markdown.
No commentary.

Schema:
{
  "executiveSummary": string,
  "keyFindings": string[],
  "entityInsights": {
    "persons": string[],
    "places": string[],
    "organizations": string[]
  },
  "analystTakeaways": string[]
}
`;

  const completion = await groq.chat.completions.create({
    model: process.env.AI_MODEL,
    temperature: 0,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: narrativeText }
    ]
  });

  return JSON.parse(completion.choices[0].message.content);
}

async function generateNarrative({ combinedText, entityContext }) {
  const systemPrompt = `
You are an intelligence analyst.

Generate a professional intelligence report based ONLY on the document content.
Write in clear sections:
- Executive Summary
- Key Findings
- Entity Insights
- Analyst Takeaways

Do NOT format as JSON.
Do NOT mention AI or models.
`;

  const userPrompt = `
DOCUMENT CONTENT:
${combinedText}

EXTRACTED ENTITIES:
${JSON.stringify(entityContext, null, 2)}
`;

  const completion = await groq.chat.completions.create({
    model: process.env.AI_MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  return completion.choices[0].message.content;
}
