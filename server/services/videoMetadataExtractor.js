import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { promisify } from "util";
import { exec } from "child_process";

const execPromise = promisify(exec);

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Extract comprehensive metadata from video file using FFprobe
 * @param {string} videoPath - Path to video file
 * @returns {Promise<Object>} - Comprehensive video metadata
 */
export async function extractVideoMetadata(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        console.error("FFprobe error:", err);
        reject(err);
        return;
      }

      try {
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
        const format = metadata.format;

        // Extract basic video information
        const basicInfo = {
          duration: parseFloat(format.duration) || 0,
          size: parseInt(format.size) || 0,
          bitrate: parseInt(format.bit_rate) || 0,
          format: format.format_name || 'unknown',
          formatLongName: format.format_long_name || 'unknown'
        };

        // Extract video stream information
        const videoInfo = videoStream ? {
          codec: videoStream.codec_name || 'unknown',
          codecLongName: videoStream.codec_long_name || 'unknown',
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          fps: eval(videoStream.r_frame_rate) || 0, // e.g., "30/1" -> 30
          aspectRatio: videoStream.display_aspect_ratio || 'unknown',
          pixelFormat: videoStream.pix_fmt || 'unknown',
          bitrate: parseInt(videoStream.bit_rate) || 0,
          profile: videoStream.profile || 'unknown',
          level: videoStream.level || 0
        } : null;

        // Extract audio stream information
        const audioInfo = audioStream ? {
          codec: audioStream.codec_name || 'unknown',
          codecLongName: audioStream.codec_long_name || 'unknown',
          sampleRate: parseInt(audioStream.sample_rate) || 0,
          channels: audioStream.channels || 0,
          bitrate: parseInt(audioStream.bit_rate) || 0
        } : null;

        // Extract embedded metadata (creation time, GPS, camera info, etc.)
        const embeddedMetadata = extractEmbeddedMetadata(format.tags || {}, videoStream?.tags || {});

        // Calculate derived information
        const derivedInfo = {
          totalFrames: videoInfo ? Math.floor(basicInfo.duration * videoInfo.fps) : 0,
          resolution: videoInfo ? `${videoInfo.width}x${videoInfo.height}` : 'unknown',
          quality: assessVideoQuality(videoInfo, basicInfo),
          estimatedFileSize: format.size ? formatFileSize(format.size) : 'unknown'
        };

        resolve({
          basic: basicInfo,
          video: videoInfo,
          audio: audioInfo,
          embedded: embeddedMetadata,
          derived: derivedInfo,
          raw: metadata // Keep raw metadata for advanced use
        });

      } catch (parseError) {
        console.error("Error parsing metadata:", parseError);
        reject(parseError);
      }
    });
  });
}

/**
 * Extract embedded metadata from video tags
 * @param {Object} formatTags - Format-level tags
 * @param {Object} streamTags - Stream-level tags
 * @returns {Object} - Extracted embedded metadata
 */
function extractEmbeddedMetadata(formatTags, streamTags) {
  const tags = { ...formatTags, ...streamTags };
  
  const metadata = {
    creationTime: tags.creation_time || tags.date || null,
    title: tags.title || null,
    artist: tags.artist || null,
    comment: tags.comment || null,
    description: tags.description || null,
    encoder: tags.encoder || null,
    software: tags.software || null,
    
    // Camera/Device information
    make: tags.make || tags['com.apple.quicktime.make'] || null,
    model: tags.model || tags['com.apple.quicktime.model'] || null,
    
    // GPS information
    location: extractGPSData(tags),
    
    // Additional metadata
    copyright: tags.copyright || null,
    language: tags.language || null
  };

  // Remove null values
  return Object.fromEntries(
    Object.entries(metadata).filter(([_, v]) => v !== null)
  );
}

/**
 * Extract GPS coordinates from video tags
 * @param {Object} tags - Video tags
 * @returns {Object|null} - GPS coordinates or null
 */
