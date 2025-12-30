import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CriminalRecord from '../models/CriminalRecord.js';
import Alert from '../models/Alert.js';
import CriminalRecordSQL from '../models/sql/CriminalRecord.js';
import AlertSQL from '../models/sql/Alert.js';
import { sequelize, connectPostgres } from '../config/database.js';

dotenv.config();

async function syncCriminalData() {
  try {
    // Connect to both databases
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');
    
    await connectPostgres();
    console.log('Connected to PostgreSQL');

    // Sync models
    await sequelize.sync({ alter: true });
    console.log('PostgreSQL tables synchronized');

    // Get all criminal records from MongoDB
    const criminalRecords = await CriminalRecord.find({ hasRecord: true });
    console.log(`Found ${criminalRecords.length} criminal records in MongoDB`);

    // Sync to PostgreSQL
    for (const record of criminalRecords) {
      const [postgresRecord, created] = await CriminalRecordSQL.findOrCreate({
        where: { name: record.name },
        defaults: {
          name: record.name,
          personName: record.personName || record.name,
          hasRecord: record.hasRecord,
          riskLevel: record.riskLevel || 'medium',
          convictionCount: record.convictionCount || 0,
          activeWarrants: record.activeWarrants || false,
          lastKnownLocation: record.lastKnownLocation,
          checkCount: record.checkCount || 0,
          lastChecked: record.lastChecked,
          courtCases: record.courtCases || [],
          relatedDocuments: record.relatedDocuments || [],
          agencies: record.agencies || []
        }
      });

      if (!created) {
        // Update existing record
        await postgresRecord.update({
          personName: record.personName || record.name,
          hasRecord: record.hasRecord,
          riskLevel: record.riskLevel || 'medium',
          convictionCount: record.convictionCount || 0,
          activeWarrants: record.activeWarrants || false,
          lastKnownLocation: record.lastKnownLocation,
          checkCount: record.checkCount || 0,
          lastChecked: record.lastChecked,
          courtCases: record.courtCases || [],
          relatedDocuments: record.relatedDocuments || [],
          agencies: record.agencies || []
        });
      }

      // Create alert for this criminal record if it doesn't exist
      const [alert, alertCreated] = await AlertSQL.findOrCreate({
        where: {
          type: 'criminal_match',
          title: `Criminal Record: ${record.personName || record.name}`
        },
        defaults: {
          type: 'criminal_match',
          severity: record.riskLevel === 'critical' ? 'critical' : 
                   record.riskLevel === 'high' ? 'high' : 
                   record.riskLevel === 'medium' ? 'medium' : 'low',
          status: 'active',
          title: `Criminal Record: ${record.personName || record.name}`,
          description: `Individual has criminal record with ${record.convictionCount || 0} conviction(s)`,
          agencies: record.agencies || [],
          details: {
            criminalRecord: {
              personName: record.personName || record.name,
              caseCount: record.courtCases ? record.courtCases.length : 0,
              riskLevel: record.riskLevel || 'medium',
              convictionCount: record.convictionCount || 0
            }
          },
          createdAt: record.createdAt || new Date(),
          updatedAt: record.updatedAt || new Date()
        }
      });

      console.log(`${created ? 'Created' : 'Updated'} criminal record: ${record.name}`);
      console.log(`${alertCreated ? 'Created' : 'Found existing'} alert for: ${record.name}`);
    }

    console.log('Criminal data synchronization completed successfully');

  } catch (error) {
    console.error('Error syncing criminal data:', error);
  } finally {
    await mongoose.connection.close();
    await sequelize.close();
    process.exit(0);
  }
}

syncCriminalData();
