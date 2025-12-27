import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import axios from "axios";
import { useTheme } from "../context/ThemeContext";

// Entity type colors for visual distinction
const entityColors = {
  persons: "#4f46e5", // Indigo
  places: "#059669", // Emerald
  organizations: "#d97706", // Amber
  phoneNumbers: "#dc2626", // Red
  dates: "#7c3aed", // Purple
};

// Human-readable entity type labels
const entityLabels = {
  persons: "Person",
  places: "Location",
  organizations: "Organization",
  phoneNumbers: "Phone Number",
  dates: "Date",
};

export default function DocumentView() {
  const { theme } = useTheme();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeEntity, setActiveEntity] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  // Fetch document details
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        console.log("Fetching document with ID:", id);
        // Try OCR endpoint first
        try {
          const response = await axios.get(`/api/ocr/${id}`);
          console.log("OCR Document data received:", response.data);
          setDocument(response.data);
          setLoading(false);
        } catch (ocrErr) {
          console.log("OCR endpoint failed, trying document endpoint");
          // Fall back to regular document endpoint
          const docResponse = await axios.get(`/api/document/${id}`);
          console.log("Document data received:", docResponse.data);
          setDocument(docResponse.data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading document:", err);
        setError(
          "Failed to load document. " +
            (err.response?.data?.error || err.message)
        );
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id]);

  // Update image size when the image loads or window resizes
  useEffect(() => {
    const updateImageSize = () => {
      if (imageRef.current) {
        const { width, height } = imageRef.current.getBoundingClientRect();
        setImageSize({ width, height });
      }
    };

    // Set up event listeners
    window.addEventListener("resize", updateImageSize);

    // Initial update
    if (document && !loading) {
      const img = new Image();
      img.onload = updateImageSize;
      img.src = document.originalImage;
    }

    return () => {
      window.removeEventListener("resize", updateImageSize);
    };
  }, [document, loading]);

  // Scale bounding box coordinates relative to displayed image size
  const scaleBoundingBox = (box) => {
    if (!imageRef.current || !box) return null;

    // Get the natural dimensions of the image (the actual size of the image file)
    const naturalWidth = imageRef.current.naturalWidth;
    const naturalHeight = imageRef.current.naturalHeight;

    // Calculate the scale factors
    const scaleX = imageSize.width / naturalWidth;
    const scaleY = imageSize.height / naturalHeight;

    // Scale the bounding box
    return {
      x: box.x * scaleX,
      y: box.y * scaleY,
      width: box.width * scaleX,
      height: box.height * scaleY,
    };
  };

  const displayEntities = useMemo(() => {
    if (!document) return {};

    const base = document.entities || {};
    const merged = Object.keys(base).reduce((acc, key) => {
      acc[key] = Array.isArray(base[key]) ? [...base[key]] : [];
      return acc;
    }, {});

    const aiInsights = document.aiSummary?.entityInsights || {};
    ["persons", "places", "organizations"].forEach((type) => {
      const insightValues = aiInsights[type];
      if (!insightValues || !insightValues.length) return;

      merged[type] = merged[type] || [];
      const existingTexts = new Set(
        merged[type]
          .map((entry) =>
            typeof entry === "string"
              ? entry.toLowerCase()
              : entry?.text?.toLowerCase()
          )
          .filter(Boolean)
      );

      insightValues.forEach((text) => {
        const normalized = text?.trim();
        if (!normalized) return;
        const key = normalized.toLowerCase();
        if (existingTexts.has(key)) return;

        merged[type].push({
          text: normalized,
          confidence: 0.93,
          source: "ai",
          boundingBox: null,
        });
        existingTexts.add(key);
      });
    });

    return merged;
  }, [document]);

  // Helper function to get all entities as a flat array
  const getAllEntities = () => {
    if (!displayEntities || !Object.keys(displayEntities).length) return [];

    const allEntities = [];
    Object.entries(displayEntities).forEach(([type, entities]) => {
      (entities || []).forEach((entity) => {
        allEntities.push({ ...entity, type });
      });
    });

    return allEntities;
  };

  // Handle entity hover
  const handleEntityHover = (entity) => {
    setActiveEntity(entity ? { ...entity } : null);
  };

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center h-screen ${
          theme === "dark"
            ? "bg-gray-900"
            : "bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50"
        }`}
      >
        <div className="text-blue-500">Loading document...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center justify-center h-screen ${
          theme === "dark"
            ? "bg-gray-900"
            : "bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50"
        }`}
      >
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  const backTarget = location.state?.from || "/app/ocr";
  const backState = location.state?.ocrState || null;

  const handleBack = () => {
    navigate(backTarget, backState ? { state: backState } : undefined);
  };

  return (
    <div
      className={`flex flex-col h-screen ${
        theme === "dark"
          ? "bg-gray-900 text-white"
          : "bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 text-slate-800"
      }`}
    >
      {/* Header */}
      <header
        className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-3 ${
          theme === "dark"
            ? "bg-gray-800 border-gray-700"
            : "bg-white/80 border-purple-200 backdrop-blur-xl shadow-md"
        }`}
      >
        <div>
          <h1
            className={`text-xl font-semibold ${
              theme === "dark" ? "text-white" : "text-slate-800"
            }`}
          >
            Document Intelligence Viewer
          </h1>
          <p
            className={`text-sm ${
              theme === "dark" ? "text-gray-400" : "text-slate-600"
            }`}
          >
            {document.filename}
          </p>
        </div>
        <button
          onClick={handleBack}
          className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition ${
            theme === "dark"
              ? "bg-gray-700 hover:bg-gray-600 text-white"
              : "bg-purple-600 hover:bg-purple-700 text-white shadow-md"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to OCR Workspace
        </button>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden" ref={containerRef}>
        {/* Left panel - Original Image with SVG Overlay */}
        <div
          className={`w-1/2 border-r relative overflow-auto p-4 custom-scrollbar ${
            theme === "dark" ? "border-gray-700" : "border-purple-200"
          }`}
        >
          <h2
            className={`text-lg font-medium mb-3 ${
              theme === "dark" ? "text-white" : "text-slate-800"
            }`}
          >
            Original Document
          </h2>
          <div className="relative">
            {/* Original Image */}
            {document.originalImage ? (
              <img
                ref={imageRef}
                src={`http://localhost:3000${document.originalImage}`}
                alt="Original document"
                className="max-w-full"
                onLoad={() => console.log("Image loaded successfully")}
                onError={(e) => {
                  console.error(
                    "Image failed to load:",
                    document.originalImage
                  );
                  e.target.onerror = null;
                  e.target.src =
                    "https://via.placeholder.com/800x600?text=Document+Preview+Unavailable";
                }}
              />
            ) : (
              <div
                className={`flex items-center justify-center p-10 rounded-lg ${
                  theme === "dark"
                    ? "bg-gray-800"
                    : "bg-white/80 border border-purple-200"
                }`}
              >
                <p
                  className={
                    theme === "dark" ? "text-gray-400" : "text-slate-600"
                  }
                >
                  Document preview not available
                </p>
              </div>
            )}

            {/* SVG Overlay for bounding boxes */}
            <svg
              ref={svgRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
              style={{ width: imageSize.width, height: imageSize.height }}
            >
              {getAllEntities().map((entity, index) => {
                const box = scaleBoundingBox(entity.boundingBox);
                if (!box) return null;

                const isActive =
                  activeEntity &&
                  activeEntity.text === entity.text &&
                  activeEntity.type === entity.type;

                return (
                  <rect
                    key={`box-${index}`}
                    x={box.x}
                    y={box.y}
                    width={box.width}
                    height={box.height}
                    stroke={entityColors[entity.type] || "#ffffff"}
                    strokeWidth={isActive ? "3" : "1"}
                    fill={
                      isActive
                        ? `${entityColors[entity.type]}33`
                        : "transparent"
                    }
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right panel - Text and Entities */}
        <div
          className={`w-1/2 flex flex-col overflow-hidden ${
            theme === "dark" ? "bg-gray-850" : "bg-white/60"
          }`}
        >
          {/* Text Panel */}
          <div
            className={`flex-1 overflow-auto p-4 border-b custom-scrollbar ${
              theme === "dark" ? "border-gray-700" : "border-purple-200"
            }`}
          >
            <h2
              className={`text-lg font-medium mb-3 ${
                theme === "dark" ? "text-white" : "text-slate-800"
              }`}
            >
              Extracted Text
            </h2>
            <div
              className={`p-4 rounded-md whitespace-pre-line font-mono text-sm ${
                theme === "dark"
                  ? "bg-gray-800 text-white"
                  : "bg-white border border-purple-200 text-slate-800 shadow-sm"
              }`}
            >
              {document.text}
            </div>
          </div>

          {/* Entity Panel */}
          <div className="h-2/5 overflow-auto p-4 custom-scrollbar">
            <h2
              className={`text-lg font-medium mb-3 ${
                theme === "dark" ? "text-white" : "text-slate-800"
              }`}
            >
              Detected Entities
            </h2>

            {/* Entity Type Sections */}
            <div className="space-y-4">
              {Object.entries(displayEntities).map(
                ([type, entities]) =>
                  entities.length > 0 && (
                    <div key={type} className="space-y-2">
                      <h3
                        className={`text-md font-medium ${
                          theme === "dark" ? "text-gray-300" : "text-slate-700"
                        }`}
                      >
                        {entityLabels[type]} ({entities.length})
                      </h3>

                      <div className="flex flex-wrap gap-2">
                        {entities.map((entity, index) => (
                          <div
                            key={`${type}-${index}`}
                            className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 cursor-pointer transition-all ${
                              activeEntity &&
                              activeEntity.text === entity.text &&
                              activeEntity.type === type
                                ? "ring-2 ring-opacity-70"
                                : ""
                            }`}
                            style={{
                              backgroundColor: `${entityColors[type]}22`,
                              borderLeft: `3px solid ${entityColors[type]}`,
                              color: "white",
                            }}
                            onMouseEnter={() =>
                              handleEntityHover({ ...entity, type })
                            }
                            onMouseLeave={() => handleEntityHover(null)}
                          >
                            <span>{entity.text}</span>

                            {/* Confidence indicator */}
                            <span
                              className="px-1.5 py-0.5 rounded-full text-xs"
                              style={{
                                backgroundColor:
                                  entity.confidence > 0.9
                                    ? "#059669"
                                    : entity.confidence > 0.7
                                    ? "#d97706"
                                    : "#dc2626",
                                opacity: 0.8,
                              }}
                            >
                              {Math.round(entity.confidence * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
