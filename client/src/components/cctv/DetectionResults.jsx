import React, { useState, useEffect } from "react";
import axios from "axios";

const DetectionResults = ({ videoId, user }) => {
  const [detections, setDetections] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFrame, setSelectedFrame] = useState(null);

  useEffect(() => {
    fetchDetections();
  }, [videoId]);

  const fetchDetections = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`/api/cctv/${videoId}/detections`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setDetections(response.data);
      setError("");
    } catch (err) {
      console.error('Error fetching detections:', err);
      setError(err.response?.data?.error || "Failed to fetch detections");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (score) => {
    if (score >= 70) return "text-red-600 bg-red-100";
    if (score >= 40) return "text-orange-600 bg-orange-100";
    if (score >= 20) return "text-yellow-600 bg-yellow-100";
    return "text-green-600 bg-green-100";
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const formatTimestamp = (timestamp) => {
    const minutes = Math.floor(timestamp / 60);
    const seconds = Math.floor(timestamp % 60);
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">
            Loading detection results...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      </div>
    );
  }

  const { objectDetections = [], faceDetections = [], detectionSummary = {} } = detections || {};

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
          Detection Summary
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {detectionSummary.totalPersons || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Peak Persons</div>
            {detectionSummary.avgPersonsPerFrame > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Avg: {detectionSummary.avgPersonsPerFrame}/frame
              </div>
            )}
          </div>

          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {detectionSummary.totalVehicles || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Peak Vehicles</div>
            {detectionSummary.avgVehiclesPerFrame > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Avg: {detectionSummary.avgVehiclesPerFrame}/frame
              </div>
            )}
          </div>

          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {detectionSummary.totalFrames || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Frames Analyzed</div>
            {detectionSummary.framesWithDetections > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {detectionSummary.framesWithDetections} with objects
              </div>
            )}
          </div>

          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {detectionSummary.riskScore || 0}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Risk Score</div>
          </div>
        </div>
        
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Note:</strong> Counts show the <strong>peak number</strong> of objects detected in any single frame. 
            For a {detectionSummary.totalFrames || 0}-frame video, this represents the maximum simultaneous presence, not total across all frames.
          </p>
        </div>

        <div
          className={`p-4 rounded-lg ${getSeverityColor(
            detectionSummary.riskScore
          )}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Risk Assessment</h3>
              <p className="text-sm opacity-75">
                {detectionSummary.suspiciousActivity
                  ? "Suspicious activity detected"
                  : "No suspicious activity detected"}
              </p>
            </div>
            <div className="text-2xl font-bold">
              {detectionSummary.riskScore}/100
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
          Frame-by-Frame Detections
        </h3>

        {objectDetections.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No objects detected</p>
        ) : (
          <div className="space-y-3">
            {objectDetections.map((frame, index) => {
              const objectCounts = {};
              frame.objects.forEach(obj => {
                const label = obj.label || obj.class || 'unknown';
                if (!objectCounts[label]) {
                  objectCounts[label] = { count: 0, avgConfidence: 0, confidences: [] };
                }
                objectCounts[label].count++;
                objectCounts[label].confidences.push(obj.confidence);
              });
              
              Object.keys(objectCounts).forEach(label => {
                const confidences = objectCounts[label].confidences;
                objectCounts[label].avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
              });

              return (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow dark:bg-gray-700/50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-gray-800 dark:text-white">Frame {frame.frameNumber}</h4>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {frame.objects.length} object{frame.objects.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatTimestamp(frame.timestamp)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Object.entries(objectCounts).map(([label, data]) => (
                      <div
                        key={label}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200"
                      >
                        <span className="text-lg">
                          {label.toLowerCase().includes('person') ? '👤' :
                           label.toLowerCase().includes('car') ? '🚗' :
                           label.toLowerCase().includes('truck') ? '🚚' :
                           label.toLowerCase().includes('bus') ? '🚌' :
                           label.toLowerCase().includes('motorcycle') || label.toLowerCase().includes('bike') ? '🏍️' :
                           label.toLowerCase().includes('chair') ? '🪑' :
                           label.toLowerCase().includes('laptop') ? '💻' :
                           label.toLowerCase().includes('phone') || label.toLowerCase().includes('cell') ? '📱' :
                           label.toLowerCase().includes('bottle') ? '🍾' :
                           label.toLowerCase().includes('cup') ? '☕' :
                           label.toLowerCase().includes('backpack') ? '🎒' :
                           label.toLowerCase().includes('handbag') ? '👜' :
                           label.toLowerCase().includes('dog') ? '🐕' :
                           label.toLowerCase().includes('cat') ? '🐈' :
                           '📦'}
                        </span>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800 capitalize">
                              {data.count}x {label}
                            </span>
                            <span
                              className={`text-xs font-semibold ${getConfidenceColor(data.avgConfidence)}`}
                            >
                              {(data.avgConfidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {frame.objects.length > 5 && (
                    <details className="mt-3">
                      <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                        View all {frame.objects.length} detections
                      </summary>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {frame.objects.map((obj, objIndex) => (
                          <div
                            key={objIndex}
                            className="text-xs px-2 py-1 bg-gray-50 rounded border border-gray-200"
                          >
                            <span className="capitalize">{obj.label}</span>
                            <span className={`ml-1 ${getConfidenceColor(obj.confidence)}`}>
                              {(obj.confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800">
          Face Detections
        </h3>

        {faceDetections.length === 0 ? (
          <p className="text-gray-500">No faces detected</p>
        ) : (
          <div className="space-y-4">
            {faceDetections.map((frame, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Frame {frame.frameNumber}</h4>
                  <span className="text-sm text-gray-500">
                    {formatTimestamp(frame.timestamp)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {frame.faces.map((face, faceIndex) => (
                    <div
                      key={faceIndex}
                      className="border border-gray-100 rounded p-3 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {face.matchedPerson === "unknown"
                            ? "Unknown Person"
                            : face.matchedPerson}
                        </span>
                        <span
                          className={`text-sm font-medium ${getConfidenceColor(
                            face.confidence
                          )}`}
                        >
                          {(face.confidence * 100).toFixed(1)}%
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 space-y-1">
                        <div>Face ID: {face.faceId}</div>
                        {face.matchedPerson !== "unknown" && (
                          <div>
                            Match: {(face.matchConfidence * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Export Options</h3>

        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Export PDF Report
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
            Export JSON Data
          </button>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors">
            Share with Other Agencies
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetectionResults;
