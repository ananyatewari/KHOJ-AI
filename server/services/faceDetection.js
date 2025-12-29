class FaceDetectionService {
  constructor() {
    this.faceModel = null;
    this.isInitialized = false;
    this.faceDatabase = new Map(); 
  }

  async initialize() {
    try {
      console.log('Loading face detection model...');
      this.isInitialized = true;
      console.log('Face detection service initialized');
    } catch (error) {
      console.error('Error initializing face detection:', error);
      throw error;
    }
  }

  async detectFaces(frameBuffer, frameNumber, timestamp) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const mockFaces = this.generateMockFaces(frameNumber);
      
      return {
        frameNumber,
        timestamp,
        faces: mockFaces
      };

    } catch (error) {
      console.error('Error detecting faces:', error);
      throw error;
    }
  }

  generateMockFaces(frameNumber) {
    const faces = [];
    
    if (frameNumber % 4 === 0) {
      const faceEmbedding = new Array(128).fill(0).map(() => Math.random());
      const faceId = this.generateFaceId(faceEmbedding);
      
      faces.push({
        confidence: 0.78,
        boundingBox: {
          x: 0.4,
          y: 0.15,
          width: 0.08,
          height: 0.12
        },
        faceId: faceId,
        embeddings: faceEmbedding,
        matchedPerson: 'unknown',
        matchConfidence: 0
      });
    }
    
    return faces;
  }

  async simpleFaceDetection(imageTensor) {
    
    return [];
  }

  async generateFaceEmbedding(imageTensor, faceRegion) {
    const faceImage = this.extractFaceRegion(imageTensor, faceRegion);
    
    const embedding = tf.randomNormal([128]); 
    const embeddingArray = await embedding.array();
    
    faceImage.dispose();
    embedding.dispose();
    
    return embeddingArray;
  }

  extractFaceRegion(imageTensor, faceRegion) {
    const bbox = faceRegion.boundingBox;
    const height = imageTensor.shape[0];
    const width = imageTensor.shape[1];
    
    const startY = Math.floor(bbox.y * height);
    const startX = Math.floor(bbox.x * width);
    const faceHeight = Math.floor(bbox.height * height);
    const faceWidth = Math.floor(bbox.width * width);
    
    return tf.slice(imageTensor, [startY, startX, 0], [faceHeight, faceWidth, 3]);
  }

  generateFaceId(embedding) {
    const hash = embedding.reduce((acc, val, idx) => {
      return acc + (val * (idx + 1));
    }, 0);
    
    return `face_${Math.abs(hash).toString(16)}`;
  }


  findFaceMatch(embedding) {
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [personName, storedEmbedding] of this.faceDatabase) {
      const similarity = this.calculateCosineSimilarity(embedding, storedEmbedding);
      
      if (similarity > 0.8 && similarity > bestScore) {
        bestScore = similarity;
        bestMatch = {
          name: personName,
          confidence: similarity
        };
      }
    }
    
    return bestMatch;
  }

  calculateCosineSimilarity(embedding1, embedding2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }
    
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    return dotProduct / (norm1 * norm2);
  }

  addPersonToDatabase(personName, embedding) {
    this.faceDatabase.set(personName, embedding);
    console.log(`Added ${personName} to face database`);
  }


  removePersonFromDatabase(personName) {
    this.faceDatabase.delete(personName);
    console.log(`Removed ${personName} from face database`);
  }

  getDatabasePersons() {
    return Array.from(this.faceDatabase.keys());
  }

  calculateFaceSummary(faceDetections) {
    const summary = {
      uniqueFaces: new Set(),
      totalFaces: 0,
      recognizedFaces: 0,
      unknownFaces: 0,
      highConfidenceDetections: 0
    };

    faceDetections.forEach(frameDetection => {
      frameDetection.faces.forEach(face => {
        summary.totalFaces++;
        summary.uniqueFaces.add(face.faceId);
        
        if (face.confidence >= 0.7) {
          summary.highConfidenceDetections++;
        }
        
        if (face.matchedPerson !== 'unknown') {
          summary.recognizedFaces++;
        } else {
          summary.unknownFaces++;
        }
      });
    });

    summary.uniqueFaces = summary.uniqueFaces.size;
    
    return summary;
  }

  initializeSampleDatabase() {
    const sampleEmbedding1 = new Array(128).fill(0).map(() => Math.random());
    const sampleEmbedding2 = new Array(128).fill(0).map(() => Math.random());
    
    this.addPersonToDatabase('John Doe', sampleEmbedding1);
    this.addPersonToDatabase('Jane Smith', sampleEmbedding2);
  }
}

export default FaceDetectionService;
