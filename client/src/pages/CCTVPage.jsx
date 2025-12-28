import React, { useState, useEffect } from "react";
import CCTVUpload from "../components/cctv/CCTVUpload.jsx";
import DetectionResults from "../components/cctv/DetectionResults.jsx";
import FrameExtractor from "../components/cctv/FrameExtractor.jsx";
import axios from "axios";
import { getCCTVVideos } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { detectObjects } from "../utils/roboflow.js";

const CCTVPage = ({}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("upload");
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processingFrames, setProcessingFrames] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const data = await getCCTVVideos();
      setVideos(data.videos || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (uploadData) => {
    console.log("Upload successful:", uploadData);
    fetchVideos();
    setActiveTab("library");
  };

  const handleVideoSelect = (video) => {
    setSelectedVideo(video);
    setActiveTab("results");
  };

  const handleFramesExtracted = async (extractedFrames) => {
    setProcessingFrames(true);

    const detections = [];
    for (const frame of extractedFrames) {
      const result = await detectObjects(frame.blob);
      detections.push({
        frameNumber: frame.frameNumber,
        timestamp: frame.timestamp,
        objects: result.predictions || [],
      });
    }

    // Send detections to backend
    await fetch(`/api/cctv/${selectedVideo._id}/detections`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ detections }),
    });

    setProcessingFrames(false);
    fetchVideos(); // Refresh to update status
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "processing":
        return "text-yellow-600 bg-yellow-100";
      case "failed":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">CCTV Analysis</h1>
          <p className="text-gray-600 mt-2">
            Upload and analyze CCTV footage for object detection and suspicious
            activity
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("upload")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "upload"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Upload Video
            </button>

            <button
              onClick={() => setActiveTab("library")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "library"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Video Library ({videos.length})
            </button>

            {selectedVideo && (
              <button
                onClick={() => setActiveTab("results")}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "results"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Detection Results
              </button>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "upload" && (
            <CCTVUpload user={user} onUploadSuccess={handleUploadSuccess} />
          )}
          {activeTab === "library" && (
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800">
                  Video Library
                </h2>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">
                      Loading videos...
                    </span>
                  </div>
                ) : videos.length === 0 ? (
                  <div className="text-center py-8">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="mt-2 text-gray-500">No videos uploaded yet</p>
                    <button
                      onClick={() => setActiveTab("upload")}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Upload First Video
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Video
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Camera Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Duration
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Risk Score
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {videos.map((video) => (
                          <tr key={video._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <svg
                                      className="h-6 w-6 text-gray-400"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                      />
                                    </svg>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {video.originalName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {formatFileSize(
                                      video.videoMetadata?.size || 0
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {video.cameraInfo?.location || "Unknown"}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {video.videoMetadata?.duration
                                ? formatDuration(video.videoMetadata.duration)
                                : "Unknown"}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                  video.processingStatus
                                )}`}
                              >
                                {video.processingStatus}
                              </span>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {video.detectionSummary?.riskScore || 0}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {video.processingStatus === "uploaded" && (
                                <button
                                  onClick={() => setSelectedVideo(video)}
                                  className="text-green-600 hover:text-green-900 mr-3"
                                >
                                  Extract Frames
                                </button>
                              )}
                              <button
                                onClick={() => handleVideoSelect(video)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                                disabled={
                                  video.processingStatus !== "completed"
                                }
                              >
                                View Results
                              </button>
                              <button className="text-red-600 hover:text-red-900">
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Frame Extractor for selected video */}
          {selectedVideo && selectedVideo.processingStatus === "uploaded" && (
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">
                Extract Frames & Analyze: {selectedVideo.originalName}
              </h3>
              <div className="text-sm text-gray-600 mb-4">
                Note: You need to re-upload the video file to extract frames
                since the file is not stored in the browser after upload.
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    if (e.target.files[0]) {
                      const file = e.target.files[0];
                      if (file.name === selectedVideo.originalName) {
                        // Create a temporary FrameExtractor with this file
                        const tempVideo = { ...selectedVideo, file };
                        setSelectedVideo(tempVideo);
                      } else {
                        alert(
                          "Please select the same video file: " +
                            selectedVideo.originalName
                        );
                      }
                    }
                  }}
                  className="hidden"
                  id="file-reupload"
                />
                <label htmlFor="file-reupload" className="cursor-pointer">
                  <div className="text-gray-400">
                    <svg
                      className="mx-auto h-12 w-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    Click to select the video file: {selectedVideo.originalName}
                  </p>
                </label>
              </div>
              {selectedVideo.file && (
                <div className="mt-4">
                  <FrameExtractor
                    videoFile={selectedVideo.file}
                    onFramesExtracted={handleFramesExtracted}
                  />
                  {processingFrames && (
                    <div className="mt-4">
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        <span className="text-sm text-gray-600">
                          Processing frames with Roboflow...
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "results" && selectedVideo && (
            <DetectionResults videoId={selectedVideo._id} user={user} />
          )}
        </div>
      </div>
    </div>
  );
};

export default CCTVPage;
