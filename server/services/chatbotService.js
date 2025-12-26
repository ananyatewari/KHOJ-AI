import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function converseWithChatbot({ messages = [], userContext = {}, contextText = "" }) {
  const systemPrompt = `
You are a cross-agency collaboration assistant. Your role is to help the user discover whether additional context or related documents exist in other agencies, propose collaboration leads, and draft concise outreach summaries for cross-agency requests.

Rules:
- Do NOT invent facts about other agencies or documents.
- If you don't know, ask for more details or propose safe next steps (who to contact, which document types to request).
- Be concise and format suggested outreach as bullets when requested.
- When referencing documents, cite the filename and agency name.
`;

  const chatMessages = [
    { role: "system", content: systemPrompt },
    // Provide relevant documents as context (if any)
    ...(contextText ? [{ role: "system", content: `RELEVANT_AGENCY_DOCUMENTS:\n${contextText}` }] : []),
    ...messages,
  ];

  const completion = await groq.chat.completions.create({
    model: process.env.CHATBOT_MODEL,
    temperature: 0.2,
    messages: chatMessages,
  });

  return completion.choices[0].message.content;
}
