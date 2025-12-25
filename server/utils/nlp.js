import nlp from "compromise";

export function extractEntities(text) {
  const doc = nlp(text);

  return {
    persons: doc.people().out("array"),
    places: doc.places().out("array"),
    organizations: doc.organizations().out("array"),

    dates: text.match(
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s[A-Za-z]+\s\d{4})\b/g
    ) || [],

    phoneNumbers: text.match(/\b\d{10}\b/g) || []
  };
}
