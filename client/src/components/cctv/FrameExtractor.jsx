import React, { useState, useRef, useEffect } from "react";

export default function FrameExtractor({ videoFile, onFramesExtracted }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(0);

  const extractFrames = async () => {
    if (!videoFile || !videoRef.current || !canvasRef.current) return;

    setExtracting(true);
    setProgress(0);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const frames = [];

    const videoURL = URL.createObjectURL(videoFile);
    video.src = videoURL;

    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });

    const duration = video.duration;
    const frameInterval = 1; // Extract 1 frame per second (adjust as needed)
    const totalFrames = Math.floor(duration / frameInterval);

    for (let i = 0; i < totalFrames; i++) {
      const time = i * frameInterval;
      video.currentTime = time;

      await new Promise((resolve) => {
        video.onseeked = resolve;
      });

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.95);
      });

      console.log(`Frame ${i + 1}: ${video.videoWidth}x${video.videoHeight}, blob size: ${blob.size} bytes`);

      frames.push({
        blob,
        timestamp: time,
        frameNumber: i + 1,
      });

      setProgress(Math.round(((i + 1) / totalFrames) * 100));
    }

    URL.revokeObjectURL(videoURL);
    setExtracting(false);
    onFramesExtracted(frames);
  };

  return (
    <div>
      <video ref={videoRef} style={{ display: "none" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      
      <button 
        onClick={extractFrames} 
        disabled={extracting}
        className={`px-6 py-3 rounded-md font-medium transition-colors ${
          extracting 
            ? 'bg-gray-400 cursor-not-allowed text-white' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {extracting ? `Extracting Frames... ${progress}%` : "Start Frame Extraction"}
      </button>
      
      {extracting && (
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2 text-center">
            Extracting frames from video... {progress}%
          </p>
        </div>
      )}
    </div>
  );
}
