import { useState, useEffect } from "react";
import {
  MapPin,
  X,
  FileText,
  Calendar,
  Building,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";

export default function GeoTaggedMap({ documents, theme, onDocumentClick }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // India coordinates and major cities
  const indiaBounds = {
    north: 37.6,
    south: 6.8,
    east: 97.4,
    west: 68.7,
  };

  // Major Indian cities with coordinates
  const cityCoordinates = {
    delhi: { lat: 28.6139, lng: 77.209, label: "Delhi" },
    mumbai: { lat: 19.076, lng: 72.8777, label: "Mumbai" },
    bangalore: { lat: 12.9716, lng: 77.5946, label: "Bangalore" },
    chennai: { lat: 13.0827, lng: 80.2707, label: "Chennai" },
    kolkata: { lat: 22.5726, lng: 88.3639, label: "Kolkata" },
    hyderabad: { lat: 17.385, lng: 78.4867, label: "Hyderabad" },
    pune: { lat: 18.5204, lng: 73.8567, label: "Pune" },
    ahmedabad: { lat: 23.0225, lng: 72.5714, label: "Ahmedabad" },
    jaipur: { lat: 26.9124, lng: 75.7873, label: "Jaipur" },
    lucknow: { lat: 26.8467, lng: 80.9462, label: "Lucknow" },
    chandigarh: { lat: 30.7333, lng: 76.7794, label: "Chandigarh" },
    guwahati: { lat: 26.1445, lng: 91.7898, label: "Guwahati" },
    bhopal: { lat: 23.2599, lng: 77.4126, label: "Bhopal" },
    indore: { lat: 22.7196, lng: 75.8577, label: "Indore" },
    cochin: { lat: 9.9312, lng: 76.2673, label: "Cochin" },
    trivandrum: { lat: 8.4855, lng: 76.9493, label: "Trivandrum" },
    vizag: { lat: 17.6868, lng: 83.2185, label: "Visakhapatnam" },
    nagpur: { lat: 21.1458, lng: 79.0882, label: "Nagpur" },
    patna: { lat: 25.5941, lng: 85.1376, label: "Patna" },
    ranchi: { lat: 23.3441, lng: 85.3096, label: "Ranchi" },
    dehradun: { lat: 30.3165, lng: 78.0322, label: "Dehradun" },
    shimla: { lat: 31.1048, lng: 77.1734, label: "Shimla" },
    jammu: { lat: 32.7266, lng: 74.857, label: "Jammu" },
    srinagar: { lat: 34.0837, lng: 74.7973, label: "Srinagar" },
    goa: { lat: 15.2993, lng: 74.124, label: "Goa" },
    agra: { lat: 27.1767, lng: 78.0081, label: "Agra" },
    varanasi: { lat: 25.3176, lng: 82.9739, label: "Varanasi" },
    kanpur: { lat: 26.4499, lng: 80.3319, label: "Kanpur" },
    surat: { lat: 21.1702, lng: 72.8311, label: "Surat" },
    "indian states": { lat: 22.0, lng: 77.0, label: "Various States" },
  };

  // Process documents to extract locations
  const processDocuments = () => {
    const locationMap = new Map();

    documents.forEach((doc) => {
      if (
        doc.entities &&
        doc.entities.places &&
        doc.entities.places.length > 0
      ) {
        doc.entities.places.forEach((place) => {
          const normalizedPlace = place.toLowerCase().trim();

          // Find matching city
          let matchedCity = null;
          for (const [cityKey, coords] of Object.entries(cityCoordinates)) {
            if (
              normalizedPlace.includes(cityKey) ||
              cityKey.includes(normalizedPlace)
            ) {
              matchedCity = { ...coords, actualName: place };
              break;
            }
          }

          if (matchedCity) {
            if (!locationMap.has(matchedCity.label)) {
              locationMap.set(matchedCity.label, {
                ...matchedCity,
                documents: [],
                count: 0,
              });
            }

            const location = locationMap.get(matchedCity.label);
            location.documents.push(doc);
            location.count++;
          }
        });
      }
    });

    return Array.from(locationMap.values());
  };

  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const processedLocations = processDocuments();
    setLocations(processedLocations);
    setMapLoaded(true);
  }, [documents]);

  const getMarkerColor = (count) => {
    // Always use red for document cases regardless of count
    return "#ef4444"; // red for all case documents
  };

  const getMarkerSize = (count) => {
    // Size markers based on document count for better visibility
    if (count >= 5) return 4;
    if (count >= 3) return 3;
    return 2.5;
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleReset = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  if (!mapLoaded) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div
        className={`relative rounded-xl overflow-hidden border ${
          theme === "dark"
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-gray-200"
        }`}
      >
        {/* Zoom Controls */}
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 p-1">
            <button
              onClick={handleZoomIn}
              className={`p-2 rounded transition ${
                theme === "dark"
                  ? "hover:bg-slate-700 text-gray-300"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className={`p-2 rounded transition ${
                theme === "dark"
                  ? "hover:bg-slate-700 text-gray-300"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className={`p-2 rounded transition ${
                theme === "dark"
                  ? "hover:bg-slate-700 text-gray-300"
                  : "hover:bg-gray-100 text-gray-600"
              }`}
              title="Reset View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div
              className={`text-xs text-center font-medium px-2 py-1 border-t ${
                theme === "dark"
                  ? "border-slate-600 text-gray-300"
                  : "border-gray-200 text-gray-600"
              }`}
            >
              {Math.round(zoomLevel * 100)}%
            </div>
          </div>
        </div>

        {/* Simple SVG Map of India */}
        <div className="relative h-96 bg-gradient-to-br from-blue-50 to-green-50 dark:from-slate-800 dark:to-slate-700 overflow-hidden">
          <div
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: "center",
              transition: "transform 0.2s ease-in-out",
            }}
          >
            <svg
              viewBox="0 0 140 120"
              className="w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Proper India outline - full map */}
              <g>
                {/* Main landmass - adjusted for full India */}
                <path
                  d="M 45 25 L 55 15 L 70 10 L 85 12 L 95 18 L 105 25 L 110 35 L 108 45 L 100 55 L 90 65 L 80 72 L 70 78 L 60 82 L 50 80 L 40 75 L 32 65 L 28 55 L 30 45 L 35 35 Z"
                  fill={theme === "dark" ? "#475569" : "#e2e8f0"}
                  stroke={theme === "dark" ? "#64748b" : "#94a3b8"}
                  strokeWidth="1.2"
                />

                {/* Top protrusion (Jammu & Kashmir) */}
                <path
                  d="M 55 15 L 60 5 L 70 2 L 75 8 L 70 15 Z"
                  fill={theme === "dark" ? "#475569" : "#e2e8f0"}
                  stroke={theme === "dark" ? "#64748b" : "#94a3b8"}
                  strokeWidth="1.2"
                />

                {/* Northeast states */}
                <path
                  d="M 105 35 L 115 30 L 120 38 L 115 45 L 105 42 Z"
                  fill={theme === "dark" ? "#475569" : "#e2e8f0"}
                  stroke={theme === "dark" ? "#64748b" : "#94a3b8"}
                  strokeWidth="1.2"
                />

                {/* South tip (Tamil Nadu/Kerala) */}
                <path
                  d="M 70 78 L 72 90 L 65 95 L 60 88 L 65 78 Z"
                  fill={theme === "dark" ? "#475569" : "#e2e8f0"}
                  stroke={theme === "dark" ? "#64748b" : "#94a3b8"}
                  strokeWidth="1.2"
                />

                {/* West protrusion (Gujarat) */}
                <path
                  d="M 28 45 L 20 40 L 18 50 L 25 55 L 32 52 Z"
                  fill={theme === "dark" ? "#475569" : "#e2e8f0"}
                  stroke={theme === "dark" ? "#64748b" : "#94a3b8"}
                  strokeWidth="1.2"
                />

                {/* East protrusion (West Bengal/Bangladesh region) */}
                <path
                  d="M 108 55 L 118 52 L 122 60 L 115 68 L 105 65 Z"
                  fill={theme === "dark" ? "#475569" : "#e2e8f0"}
                  stroke={theme === "dark" ? "#64748b" : "#94a3b8"}
                  strokeWidth="1.2"
                />

                {/* Additional regions for better coverage */}
                {/* Rajasthan extension */}
                <path
                  d="M 35 35 L 45 30 L 50 40 L 40 45 Z"
                  fill={theme === "dark" ? "#475569" : "#e2e8f0"}
                  stroke={theme === "dark" ? "#64748b" : "#94a3b8"}
                  strokeWidth="1"
                />

                {/* Central India */}
                <path
                  d="M 60 45 L 75 40 L 80 55 L 65 60 Z"
                  fill={theme === "dark" ? "#5a6478" : "#d8e0e8"}
                  stroke={theme === "dark" ? "#64748b" : "#94a3b8"}
                  strokeWidth="1"
                />
              </g>

              {/* Location markers */}
              {locations.map((location, idx) => {
                // Better coordinate mapping for India
                let x, y;

                // Major city coordinates mapped to SVG - updated for full India map
                const cityMap = {
                  delhi: { x: 70, y: 35 },
                  mumbai: { x: 45, y: 65 },
                  bangalore: { x: 60, y: 85 },
                  chennai: { x: 75, y: 88 },
                  kolkata: { x: 105, y: 55 },
                  hyderabad: { x: 65, y: 75 },
                  pune: { x: 50, y: 70 },
                  ahmedabad: { x: 35, y: 60 },
                  jaipur: { x: 65, y: 45 },
                  lucknow: { x: 85, y: 45 },
                  chandigarh: { x: 70, y: 30 },
                  guwahati: { x: 115, y: 50 },
                  bhopal: { x: 65, y: 55 },
                  indore: { x: 55, y: 60 },
                  cochin: { x: 70, y: 92 },
                  trivandrum: { x: 68, y: 95 },
                  vizag: { x: 90, y: 70 },
                  nagpur: { x: 75, y: 60 },
                  patna: { x: 95, y: 48 },
                  ranchi: { x: 85, y: 60 },
                  dehradun: { x: 72, y: 28 },
                  shimla: { x: 70, y: 25 },
                  jammu: { x: 65, y: 20 },
                  srinagar: { x: 60, y: 15 },
                  goa: { x: 55, y: 80 },
                  agra: { x: 75, y: 38 },
                  varanasi: { x: 90, y: 52 },
                  kanpur: { x: 80, y: 40 },
                  surat: { x: 40, y: 72 },
                  "indian states": { x: 70, y: 60 },
                };

                const mappedCity =
                  cityMap[location.label.toLowerCase()] ||
                  cityMap["indian states"];
                x = mappedCity.x;
                y = mappedCity.y;

                return (
                  <g key={idx}>
                    <circle
                      cx={x}
                      cy={y}
                      r={getMarkerSize(location.count)}
                      fill={getMarkerColor(location.count)}
                      stroke="white"
                      strokeWidth="0.8"
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedLocation(location)}
                    />
                    <text
                      x={x}
                      y={y - 4}
                      fontSize="2"
                      fill={theme === "dark" ? "#f1f5f9" : "#1e293b"}
                      textAnchor="middle"
                      className="pointer-events-none font-medium"
                    >
                      {location.label.length > 8
                        ? location.label.slice(0, 6) + "..."
                        : location.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="absolute top-4 right-4 bg-white dark:bg-slate-800 rounded-lg p-3 shadow-lg border border-gray-200 dark:border-slate-700">
            <h4 className="text-xs font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Case Documents
            </h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  All Case Locations
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Single Case
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-600"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Multiple Cases
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="absolute bottom-4 left-4 bg-white dark:bg-slate-800 rounded-lg p-3 shadow-lg border border-gray-200 dark:border-slate-700">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              <span className="font-semibold">{locations.length}</span>{" "}
              locations •
              <span className="font-semibold ml-1">
                {documents.filter((d) => d.entities?.places?.length > 0).length}
              </span>{" "}
              case documents
            </div>
          </div>
        </div>
      </div>

      {/* Location Details Modal */}
      {selectedLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className={`max-w-2xl w-full max-h-[80vh] overflow-hidden rounded-xl shadow-2xl ${
              theme === "dark" ? "bg-slate-800" : "bg-white"
            }`}
          >
            {/* Header */}
            <div
              className={`p-6 border-b ${
                theme === "dark" ? "border-slate-700" : "border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MapPin
                    className={`w-5 h-5 ${
                      theme === "dark" ? "text-blue-400" : "text-blue-600"
                    }`}
                  />
                  <div>
                    <h3
                      className={`text-lg font-semibold ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {selectedLocation.label}
                    </h3>
                    <p
                      className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      {selectedLocation.count} document
                      {selectedLocation.count !== 1 ? "s" : ""} with location
                      references
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLocation(null)}
                  className={`p-2 rounded-lg transition ${
                    theme === "dark"
                      ? "hover:bg-slate-700 text-gray-400"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Documents List */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <div className="space-y-3">
                {selectedLocation.documents.map((doc, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border cursor-pointer transition ${
                      theme === "dark"
                        ? "bg-slate-700/50 border-slate-600 hover:border-blue-500/50"
                        : "bg-gray-50 border-gray-200 hover:border-blue-400"
                    }`}
                    onClick={() => {
                      onDocumentClick(doc);
                      setSelectedLocation(null);
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText
                            className={`w-4 h-4 ${
                              theme === "dark"
                                ? "text-blue-400"
                                : "text-blue-600"
                            }`}
                          />
                          <h4
                            className={`font-medium ${
                              theme === "dark" ? "text-white" : "text-gray-900"
                            }`}
                          >
                            {doc.filename}
                          </h4>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <div className="flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            <span>{doc.agency}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(doc.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        {doc.entities?.places && (
                          <div className="flex flex-wrap gap-1">
                            {doc.entities.places
                              .slice(0, 3)
                              .map((place, placeIdx) => (
                                <span
                                  key={placeIdx}
                                  className={`px-2 py-1 text-xs rounded-full ${
                                    theme === "dark"
                                      ? "bg-blue-500/20 text-blue-300"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {place}
                                </span>
                              ))}
                            {doc.entities.places.length > 3 && (
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  theme === "dark"
                                    ? "bg-gray-500/20 text-gray-300"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                +{doc.entities.places.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                          theme === "dark"
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                        }`}
                      >
                        View Document
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
