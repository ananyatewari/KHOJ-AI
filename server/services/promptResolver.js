import PromptTemplate from "../models/PromptTemplate.js";

const DEFAULT_PROMPT = `
You are an intelligence analysis system.
1. Extract names, phone numbers, locations
2. Generate a short neutral summary
3. Return structured output
`;

export async function resolvePrompt({ agency, adminOverride }) {
  if (adminOverride) return adminOverride;

  const agencyTemplate = await PromptTemplate.findOne({ agency });
  if (agencyTemplate) return agencyTemplate.template;

  const fallback = await PromptTemplate.findOne({ isDefault: true });
  return fallback?.template || DEFAULT_PROMPT;
}
