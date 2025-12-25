export async function processWithAI(prompt, content) {
  return {
    summary: content.slice(0, 120),
    entities: {
      names: [],
      phones: [],
      locations: []
    }
  };
}
