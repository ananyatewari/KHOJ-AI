import React, { useState, useEffect } from "react";
import CCTVUpload from "../components/cctv/CCTVUpload.jsx";
import DetectionResults from "../components/cctv/DetectionResults.jsx";
import FrameExtractor from "../components/cctv/FrameExtractor.jsx";
import MetadataUpload from "../components/cctv/MetadataUpload.jsx";
import MetadataAnalysis from "../components/cctv/MetadataAnalysis.jsx";
import VideoMetadataView from "../components/cctv/VideoMetadataView.jsx";
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
  const [metadataFiles, setMetadataFiles] = useState([]);
  const [selectedMetadata, setSelectedMetadata] = useState(null);

  useEffect(() => {
    fetchVideos();
    fetchMetadata();
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

  const fetchMetadata = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/cctv/metadata", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setMetadataFiles(response.data.metadata || []);
    } catch (error) {
      console.error("Error fetching metadata:", error);
    }
  };

  const handleUploadSuccess = (uploadData) => {
    console.log("Upload successful:", uploadData);
    fetchVideos();
    // Stay on upload tab to allow frame extraction
  };

  const handleMetadataUploadSuccess = (uploadData) => {
    console.log("Metadata upload successful:", uploadData);
    fetchMetadata();
    // Switch to metadata library to see processing
    setActiveTab("metadata-library");
  };

  const handleMetadataSelect = (metadata) => {
    setSelectedMetadata(metadata);
    setActiveTab("metadata-analysis");
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8 bg-gray-50 dark:bg-gray-900">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">CCTV Analysis</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Upload and analyze CCTV footage for object detection and suspicious activity
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex flex-wrap gap-4">
            {/* Video Section */}
            <div className="flex items-center space-x-4 border-r border-gray-300 dark:border-gray-600 pr-4">
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">📹 Video</span>
              <button
                onClick={() => setActiveTab("upload")}
                className={`py-2 px-3 border-b-2 font-medium text-sm ${
                  activeTab === "upload"
                    ? "border-purple-500 text-purple-600 dark:text-purple-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-600"
                }`}
              >
                Upload
              </button>
              <button
                onClick={() => setActiveTab("library")}
                className={`py-2 px-3 border-b-2 font-medium text-sm ${
                  activeTab === "library"
                    ? "border-purple-500 text-purple-600 dark:text-purple-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-600"
                }`}
              >
                Library ({videos.length})
              </button>
              {selectedVideo && (
                <>
                  <button
                    onClick={() => setActiveTab("results")}
                    className={`py-2 px-3 border-b-2 font-medium text-sm ${
                      activeTab === "results"
                        ? "border-purple-500 text-purple-600 dark:text-purple-400"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-600"
                    }`}
                  >
                    Results
                  </button>
                  <button
                    onClick={() => setActiveTab("video-metadata")}
                    className={`py-2 px-3 border-b-2 font-medium text-sm ${
                      activeTab === "video-metadata"
                        ? "border-purple-500 text-purple-600 dark:text-purple-400"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-300 dark:hover:border-purple-600"
                    }`}
                  >
                    Intelligence
                  </button>
                </>
              )}
            </div>

            {/* Metadata Section */}
            <div className="flex items-center space-x-4">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">📄 Metadata Files</span>
              <button
                onClick={() => setActiveTab("metadata-upload")}
                className={`py-2 px-3 border-b-2 font-medium text-sm ${
                  activeTab === "metadata-upload"
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-600"
                }`}
              >
                Upload
              </button>
              <button
                onClick={() => setActiveTab("metadata-library")}
                className={`py-2 px-3 border-b-2 font-medium text-sm ${
                  activeTab === "metadata-library"
                    ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-600"
                }`}
              >
                Library ({metadataFiles.length})
              </button>
              {selectedMetadata && (
                <button
                  onClick={() => setActiveTab("metadata-analysis")}
                  className={`py-2 px-3 border-b-2 font-medium text-sm ${
                    activeTab === "metadata-analysis"
                      ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-600"
                  }`}
                >
                  Analysis
                </button>
              )}
            </div>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "upload" && (
            <CCTVUpload user={user} onUploadSuccess={handleUploadSuccess} />
          )}
          {activeTab === "library" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                  Video Library
                </h2>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
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
                    <p className="mt-2 text-gray-500 dark:text-gray-400">No videos uploaded yet</p>
                    <button
                      onClick={() => setActiveTab("upload")}
                      className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                    >
                      Upload First Video
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Video
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Camera Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Duration
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Risk Score
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {videos.map((video) => (
                          <tr key={video._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {video.originalName}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {formatFileSize(
                                      video.videoMetadata?.size || 0
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {video.cameraInfo?.location || "Unknown"}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {video.detectionSummary?.riskScore || 0}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              {video.processingStatus === "completed" ? (
                                <button
                                  onClick={() => handleVideoSelect(video)}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                                >
                                  View Results
                                </button>
                              ) : (
                                <span className="text-gray-400 dark:text-gray-500 mr-3">
                                  {video.processingStatus === "uploaded" 
                                    ? "Awaiting processing" 
                                    : "Processing..."}
                                </span>
                              )}
                              <button className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">
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


          {activeTab === "metadata-upload" && (
            <MetadataUpload user={user} onUploadSuccess={handleMetadataUploadSuccess} />
          )}

          {activeTab === "metadata-library" && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                  Metadata Library
                </h2>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600 dark:text-gray-400">
                      Loading metadata files...
                    </span>
                  </div>
                ) : metadataFiles.length === 0 ? (
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p className="mt-2 text-gray-500 dark:text-gray-400">No metadata files uploaded yet</p>
                    <button
                      onClick={() => setActiveTab("metadata-upload")}
                      className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600"
                    >
                      Upload First Metadata File
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            File
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Uploaded
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {metadataFiles.map((metadata) => (
                          <tr key={metadata._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
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
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                      />
                                    </svg>
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {metadata.originalName}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {(metadata.fileSize / 1024).toFixed(2)} KB
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {metadata.cameraInfo?.location || "N/A"}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  metadata.processingStatus === "completed"
                                    ? "text-green-600 bg-green-100"
                                    : metadata.processingStatus === "processing"
                                    ? "text-yellow-600 bg-yellow-100"
                                    : "text-red-600 bg-red-100"
                                }`}
                              >
                                {metadata.processingStatus}
                              </span>
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {new Date(metadata.createdAt).toLocaleDateString()}
                            </td>

                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() => handleMetadataSelect(metadata)}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                              >
                                View Analysis
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

          {activeTab === "video-metadata" && selectedVideo && (
            <VideoMetadataView videoId={selectedVideo._id} user={user} />
          )}

          {activeTab === "metadata-analysis" && selectedMetadata && (
            <MetadataAnalysis metadataId={selectedMetadata._id} user={user} />
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
