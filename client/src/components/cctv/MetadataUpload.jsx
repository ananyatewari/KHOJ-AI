import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

const MetadataUpload = ({ user, onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cameraInfo, setCameraInfo] = useState({
    cameraId: "",
    location: "",
    latitude: "",
    longitude: "",
  });
  const [error, setError] = useState("");
  const [uploadedMetadataId, setUploadedMetadataId] = useState(null);

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setError("");
    setUploading(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("file", file);
      formData.append("agency", user.agency);
      formData.append("uploadedBy", user.username);
      formData.append("cameraId", cameraInfo.cameraId);
      formData.append("location", cameraInfo.location);
      formData.append("latitude", cameraInfo.latitude);
      formData.append("longitude", cameraInfo.longitude);

      const response = await axios.post("/api/cctv/metadata/upload", formData, {
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
      setUploadedMetadataId(response.data.metadataId);
      
      // Reset form
      setCameraInfo({
        cameraId: "",
        location: "",
        latitude: "",
        longitude: "",
      });
      
      if (onUploadSuccess) {
        onUploadSuccess(response.data);
      }
    } catch (err) {
      setUploading(false);
      setError(err.response?.data?.error || "Upload failed");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "text/plain": [".txt"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
  });

  const handleInputChange = (field, value) => {
    setCameraInfo((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        Upload CCTV Metadata
      </h2>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 dark:border-blue-400 rounded">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-blue-500 dark:text-blue-400 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">
              AI-Powered Analysis
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Upload incident reports, camera logs, or observation notes for AI entity extraction and analysis.
            </p>
          </div>
        </div>
      </div>

      {/* File Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
        } ${uploading ? "pointer-events-none opacity-50" : ""}`}
      >
        <input {...getInputProps()} />

        {uploading ? (
          <div>
            <div className="mb-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Uploading... {uploadProgress}%
              </p>
            </div>
          </div>
        ) : (
          <div>
            <svg
              className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4"
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
              <p className="text-blue-600 dark:text-blue-400">Drop the metadata file here...</p>
            ) : (
              <div>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Drag and drop a metadata file here, or click to select
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Supported formats: PDF, TXT, DOC, DOCX (Max 10MB)
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      {/* Success Message */}
      {uploadedMetadataId && !error && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-700">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-700 dark:text-green-400 font-semibold">
              Metadata file uploaded successfully! Processing with AI...
            </span>
          </div>
          <p className="text-sm text-green-600 dark:text-green-400 mt-2 ml-7">
            Check the Metadata Library tab to view analysis results once processing is complete.
          </p>
        </div>
      )}

      {/* Upload Guidelines */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">What to Upload:</h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• CCTV incident reports and observation logs</li>
          <li>• Camera maintenance records and metadata</li>
          <li>• Security briefings and patrol notes</li>
          <li>• Event summaries and investigation documents</li>
          <li>• Any text-based CCTV-related documentation</li>
        </ul>
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 mt-4">AI Analysis Includes:</h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Automatic extraction of persons, places, and organizations</li>
          <li>• Executive summary and key findings</li>
          <li>• Analyst takeaways and recommendations</li>
          <li>• Highlighted entities with context</li>
          <li>• Downloadable analysis report</li>
        </ul>
      </div>
    </div>
  );
};

export default MetadataUpload;