function extractGPSData(tags) {
  // Check for various GPS tag formats
  const lat = tags['com.apple.quicktime.location.ISO6709'] || 
              tags.location || 
              tags.gps_latitude || 
              tags['GPS:GPSLatitude'];
              
  const lon = tags.gps_longitude || tags['GPS:GPSLongitude'];

  if (lat && lon) {
    return {
      latitude: parseGPSCoordinate(lat),
      longitude: parseGPSCoordinate(lon),
      raw: tags['com.apple.quicktime.location.ISO6709'] || `${lat}, ${lon}`
    };
  }

  // Parse ISO 6709 format if available
  if (tags['com.apple.quicktime.location.ISO6709']) {
    const iso6709 = tags['com.apple.quicktime.location.ISO6709'];
    const parsed = parseISO6709(iso6709);
    if (parsed) return parsed;
  }

  return null;
}

/**
 * Parse GPS coordinate from various formats
 * @param {string|number} coord - GPS coordinate
 * @returns {number} - Decimal degrees
 */
function parseGPSCoordinate(coord) {
  if (typeof coord === 'number') return coord;
  
  // Try to parse as decimal
  const decimal = parseFloat(coord);
  if (!isNaN(decimal)) return decimal;
  
  // Parse DMS format (e.g., "40° 26' 46.302" N")
  const dmsMatch = coord.match(/(\d+)[°\s]+(\d+)['\s]+(\d+\.?\d*)["\s]*([NSEW])?/);
  if (dmsMatch) {
    const [, deg, min, sec, dir] = dmsMatch;
    let result = parseFloat(deg) + parseFloat(min) / 60 + parseFloat(sec) / 3600;
    if (dir === 'S' || dir === 'W') result *= -1;
    return result;
  }
  
  return parseFloat(coord) || 0;
}

/**
 * Parse ISO 6709 location string
 * @param {string} iso6709 - ISO 6709 format string
 * @returns {Object|null} - Parsed coordinates
 */
function parseISO6709(iso6709) {
  // Format: +40.4406-079.9959/ or similar
  const match = iso6709.match(/([+-]\d+\.?\d*)([+-]\d+\.?\d*)/);
  if (match) {
    return {
      latitude: parseFloat(match[1]),
      longitude: parseFloat(match[2]),
      raw: iso6709
    };
  }
  return null;
}

/**
 * Assess video quality based on technical parameters
 * @param {Object} videoInfo - Video stream information
 * @param {Object} basicInfo - Basic video information
 * @returns {string} - Quality assessment (excellent, good, fair, poor)
 */
function assessVideoQuality(videoInfo, basicInfo) {
  if (!videoInfo) return 'unknown';
  
  let score = 0;
  
  // Resolution score (0-40 points)
  const pixels = videoInfo.width * videoInfo.height;
  if (pixels >= 3840 * 2160) score += 40; // 4K
  else if (pixels >= 1920 * 1080) score += 35; // 1080p
  else if (pixels >= 1280 * 720) score += 25; // 720p
  else if (pixels >= 854 * 480) score += 15; // 480p
  else score += 5;
  
  // Frame rate score (0-20 points)
  if (videoInfo.fps >= 60) score += 20;
  else if (videoInfo.fps >= 30) score += 15;
  else if (videoInfo.fps >= 24) score += 10;
  else score += 5;
  
  // Bitrate score (0-40 points)
  const bitrateMbps = basicInfo.bitrate / 1000000;
  if (bitrateMbps >= 10) score += 40;
  else if (bitrateMbps >= 5) score += 30;
  else if (bitrateMbps >= 2) score += 20;
  else if (bitrateMbps >= 1) score += 10;
  else score += 5;
  
  // Codec score (0-10 points)
  if (videoInfo.codec === 'h265' || videoInfo.codec === 'hevc') score += 10;
  else if (videoInfo.codec === 'h264') score += 8;
  else score += 5;
  
  // Determine quality level
  if (score >= 85) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 45) return 'fair';
  return 'poor';
}

/**
 * Format file size to human-readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate AI analysis of video metadata
 * @param {Object} metadata - Extracted video metadata
 * @returns {Object} - AI-generated analysis
 */
export function analyzeVideoMetadata(metadata) {
  const analysis = {
    summary: generateSummary(metadata),
    recommendations: generateRecommendations(metadata),
    alerts: generateAlerts(metadata),
    suitability: assessSuitabilityForCCTV(metadata)
  };
  
  return analysis;
}

/**
 * Generate summary of video metadata
 */
function generateSummary(metadata) {
  const { basic, video, audio, embedded, derived } = metadata;
  
  let summary = `Video is ${formatDuration(basic.duration)} long with ${derived.resolution} resolution at ${video?.fps || 0} FPS. `;
  summary += `Quality assessment: ${derived.quality}. `;
  
  if (embedded.creationTime) {
    summary += `Recorded on ${new Date(embedded.creationTime).toLocaleString()}. `;
  }
  
  if (embedded.make || embedded.model) {
    summary += `Captured using ${embedded.make || ''} ${embedded.model || ''}. `;
  }
  
  if (embedded.location) {
    summary += `Location: ${embedded.location.latitude.toFixed(6)}, ${embedded.location.longitude.toFixed(6)}. `;
  }
  
  return summary.trim();
}

/**
 * Generate recommendations based on video metadata
 */
function generateRecommendations(metadata) {
  const recommendations = [];
  const { video, basic, derived } = metadata;
  
  if (derived.quality === 'poor' || derived.quality === 'fair') {
    recommendations.push('Consider using higher quality video for better object detection accuracy');
  }
  
  if (video && video.fps < 24) {
    recommendations.push('Low frame rate detected. Higher frame rates (30+ FPS) improve motion tracking');
  }
  
  if (basic.duration > 600) { // 10 minutes
    recommendations.push('Long video detected. Consider splitting into shorter segments for faster processing');
  }
  
  if (video && (video.width < 1280 || video.height < 720)) {
    recommendations.push('Resolution below 720p. Higher resolution improves detection accuracy');
  }
  
  return recommendations;
}

/**
 * Generate alerts based on video metadata
 */
function generateAlerts(metadata) {
  const alerts = [];
  const { video, basic, embedded } = metadata;
  
  if (!embedded.creationTime) {
    alerts.push({ level: 'warning', message: 'No creation timestamp found in video metadata' });
  }
  
  if (!embedded.location) {
    alerts.push({ level: 'info', message: 'No GPS location data embedded in video' });
  }
  
  if (basic.duration < 1) {
    alerts.push({ level: 'warning', message: 'Very short video duration (< 1 second)' });
  }
  
  if (video && video.codec !== 'h264' && video.codec !== 'h265' && video.codec !== 'hevc') {
    alerts.push({ level: 'info', message: `Uncommon video codec: ${video.codec}` });
  }
  
  return alerts;
}

/**
 * Assess suitability for CCTV analysis
 */
function assessSuitabilityForCCTV(metadata) {
  const { derived, video, basic } = metadata;
  
  let score = 0;
  let maxScore = 100;
  
  // Quality (40 points)
  if (derived.quality === 'excellent') score += 40;
  else if (derived.quality === 'good') score += 30;
  else if (derived.quality === 'fair') score += 20;
  else score += 10;
  
  // Resolution (30 points)
  if (video) {
    const pixels = video.width * video.height;
    if (pixels >= 1920 * 1080) score += 30;
    else if (pixels >= 1280 * 720) score += 20;
    else score += 10;
  }
  
  // Frame rate (20 points)
  if (video) {
    if (video.fps >= 30) score += 20;
    else if (video.fps >= 24) score += 15;
    else score += 10;
  }
  
  // Duration (10 points)
  if (basic.duration > 0 && basic.duration <= 600) score += 10;
  else if (basic.duration > 600) score += 5;
  
  const percentage = (score / maxScore) * 100;
  
  if (percentage >= 80) return { rating: 'excellent', score: percentage, message: 'Highly suitable for CCTV analysis' };
  if (percentage >= 60) return { rating: 'good', score: percentage, message: 'Suitable for CCTV analysis' };
  if (percentage >= 40) return { rating: 'fair', score: percentage, message: 'Acceptable for CCTV analysis with limitations' };
  return { rating: 'poor', score: percentage, message: 'May have limited analysis accuracy' };
}

/**
 * Format duration to human-readable format
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}
