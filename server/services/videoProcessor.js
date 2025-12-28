import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);

class VideoProcessor {
  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads', 'videos');
    this.framesDir = path.join(process.cwd(), 'uploads', 'frames');
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      if (!fs.existsSync(this.uploadsDir)) {
        await mkdir(this.uploadsDir, { recursive: true });
      }
      if (!fs.existsSync(this.framesDir)) {
        await mkdir(this.framesDir, { recursive: true });
      }
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  /**
   * Extract video metadata using FFmpeg
   */
  async extractMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        const videoMetadata = {
          duration: metadata.format.duration,
          width: videoStream.width,
          height: videoStream.height,
          fps: eval(videoStream.r_frame_rate),
          format: metadata.format.format_name,
          size: metadata.format.size,
          codec: videoStream.codec_name
        };

        resolve(videoMetadata);
      });
    });
  }

  /**
   * Extract frames from video at specified intervals
   */
  async extractFrames(videoPath, videoId, intervalSeconds = 2) {
    const framesOutputDir = path.join(this.framesDir, videoId);
    
    // Create directory for this video's frames
    if (!fs.existsSync(framesOutputDir)) {
      await mkdir(framesOutputDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      const framePattern = path.join(framesOutputDir, 'frame_%04d.jpg');
      
      ffmpeg(videoPath)
        .seekInput('00:00:00')  // Start from beginning
        .frames(intervalSeconds) // Extract frame every N seconds
        .output(framePattern)
        .on('end', () => {
          // Count extracted frames
          fs.readdir(framesOutputDir, (err, files) => {
            if (err) {
              reject(err);
              return;
            }
            
            const frameFiles = files.filter(file => file.endsWith('.jpg'));
            const totalFrames = frameFiles.length;
            
            resolve({
              framesDir: framesOutputDir,
              totalFrames,
              frameFiles,
              intervalSeconds
            });
          });
        })
        .on('error', (err) => {
          reject(err);
        })
        .run();
    });
  }

  /**
   * Get frame buffer for processing
   */
  async getFrameBuffer(framePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(framePath, (err, data) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(data);
      });
    });
  }

  /**
   * Generate video thumbnail
   */
  async generateThumbnail(videoPath, videoId) {
    const thumbnailPath = path.join(this.uploadsDir, 'thumbnails', `${videoId}_thumb.jpg`);
    
    // Ensure thumbnails directory exists
    const thumbnailsDir = path.join(this.uploadsDir, 'thumbnails');
    if (!fs.existsSync(thumbnailsDir)) {
      await mkdir(thumbnailsDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput('00:00:01')  // Take frame at 1 second
        .frames(1)
        .size('320x240')
        .output(thumbnailPath)
        .on('end', () => {
          resolve(thumbnailPath);
        })
        .on('error', (err) => {
          reject(err);
        })
        .run();
    });
  }

  /**
   * Clean up temporary files
   */
  async cleanup(videoId) {
    try {
      const framesDir = path.join(this.framesDir, videoId);
      
      if (fs.existsSync(framesDir)) {
        fs.rmSync(framesDir, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Error cleaning up files:', error);
    }
  }

  /**
   * Validate video file
   */
  validateVideoFile(file) {
    const allowedTypes = ['video/mp4', 'video/avi', 'video/mov', 'video/mkv'];
    const maxSize = 100 * 1024 * 1024; // 100MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid video format. Allowed formats: MP4, AVI, MOV, MKV');
    }

    if (file.size > maxSize) {
      throw new Error('Video file too large. Maximum size: 100MB');
    }

    return true;
  }

  /**
   * Calculate timestamp for frame number
   */
  calculateFrameTimestamp(frameNumber, intervalSeconds) {
    return frameNumber * intervalSeconds;
  }
}

export default VideoProcessor;
