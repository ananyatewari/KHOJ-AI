import { useTheme } from "../context/ThemeContext";

export default function PDFViewer({
  text = "",
  searchTerm = "",
  entities = {},
}) {
  const { theme } = useTheme();
  function highlightEntities(text, entities) {
    let highlighted = text;

    const wrap = (value, color) =>
      `<mark data-entity="${value}" class="${color} text-black">${value}</mark>`;

    entities.persons?.forEach((p) => {
      highlighted = highlighted.replaceAll(p, wrap(p, "bg-blue-400"));
    });

    entities.places?.forEach((p) => {
      highlighted = highlighted.replaceAll(p, wrap(p, "bg-green-400"));
    });

    entities.dates?.forEach((d) => {
      highlighted = highlighted.replaceAll(d, wrap(d, "bg-purple-400"));
    });

    entities.phoneNumbers?.forEach((n) => {
      highlighted = highlighted.replaceAll(n, wrap(n, "bg-orange-400"));
    });

    entities.organizations?.forEach((o) => {
      highlighted = highlighted.replaceAll(o, wrap(o, "bg-pink-400"));
    });

    return highlighted;
  }

  let highlightedText = highlightEntities(text, entities);

  if (searchTerm) {
    highlightedText = highlightedText.replace(
      new RegExp(searchTerm, "gi"),
      (match) =>
        `<mark class="bg-yellow-300 text-black">${match}</mark>`
    );
  }

  return (
    <div
      id="pdf-scroll-container"
      className={`rounded h-[80vh] overflow-y-scroll p-4 ${
        theme === "dark"
          ? "bg-gray-900 text-white"
          : "bg-white text-slate-800 border border-purple-200"
      }`}
    >
      <h2 className={`text-lg font-semibold mb-2 ${
        theme === "dark" ? "text-white" : "text-slate-800"
      }`}>
        Extracted PDF Text (AI Highlighted)
      </h2>

      <div
        className="whitespace-pre-wrap leading-relaxed"
        dangerouslySetInnerHTML={{ __html: highlightedText }}
      />
    </div>
  );
}
