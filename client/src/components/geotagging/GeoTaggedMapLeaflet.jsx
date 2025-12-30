import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import {
  MapPin,
  X,
  FileText,
  Calendar,
  Building,
  ExternalLink,
  Navigation,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const createCustomIcon = (count) => {
  const size = count >= 5 ? 35 : count >= 3 ? 30 : 25;
  const color = "#ef4444";

  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${size >= 35 ? "14px" : size >= 30 ? "12px" : "10px"};
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: all 0.2s ease;
      " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
        ${count}
      </div>
    `,
    className: "custom-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

function MapBounds({ locations }) {
  const map = useMap();
  useEffect(() => {
    if (locations && locations.length > 0) {
      const bounds = L.latLngBounds(locations.map((loc) => [loc.lat, loc.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.fitBounds(
        [
          [6.5, 68.0],
          [37.0, 97.5],
        ],
        { padding: [20, 20] }
      );
    }
  }, [locations, map]);

  return null;
}

export default function GeoTaggedMapLeaflet({
  documents,
  theme,
  onDocumentClick,
}) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [locations, setLocations] = useState([]);
  const [geocodingCache, setGeocodingCache] = useState({});

  // Function to geocode location using OpenStreetMap Nominatim API (free)
  const geocodeLocation = async (locationName) => {
    // Check cache first
    if (geocodingCache[locationName]) {
      return geocodingCache[locationName];
    }

    try {
      // Add "India" to improve geocoding accuracy for Indian locations
      const query = `${locationName}, India`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&limit=1`,
        {
          headers: {
            "User-Agent": "KHOJ-AI Geotagging System", // Required by Nominatim
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          const result = data[0];
          const locationData = {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
            label: locationName,
            displayName: result.display_name,
          };

          // Cache the result
          setGeocodingCache((prev) => ({
            ...prev,
            [locationName]: locationData,
          }));

          return locationData;
        }
      }
    } catch (error) {
      console.warn(`Failed to geocode location: ${locationName}`, error);
    }

    return null;
  };

  const processDocuments = async () => {
    const locationMap = new Map();
    const uniquePlaces = new Set();

    // Extract all unique places from documents
    documents.forEach((doc) => {
      if (
        doc.entities &&
        doc.entities.places &&
        doc.entities.places.length > 0
      ) {
        doc.entities.places.forEach((place) => {
          const normalizedPlace = place.toLowerCase().trim();
          if (normalizedPlace.length > 2) {
            // Filter out very short strings
            uniquePlaces.add(normalizedPlace);
          }
        });
      }
    });

    // Geocode all unique places in parallel (with rate limiting)
    const geocodedLocations = await Promise.allSettled(
      Array.from(uniquePlaces).map(async (place) => {
        const locationData = await geocodeLocation(place);
        if (locationData) {
          return { ...locationData, originalName: place };
        }
        return null;
      })
    );

    // Process successful geocoding results
    geocodedLocations.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value) {
        const locationData = result.value;
        const originalPlace = Array.from(uniquePlaces)[index];

        // Find all documents that mention this place
        const matchingDocs = documents.filter((doc) =>
          doc.entities?.places?.some(
            (place) => place.toLowerCase().trim() === originalPlace
          )
        );

        if (matchingDocs.length > 0) {
          const locationKey = locationData.label;

          if (!locationMap.has(locationKey)) {
            locationMap.set(locationKey, {
              lat: locationData.lat,
              lng: locationData.lng,
              label: locationData.label,
              displayName: locationData.displayName,
              documents: [],
              count: 0,
            });
          }

          const location = locationMap.get(locationKey);
          location.documents.push(...matchingDocs);
          location.count += matchingDocs.length;
        }
      }
    });

    return Array.from(locationMap.values());
  };

  const openGoogleMaps = (location) => {
    const query = encodeURIComponent(`${location.label}, India`);
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
    window.open(googleMapsUrl, "_blank");
  };

  useEffect(() => {
    const processDocumentsAsync = async () => {
      setMapLoaded(false);
      const processedLocations = await processDocuments();
      setLocations(processedLocations);
      setMapLoaded(true);
    };

    if (documents.length > 0) {
      processDocumentsAsync();
    } else {
      setLocations([]);
      setMapLoaded(true);
    }
  }, [documents, geocodingCache]);

  if (!mapLoaded) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={`relative rounded-xl overflow-hidden border ${
          theme === "dark"
            ? "bg-slate-800 border-slate-700"
            : "bg-white border-gray-200"
        }`}
      >
        <div className="absolute top-4 right-4 z-10 bg-white dark:bg-slate-800 rounded-lg p-3 shadow-lg border border-gray-200 dark:border-slate-700">
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

        <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-slate-800 rounded-lg p-3 shadow-lg border border-gray-200 dark:border-slate-700">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <span className="font-semibold">{locations.length}</span> locations
            •
            <span className="font-semibold ml-1">
              {documents.filter((d) => d.entities?.places?.length > 0).length}
            </span>{" "}
            case documents
          </div>
        </div>

        <div className="h-96">
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: "100%", width: "100%" }}
            className="rounded-lg"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            <MapBounds locations={locations} />

            {locations.map((location, idx) => (
              <Marker
                key={idx}
                position={[location.lat, location.lng]}
                icon={createCustomIcon(location.count)}
                eventHandlers={{
                  click: () => setSelectedLocation(location),
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-sm mb-1">
                      {location.label}
                    </h3>
                    <p className="text-xs text-gray-600 mb-2">
                      {location.count} document{location.count !== 1 ? "s" : ""}{" "}
                      with location references
                    </p>

                    <button
                      onClick={() => openGoogleMaps(location)}
                      className="w-full mb-2 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition"
                    >
                      <Navigation className="w-3 h-3" />
                      Open in Google Maps
                    </button>

                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {location.documents.slice(0, 3).map((doc, docIdx) => (
                        <div
                          key={docIdx}
                          className={`p-2 ${
                            theme === "dark" ? "bg-gray-50" : "bg-gray-100"
                          }`}
                          onClick={() => {
                            onDocumentClick(doc);
                            setSelectedLocation(null);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3 text-blue-600" />
                            <span className="text-xs font-medium truncate">
                              {doc.filename}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {doc.agency} •{" "}
                            {new Date(doc.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                      {location.documents.length > 3 && (
                        <div className="text-xs text-gray-500 text-center p-1">
                          +{location.documents.length - 3} more documents
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {selectedLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className={`max-w-2xl w-full max-h-[80vh] overflow-hidden rounded-xl shadow-2xl ${
              theme === "dark" ? "bg-slate-800" : "bg-white"
            }`}
          >
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
