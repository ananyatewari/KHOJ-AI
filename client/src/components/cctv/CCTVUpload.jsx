import React, { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import FrameExtractor from "./FrameExtractor.jsx";
import { detectObjects, loadModel } from "../../utils/tensorflowDetection.js";

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
  const [extractionComplete, setExtractionComplete] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);

  useEffect(() => {
    const initModel = async () => {
      try {
        await loadModel();
        setModelLoading(false);
      } catch (err) {
        console.error('Failed to load detection model:', err);
        setError('Failed to load AI model. Please refresh the page.');
      }
    };
    initModel();
  }, []);

  const extractVideoMetadata = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        const metadata = {
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          size: file.size,
          format: file.type,
          quality: assessQuality(video.videoWidth, video.videoHeight, file.size, video.duration)
        };

        URL.revokeObjectURL(video.src);
        resolve(metadata);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const assessQuality = (width, height, size, duration) => {
    const pixels = width * height;
    const bitrate = (size * 8) / duration; // bits per second
    const bitrateMbps = bitrate / 1000000;

    let score = 0;

    if (pixels >= 3840 * 2160) score += 40; 
    else if (pixels >= 1920 * 1080) score += 35; 
    else if (pixels >= 1280 * 720) score += 25; 
    else score += 15;

    if (bitrateMbps >= 10) score += 40;
    else if (bitrateMbps >= 5) score += 30;
    else if (bitrateMbps >= 2) score += 20;
    else score += 10;

    if (score >= 65) return 'excellent';
    if (score >= 50) return 'good';
    if (score >= 35) return 'fair';
    return 'poor';
  };

  const onDrop = async (acceptedFiles) => {
    console.log("onDrop called", acceptedFiles);

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setError("");
    setUploading(true);
    setUploadProgress(0);

    try {
      const metadata = await extractVideoMetadata(file);
      console.log('Extracted metadata:', metadata);

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

      if (metadata) {
        await axios.post(`/api/cctv/${response.data.videoId}/metadata`, 
          { metadata }, 
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        console.log('Metadata saved to backend');
      }

      setUploading(false);
      setUploadedFile(file);
      setUploadedVideoId(response.data.videoId);
      setExtractionComplete(false);
      console.log(
        "Upload success - File:",
        file,
        "VideoId:",
        response.data.videoId
      );
    } catch (err) {
      setUploading(false);
      setError(err.response?.data?.error || "Upload failed");
    }
  };

  const handleFramesExtracted = async (extractedFrames) => {
    setFrames(extractedFrames);
    setProcessingFrames(true);

    try {
      const detections = [];
      let roboflowErrors = 0;
      
      for (let i = 0; i < extractedFrames.length; i++) {
        const frame = extractedFrames[i];
        console.log(`Processing frame ${i + 1}/${extractedFrames.length}`);
        
        const result = await detectObjects(frame.blob);
        
        if (!result.predictions || result.predictions.length === 0) {
          roboflowErrors++;
        }
        
        detections.push({
          frameNumber: frame.frameNumber,
          timestamp: frame.timestamp,
          objects: result.predictions || [],
        });
      }

      if (roboflowErrors > extractedFrames.length * 0.8) {
        console.warn(`${roboflowErrors}/${extractedFrames.length} frames had no detections.`);
        setError('Warning: Most frames returned no detections. The video may not contain recognizable objects.');
        setProcessingFrames(false);
        return;
      }

      console.log('Sending detections to backend:', detections.length);
      const response = await fetch(`/api/cctv/${uploadedVideoId}/detections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ detections }),
      });

      const responseData = await response.json();

      if (response.ok) {
        console.log('Detections saved successfully');
        
        if (responseData.warning) {
          setError(`Processing completed with warning: ${responseData.warning}`);
        } else {
          setExtractionComplete(true);
        }
        
        setProcessingFrames(false);
        
        setCameraInfo({
          cameraId: "",
          location: "",
          latitude: "",
          longitude: "",
        });
        setUploadedFile(null);
        setUploadedVideoId(null);
        
        onUploadSuccess && onUploadSuccess({ videoId: uploadedVideoId });
      } else {
        throw new Error(responseData.error || 'Failed to save detections');
      }
    } catch (err) {
      console.error('Error processing frames:', err);
      setError(err.message || 'Failed to process frames');
      setProcessingFrames(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/mp4": [".mp4"],
      "video/avi": [".avi"],
      "video/mov": [".mov"],
      "video/mkv": [".mkv"],
    },
    maxSize: 100 * 1024 * 1024,
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
        Upload CCTV Video
      </h2>

      <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 dark:border-green-400 rounded">
        <div className="flex items-start">
          <svg className="h-5 w-5 text-green-500 dark:text-green-400 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-1">
              {modelLoading ? 'Loading AI Model...' : 'AI Detection Ready'}
            </h3>
            <p className="text-sm text-green-700 dark:text-green-400">
              AI-powered object detection analyzes video frames to identify persons, vehicles, and suspicious activities.
            </p>
          </div>
        </div>
      </div>

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
              <p className="text-blue-600 dark:text-blue-400">Drop the video file here...</p>
            ) : (
              <div>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Drag and drop a video file here, or click to select
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Supported formats: MP4, AVI, MOV, MKV (Max 100MB)
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 rounded">
          {error}
        </div>
      )}

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Upload Guidelines:</h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Maximum file size: 100MB</li>
          <li>• Supported formats: MP4, AVI, MOV, MKV</li>
          <li>• Processing happens in your browser (no data sent to external servers)</li>
          <li>• AI detects: people, vehicles, and 80+ common objects</li>
          <li>• Provide accurate camera information for better analysis</li>
          <li>• Videos will be analyzed for objects and suspicious activity</li>
        </ul>
      </div>

      {uploadedFile && uploadedVideoId && !extractionComplete && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-700">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Step 2: Extract Frames & Analyze
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Click the button below to extract frames from the video and analyze them for objects.
          </p>
          <FrameExtractor
            videoFile={uploadedFile}
            onFramesExtracted={handleFramesExtracted}
          />
          {processingFrames && (
            <div className="mt-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Processing {frames.length} frames with Roboflow... This may take a few minutes.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {extractionComplete && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-700">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-green-700 dark:text-green-400 font-semibold">
              Video processed successfully! Check the Video Library to view results.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CCTVUpload;
