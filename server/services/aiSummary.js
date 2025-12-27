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

  // If some fields are empty, synthesize them from the narrative and entity context
  const synthesized = synthesizeMissingFields(structured, narrative, entityContext);
  return synthesized;
}

async function structureNarrativeToJson(narrativeText) {
  const systemPrompt = `
You are a strict JSON generator. Convert the provided intelligence narrative into the EXACT JSON schema shown below.

Return ONLY valid JSON. No markdown, commentary, or extra keys.

Schema (exact):
{
  "executiveSummary": string,
  "keyFindings": string[],
  "entityInsights": {
    "persons": string[],
    "places": string[],
    "organizations": string[]
  },
  "analystTakeaways": string[],
  "keyDiscussionPoints": string[],
  "decisionsMade": string[],
  "actionItems": [{"item": string, "assignee": string, "dueDate": string}],
  "nextSteps": string[],
  "importantDeadlines": string[],
  "takeaways": string[]
}

Example output (must match schema):
{
  "executiveSummary": "Brief summary here.",
  "keyFindings": ["Finding one","Finding two"],
  "entityInsights": {"persons":["Alice"],"places":["Paris"],"organizations":["Org A"]},
  "analystTakeaways": ["Takeaway one","Takeaway two"],
  "keyDiscussionPoints": ["Discussion point one","Discussion point two"],
  "decisionsMade": ["Decision one","Decision two"],
  "actionItems": [{"item":"Action one","assignee":"John","dueDate":"2024-01-01"}],
  "nextSteps": ["Step one","Step two"],
  "importantDeadlines": ["Deadline one","Deadline two"],
  "takeaways": ["Takeaway one","Takeaway two"]
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

  const raw = completion.choices?.[0]?.message?.content || "";

  // Try to extract JSON code block or nearest {...}
  const match = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/\{[\s\S]*\}/);
  const jsonText = match ? (match[1] || match[0]) : raw;

  // Try straightforward parse first
  try {
    return JSON.parse(jsonText);
  } catch (err) {
    // Attempt to sanitize common JSON issues: replace single quotes, remove trailing commas
    let sanitized = jsonText
      .replace(/\u2018|\u2019|\u201c|\u201d/g, '"') // smart quotes
      .replace(/\\n/g, ' ')
      .replace(/\'(?=,|\s|\:)/g, "'")
      .replace(/([\{\[,])\s*'/g, '$1"')
      .replace(/'\s*([\}\],])/g, '"$1')
      .replace(/(['"])?([a-zA-Z0-9_\-]+)(['"])??\s*:/g, '"$2":') // ensure keys quoted
      .replace(/,\s*([\}\]])/g, '$1'); // remove trailing commas

    try {
      return JSON.parse(sanitized);
    } catch (err2) {
      console.warn('Failed to parse structured JSON from AI. Raw:', raw, 'Sanitized:', sanitized, 'Errors:', err.message, err2.message);
      // Return a partial structure that will be synthesized later
      return {
        executiveSummary: narrativeText.slice(0, 1000),
        keyFindings: [],
        entityInsights: { persons: [], places: [], organizations: [] },
        analystTakeaways: [],
        keyDiscussionPoints: [],
        decisionsMade: [],
        actionItems: [],
        nextSteps: [],
        importantDeadlines: [],
        takeaways: []
      };
    }
  }
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

function synthesizeMissingFields(structured, narrative, entityContext) {
  const result = { ...structured };

  // Ensure keys exist
  result.executiveSummary = result.executiveSummary || (narrative ? narrative.split('\n')[0].slice(0, 1000) : '');
  result.keyFindings = Array.isArray(result.keyFindings) ? result.keyFindings : [];
  result.entityInsights = result.entityInsights || { persons: [], places: [], organizations: [] };
  result.analystTakeaways = Array.isArray(result.analystTakeaways) ? result.analystTakeaways : [];
  result.keyDiscussionPoints = Array.isArray(result.keyDiscussionPoints) ? result.keyDiscussionPoints : [];
  result.decisionsMade = Array.isArray(result.decisionsMade) ? result.decisionsMade : [];
  result.actionItems = Array.isArray(result.actionItems) ? result.actionItems : [];
  result.nextSteps = Array.isArray(result.nextSteps) ? result.nextSteps : [];
  result.importantDeadlines = Array.isArray(result.importantDeadlines) ? result.importantDeadlines : [];
  result.takeaways = Array.isArray(result.takeaways) ? result.takeaways : [];

  // If entityInsights empty, fill from entityContext
  const flattenEntities = (ctx) => {
    const persons = new Set();
    const places = new Set();
    const orgs = new Set();
    (ctx || []).forEach(d => {
      if (d?.persons) d.persons.forEach(p => persons.add(typeof p === 'string' ? p : p.text));
      if (d?.places) d.places.forEach(p => places.add(typeof p === 'string' ? p : p.text));
      if (d?.organizations) d.organizations.forEach(o => orgs.add(typeof o === 'string' ? o : o.text));
    });
    return { persons: Array.from(persons), places: Array.from(places), organizations: Array.from(orgs) };
  };

  const entFlat = flattenEntities(entityContext);
  if ((!result.entityInsights.persons || result.entityInsights.persons.length === 0) && entFlat.persons.length) {
    result.entityInsights.persons = entFlat.persons;
  }
  if ((!result.entityInsights.places || result.entityInsights.places.length === 0) && entFlat.places.length) {
    result.entityInsights.places = entFlat.places;
  }
  if ((!result.entityInsights.organizations || result.entityInsights.organizations.length === 0) && entFlat.organizations.length) {
    result.entityInsights.organizations = entFlat.organizations;
  }

  // If keyFindings empty, pick top sentences from narrative that look like findings
  if (!result.keyFindings || result.keyFindings.length === 0) {
    const sentences = (narrative || '').split(/[\.\n]\s+/).map(s => s.trim()).filter(Boolean);
    const candidates = [];
    const keywords = ['important', 'noted', 'observed', 'indicates', 'shows', 'reveals', 'recommend', 'suggest'];
    sentences.forEach(s => {
      const hasEntity = entFlat.persons.concat(entFlat.places, entFlat.organizations).some(e => e && s.includes(e));
      const hasKeyword = keywords.some(k => s.toLowerCase().includes(k));
      if (hasEntity || hasKeyword || s.length > 40) candidates.push(s);
    });
    result.keyFindings = candidates.slice(0, 6);
  }

  // If analystTakeaways empty, produce concise takeaways
  if (!result.analystTakeaways || result.analystTakeaways.length === 0) {
    const sentences = (narrative || '').split(/[\.\n]\s+/).map(s => s.trim()).filter(Boolean);
    const takeaways = sentences.filter(s => s.toLowerCase().includes('should') || s.toLowerCase().includes('recommend') || s.toLowerCase().includes('consider'));
    if (takeaways.length) {
      result.analystTakeaways = takeaways.slice(0, 5);
    } else {
      const meaningful = sentences.filter(s => s.length > 40);
      result.analystTakeaways = meaningful.slice(-5).slice(0, 5);
    }
  }

  return result;
}

