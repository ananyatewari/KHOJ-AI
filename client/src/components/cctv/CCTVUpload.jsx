import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import FrameExtractor from "./FrameExtractor.jsx";
import { detectObjects } from "../../utils/roboflow.js";

const CCTVUpload = ({ user, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cameraInfo, setCameraInfo] = useState({
    cameraId: "",
    location: "",
    latitude: "",
    longitude: "",
  });
  const [error, setError] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedVideoId, setUploadedVideoId] = useState(null);
  const [frames, setFrames] = useState([]);
  const [processingFrames, setProcessingFrames] = useState(false);

  const onDrop = async (acceptedFiles) => {
    console.log("onDrop called", acceptedFiles);

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setError("");
    setUploading(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("video", file);
      formData.append("agency", user.agency);
      formData.append("uploadedBy", user.username);
      formData.append("cameraId", cameraInfo.cameraId);
      formData.append("cameraLocation", cameraInfo.location);
      formData.append("latitude", cameraInfo.latitude);
      formData.append("longitude", cameraInfo.longitude);

      const response = await axios.post("/api/cctv/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(progress);
        },
      });

      setUploading(false);
      setUploadedFile(file);
      setUploadedVideoId(response.data.videoId);
      console.log(
        "Upload success - File:",
        file,
        "VideoId:",
        response.data.videoId
      );
      onUploadSuccess && onUploadSuccess(response.data);

      // Reset form
      setCameraInfo({
        cameraId: "",
        location: "",
        latitude: "",
        longitude: "",
      });
    } catch (err) {
      setUploading(false);
      setError(err.response?.data?.error || "Upload failed");
    }
  };

  const handleFramesExtracted = async (extractedFrames) => {
    setFrames(extractedFrames);
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
    await fetch(`/api/cctv/${uploadedVideoId}/detections`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ detections }),
    });

    setProcessingFrames(false);
    onUploadSuccess && onUploadSuccess({ videoId: uploadedVideoId });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/mp4": [".mp4"],
      "video/avi": [".avi"],
      "video/mov": [".mov"],
      "video/mkv": [".mkv"],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: false,
  });

  const handleInputChange = (field, value) => {
    setCameraInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  console.log("CCTVUpload user prop", user);
  console.log(
    "FrameExtractor condition - uploadedFile:",
    uploadedFile,
    "uploadedVideoId:",
    uploadedVideoId
  );
  // At the start of onDrop

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Upload CCTV Video
      </h2>

      {/* Camera Information */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Camera ID
          </label>
          <input
            type="text"
            value={cameraInfo.cameraId}
            onChange={(e) => handleInputChange("cameraId", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="CAM-001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <input
            type="text"
            value={cameraInfo.location}
            onChange={(e) => handleInputChange("location", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Main Entrance"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Latitude
          </label>
          <input
            type="number"
            value={cameraInfo.latitude}
            onChange={(e) => handleInputChange("latitude", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="19.0760"
            step="any"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Longitude
          </label>
          <input
            type="number"
            value={cameraInfo.longitude}
            onChange={(e) => handleInputChange("longitude", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="72.8777"
            step="any"
          />
        </div>
      </div>

      {/* File Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        } ${uploading ? "pointer-events-none opacity-50" : ""}`}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div>
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Uploading... {uploadProgress}%
              </p>
            </div>
          </div>
        ) : (
          <div>
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {isDragActive ? (
              <p className="text-blue-600">Drop the video file here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">
                  Drag and drop a video file here, or click to select
                </p>
                <p className="text-sm text-gray-500">
                  Supported formats: MP4, AVI, MOV, MKV (Max 100MB)
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Upload Guidelines */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-700 mb-2">Upload Guidelines:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Maximum file size: 100MB</li>
          <li>• Supported formats: MP4, AVI, MOV, MKV</li>
          <li>• Processing may take several minutes</li>
          <li>• Provide accurate camera information for better analysis</li>
          <li>• Videos will be analyzed for objects and suspicious activity</li>
        </ul>
      </div>

      {/* Frame Extraction */}
      {uploadedFile && uploadedVideoId && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-gray-700 mb-4">
            Extract Frames & Analyze
          </h3>
          <FrameExtractor
            videoFile={uploadedFile}
            onFramesExtracted={handleFramesExtracted}
          />
          {processingFrames && (
            <div className="mt-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm text-gray-600">
                  Processing {frames.length} frames with Roboflow...
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CCTVUpload;
