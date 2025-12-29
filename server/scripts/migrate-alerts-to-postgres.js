import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Alert from '../models/Alert.js';
import AlertSQL from '../models/sql/Alert.js';
import AlertAgencySQL from '../models/sql/AlertAgency.js';
import AlertDocumentSQL from '../models/sql/AlertDocument.js';
import AlertReadBySQL from '../models/sql/AlertReadBy.js';
import AlertNotificationSQL from '../models/sql/AlertNotification.js';
import { sequelize, connectPostgres } from '../config/database.js';

dotenv.config();

async function migrateAlerts() {
  try {
    console.log('Starting alerts migration from MongoDB to PostgreSQL...\n');

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    const postgresConnected = await connectPostgres();
    if (!postgresConnected) {
      throw new Error('Failed to connect to PostgreSQL');
    }
    console.log('✓ Connected to PostgreSQL\n');

    await sequelize.sync({ force: false });
    console.log('✓ PostgreSQL tables synchronized\n');

    const mongoAlerts = await Alert.find({}).sort({ createdAt: 1 });
    console.log(`Found ${mongoAlerts.length} alerts in MongoDB\n`);

    if (mongoAlerts.length === 0) {
      console.log('No alerts to migrate. Exiting...');
      process.exit(0);
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const mongoAlert of mongoAlerts) {
      try {
        const existingAlert = await AlertSQL.findOne({
          where: { 
            title: mongoAlert.title,
            created_at: mongoAlert.createdAt
          }
        });

        if (existingAlert) {
          console.log(`⊘ Skipping alert - already exists: ${mongoAlert.title.substring(0, 50)}...`);
          skipCount++;
          continue;
        }

        const sqlAlert = await AlertSQL.create({
          type: mongoAlert.type,
          severity: mongoAlert.severity,
          title: mongoAlert.title,
          description: mongoAlert.description,
          status: mongoAlert.status,
          triggered_by: mongoAlert.triggeredBy || 'AI',
          action_taken: mongoAlert.actionTaken || '',
          related_event_id: mongoAlert.relatedEvent ? mongoAlert.relatedEvent.toString() : null,
          expires_at: mongoAlert.expiresAt || null,
          acknowledged_by_user_id: mongoAlert.acknowledgedBy?.userId ? mongoAlert.acknowledgedBy.userId.toString() : null,
          acknowledged_at: mongoAlert.acknowledgedBy?.acknowledgedAt || null,
          details_json: mongoAlert.details || null,
          created_at: mongoAlert.createdAt,
          updated_at: mongoAlert.updatedAt
        });

        if (mongoAlert.agencies && mongoAlert.agencies.length > 0) {
          const agencyRecords = mongoAlert.agencies.map(agency => ({
            alert_id: sqlAlert.id,
            agency
          }));
          await AlertAgencySQL.bulkCreate(agencyRecords);
        }

        if (mongoAlert.details?.documentIds && mongoAlert.details.documentIds.length > 0) {
          const docRecords = mongoAlert.details.documentIds.map(doc => ({
            alert_id: sqlAlert.id,
            document_id: doc.id ? doc.id.toString() : doc.toString(),
            document_type: doc.type || 'Document'
          }));
          await AlertDocumentSQL.bulkCreate(docRecords);
        }

        if (mongoAlert.readBy && mongoAlert.readBy.length > 0) {
          const readByRecords = mongoAlert.readBy.map(rb => ({
            alert_id: sqlAlert.id,
            user_id: rb.userId ? rb.userId.toString() : 'unknown',
            read_at: rb.readAt
          }));
          await AlertReadBySQL.bulkCreate(readByRecords);
        }

        if (mongoAlert.notifiedAgencies && mongoAlert.notifiedAgencies.length > 0) {
          const notificationRecords = mongoAlert.notifiedAgencies.map(na => ({
            alert_id: sqlAlert.id,
            agency: na.agency,
            notified_at: na.notifiedAt,
            method: na.method || 'internal',
            status: na.status || 'sent'
          }));
          await AlertNotificationSQL.bulkCreate(notificationRecords);
        }

        console.log(`✓ Migrated alert: ${mongoAlert.title.substring(0, 50)}... (${mongoAlert.type})`);
        successCount++;
      } catch (error) {
        console.error(`✗ Error migrating alert "${mongoAlert.title.substring(0, 50)}...":`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total alerts in MongoDB: ${mongoAlerts.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Skipped (already exist): ${skipCount}`);
    console.log(`Errors: ${errorCount}`);

    const postgresCount = await AlertSQL.count();
    console.log(`\nTotal alerts in PostgreSQL: ${postgresCount}`);

    await mongoose.connection.close();
    await sequelize.close();
    
    console.log('\n✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

migrateAlerts();
