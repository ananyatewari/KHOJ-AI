import multer from 'multer';
import path from 'path';

// Set storage engine and file filtering
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allowed extensions
  const allowedExtensions = /\.(mp3|wav|m4a|mp4)$/i;
  const extname = allowedExtensions.test(path.extname(file.originalname));
  
  // Allowed MIME types (more flexible matching)
  const allowedMimeTypes = [
    'audio/mpeg',      // MP3
    'audio/mp3',       // MP3 (some browsers)
    'audio/wav',       // WAV
    'audio/x-wav',     // WAV (alternative)
    'audio/wave',      // WAV (alternative)
    'audio/m4a',       // M4A
    'audio/mp4',       // MP4 audio
    'video/mp4'        // MP4 video
  ];
  const mimetype = allowedMimeTypes.includes(file.mimetype);
 
  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error(`Only audio files are allowed. Got: ${file.mimetype}`));
  }
};

const upload = multer({ storage, fileFilter });

export default upload;
