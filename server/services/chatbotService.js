import Groq from "groq-sdk";
import dotenv from "dotenv";
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function converseWithChatbot({ messages = [], userContext = {}, contextText = "", sources = [] }) {
  const systemPrompt = `
You are a cross-agency document search assistant. Your job is to provide clear, comprehensive answers based ONLY on the shared documents provided to you.

CRITICAL RULES:
1. ONLY use information from the "RELEVANT_AGENCY_DOCUMENTS" section below
2. DO NOT use external knowledge, internet data, or general knowledge
3. When answering:
   - Provide complete, detailed information from the documents
   - Include all relevant context (who, what, when, where, why)
   - Quote specific details and facts from the documents
   - Always cite the source document (filename and agency)
   - IMPORTANT: At the end of your response, list ONLY the document filenames you actually referenced in your answer using this format:
     SOURCES_USED: filename1.pdf, filename2.pdf
4. If documents contain partial information:
   - Extract and present ALL available details
   - Clearly state what information is present
   - Do NOT say "I could not find" if ANY relevant information exists
5. Response format:
   - Start with a direct answer to the question
   - Provide supporting details from the documents
   - End with document citation
   - List sources used at the very end
6. If NO relevant information exists, say: "No information about [topic] was found in the shared cross-agency documents."

Be thorough, clear, and extract maximum value from the provided document context.
`;

  const chatMessages = [
    { role: "system", content: systemPrompt },
    // Provide relevant documents as context (if any)
    ...(contextText ? [{ role: "system", content: `RELEVANT_AGENCY_DOCUMENTS:\n${contextText}` }] : [{ role: "system", content: "RELEVANT_AGENCY_DOCUMENTS:\n(No documents available)" }]),
    ...messages,
  ];

  const completion = await groq.chat.completions.create({
    model: process.env.CHATBOT_MODEL,
    temperature: 0.2,
    messages: chatMessages,
  });

  const reply = completion.choices[0].message.content;
  
  // Extract sources used from the AI response
  const sourcesUsedMatch = reply.match(/SOURCES_USED:\s*(.+?)(?:\n|$)/i);
  let usedSources = sources;
  
  if (sourcesUsedMatch) {
    const usedFilenames = sourcesUsedMatch[1].split(',').map(f => f.trim().toLowerCase());
    usedSources = sources.filter(source => 
      usedFilenames.some(filename => source.filename.toLowerCase().includes(filename) || filename.includes(source.filename.toLowerCase()))
    );
    // Remove the SOURCES_USED line from the reply
    const cleanReply = reply.replace(/SOURCES_USED:\s*.+?(?:\n|$)/i, '').trim();
    return { reply: cleanReply, usedSources };
  }
  
  return { reply, usedSources };
}
