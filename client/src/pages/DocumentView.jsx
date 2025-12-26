import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

// Entity type colors for visual distinction
const entityColors = {
  persons: "#4f46e5", // Indigo
  places: "#059669", // Emerald
  organizations: "#d97706", // Amber
  phoneNumbers: "#dc2626", // Red
  dates: "#7c3aed" // Purple
};

// Human-readable entity type labels
const entityLabels = {
  persons: "Person",
  places: "Location",
  organizations: "Organization",
  phoneNumbers: "Phone Number",
  dates: "Date"
};

export default function DocumentView() {
  const { id } = useParams();
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
        console.log('Fetching document with ID:', id);
        // Try OCR endpoint first
        try {
          const response = await axios.get(`/api/ocr/${id}`);
          console.log('OCR Document data received:', response.data);
          setDocument(response.data);
          setLoading(false);
        } catch (ocrErr) {
          console.log('OCR endpoint failed, trying document endpoint');
          // Fall back to regular document endpoint
          const docResponse = await axios.get(`/api/document/${id}`);
          console.log('Document data received:', docResponse.data);
          setDocument(docResponse.data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading document:', err);
        setError("Failed to load document. " + (err.response?.data?.error || err.message));
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
      height: box.height * scaleY
    };
  };

  // Helper function to get all entities as a flat array
  const getAllEntities = () => {
    if (!document || !document.entities) return [];
    
    const allEntities = [];
    Object.entries(document.entities).forEach(([type, entities]) => {
      entities.forEach(entity => {
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
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-blue-500">Loading document...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 px-6 py-4 border-b border-gray-700">
        <h1 className="text-xl font-semibold">Document Intelligence Viewer</h1>
        <p className="text-gray-400 text-sm">{document.filename}</p>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden" ref={containerRef}>
        {/* Left panel - Original Image with SVG Overlay */}
        <div className="w-1/2 border-r border-gray-700 relative overflow-auto p-4">
          <h2 className="text-lg font-medium mb-3">Original Document</h2>
          <div className="relative">
            {/* Original Image */}
            {document.originalImage ? (
              <img 
                ref={imageRef}
                src={`http://localhost:3000${document.originalImage}`}
                alt="Original document"
                className="max-w-full"
                onLoad={() => console.log('Image loaded successfully')}
                onError={(e) => {
                  console.error('Image failed to load:', document.originalImage);
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/800x600?text=Document+Preview+Unavailable';
                }}
              />
            ) : (
              <div className="flex items-center justify-center bg-gray-800 p-10 rounded-lg">
                <p className="text-gray-400">Document preview not available</p>
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
                
                const isActive = activeEntity && 
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
                    fill={isActive ? `${entityColors[entity.type]}33` : "transparent"}
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right panel - Text and Entities */}
        <div className="w-1/2 flex flex-col bg-gray-850 overflow-hidden">
          {/* Text Panel */}
          <div className="flex-1 overflow-auto p-4 border-b border-gray-700">
            <h2 className="text-lg font-medium mb-3">Extracted Text</h2>
            <div className="bg-gray-800 p-4 rounded-md whitespace-pre-line font-mono text-sm">
              {document.text}
            </div>
          </div>

          {/* Entity Panel */}
          <div className="h-2/5 overflow-auto p-4">
            <h2 className="text-lg font-medium mb-3">Detected Entities</h2>
            
            {/* Entity Type Sections */}
            <div className="space-y-4">
              {Object.entries(document.entities).map(([type, entities]) => (
                entities.length > 0 && (
                  <div key={type} className="space-y-2">
                    <h3 className="text-md font-medium text-gray-300">
                      {entityLabels[type]} ({entities.length})
                    </h3>
                    
                    <div className="flex flex-wrap gap-2">
                      {entities.map((entity, index) => (
                        <div
                          key={`${type}-${index}`}
                          className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 cursor-pointer transition-all ${
                            activeEntity && activeEntity.text === entity.text && activeEntity.type === type
                              ? "ring-2 ring-opacity-70"
                              : ""
                          }`}
                          style={{
                            backgroundColor: `${entityColors[type]}22`,
                            borderLeft: `3px solid ${entityColors[type]}`,
                            color: "white"
                          }}
                          onMouseEnter={() => handleEntityHover({ ...entity, type })}
                          onMouseLeave={() => handleEntityHover(null)}
                        >
                          <span>{entity.text}</span>
                          
                          {/* Confidence indicator */}
                          <span 
                            className="px-1.5 py-0.5 rounded-full text-xs" 
                            style={{ 
                              backgroundColor: entity.confidence > 0.9 ? "#059669" : 
                                              entity.confidence > 0.7 ? "#d97706" : "#dc2626",
                              opacity: 0.8
                            }}
                          >
                            {Math.round(entity.confidence * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}