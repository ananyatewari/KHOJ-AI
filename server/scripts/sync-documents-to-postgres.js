import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Document from '../models/Document.js';
import DocumentSQL from '../models/sql/Document.js';
import { sequelize, connectPostgres } from '../config/database.js';

dotenv.config();

async function syncDocumentsToPostgres() {
  try {
    // Connect to both databases
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    await connectPostgres();
    console.log('Connected to PostgreSQL');

    // Sync models
    await sequelize.sync({ alter: true });
    console.log('PostgreSQL tables synchronized');

    // Get all documents from MongoDB
    const documents = await Document.find({});
    console.log(`Found ${documents.length} documents in MongoDB`);

    // Sync to PostgreSQL
    for (const doc of documents) {
      const [postgresDoc, created] = await DocumentSQL.findOrCreate({
        where: { filename: doc.filename },
        defaults: {
          filename: doc.filename,
          text: doc.text,
          agency: doc.agency,
          uploadedBy: doc.uploadedBy,
          fileType: doc.fileType || 'pdf',
          entities: doc.entities || {
            persons: [],
            places: [],
            dates: [],
            organizations: [],
            phoneNumbers: []
          },
          aiSummary: doc.aiSummary || {
            executiveSummary: '',
            keyFindings: [],
            entityInsights: {
              persons: [],
              places: [],
              organizations: []
            },
            analystTakeaways: []
          },
          embedding: doc.embedding || [],
          chunks: doc.chunks || [],
          chunkEmbeddings: doc.chunkEmbeddings || [],
          visibility: doc.visibility || [],
          indexed: doc.indexed || false,
          sharedWithChatbot: doc.sharedWithChatbot || false,
          approvedForCrossAgency: doc.approvedForCrossAgency || false,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        }
      });

      if (!created) {
        // Update existing document
        await postgresDoc.update({
          text: doc.text,
          agency: doc.agency,
          uploadedBy: doc.uploadedBy,
          fileType: doc.fileType || 'pdf',
          entities: doc.entities || {
            persons: [],
            places: [],
            dates: [],
            organizations: [],
            phoneNumbers: []
          },
          aiSummary: doc.aiSummary || {
            executiveSummary: '',
            keyFindings: [],
            entityInsights: {
              persons: [],
              places: [],
              organizations: []
            },
            analystTakeaways: []
          },
          embedding: doc.embedding || [],
          chunks: doc.chunks || [],
          chunkEmbeddings: doc.chunkEmbeddings || [],
          visibility: doc.visibility || [],
          indexed: doc.indexed || false,
          sharedWithChatbot: doc.sharedWithChatbot || false,
          approvedForCrossAgency: doc.approvedForCrossAgency || false,
          updatedAt: doc.updatedAt
        });
      }

      console.log(`${created ? 'Created' : 'Updated'} document: ${doc.filename}`);
    }

    console.log('Document synchronization completed successfully');

  } catch (error) {
    console.error('Error syncing documents:', error);
  } finally {
    await mongoose.connection.close();
    await sequelize.close();
    process.exit(0);
  }
}

syncDocumentsToPostgres();
