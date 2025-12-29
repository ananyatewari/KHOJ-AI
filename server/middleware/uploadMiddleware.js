import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = /\.(mp3|wav|m4a|mp4)$/i;
  const extname = allowedExtensions.test(path.extname(file.originalname));
  
  const allowedMimeTypes = [
    'audio/mpeg',     
    'audio/mp3',       
    'audio/wav',       
    'audio/x-wav',     
    'audio/wave',      
    'audio/m4a',       
    'audio/mp4',      
    'video/mp4'        
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
