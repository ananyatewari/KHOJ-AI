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
      const response = await axios.get(`/api/cctv/${videoId}/detections`);
      setDetections(response.data);
      setError("");
    } catch (err) {
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">
            Loading detection results...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      </div>
    );
  }

  const { objectDetections, faceDetections, detectionSummary } = detections;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Detection Summary
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {detectionSummary.totalPersons}
            </div>
            <div className="text-sm text-gray-600">Persons</div>
          </div>

          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {detectionSummary.totalVehicles}
            </div>
            <div className="text-sm text-gray-600">Vehicles</div>
          </div>

          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {detectionSummary.uniqueFaces}
            </div>
            <div className="text-sm text-gray-600">Unique Faces</div>
          </div>

          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {detectionSummary.riskScore}
            </div>
            <div className="text-sm text-gray-600">Risk Score</div>
          </div>
        </div>

        {/* Risk Assessment */}
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

      {/* Object Detections */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4 text-gray-800">
          Object Detections
        </h3>

        {objectDetections.length === 0 ? (
          <p className="text-gray-500">No objects detected</p>
        ) : (
          <div className="space-y-4">
            {objectDetections.map((frame, index) => (
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
                  {frame.objects.map((obj, objIndex) => (
                    <div
                      key={objIndex}
                      className="border border-gray-100 rounded p-3 bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize">
                          {obj.label}
                        </span>
                        <span
                          className={`text-sm font-medium ${getConfidenceColor(
                            obj.confidence
                          )}`}
                        >
                          {(obj.confidence * 100).toFixed(1)}%
                        </span>
                      </div>

                      {obj.attributes && (
                        <div className="text-xs text-gray-600 space-y-1">
                          {obj.attributes.size && (
                            <div>
                              Size:{" "}
                              <span className="capitalize">
                                {obj.attributes.size}
                              </span>
                            </div>
                          )}
                          {obj.attributes.type && (
                            <div>
                              Type:{" "}
                              <span className="capitalize">
                                {obj.attributes.type}
                              </span>
                            </div>
                          )}
                          {obj.attributes.direction && (
                            <div>
                              Direction:{" "}
                              <span className="capitalize">
                                {obj.attributes.direction}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Face Detections */}
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

      {/* Export Options */}
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
