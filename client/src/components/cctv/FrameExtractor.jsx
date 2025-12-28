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

    // Load video
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

      // Convert canvas to blob
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.8);
      });

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
      <button onClick={extractFrames} disabled={extracting}>
        {extracting ? `Extracting... ${progress}%` : "Extract Frames"}
      </button>
    </div>
  );
}
