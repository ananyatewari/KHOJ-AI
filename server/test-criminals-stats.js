import dotenv from 'dotenv';
import CriminalRecordSQL from './models/sql/CriminalRecord.js';
import AlertSQL from './models/sql/Alert.js';
import { sequelize } from './config/database.js';
import { Op } from 'sequelize';

dotenv.config();

async function testCriminalsStats() {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connection established successfully');

    const criminalCount = await CriminalRecordSQL.count({
      where: { hasRecord: true }
    });

    const alertCount = await AlertSQL.count({
      where: { type: 'criminal_match' }
    });

    const criticalAlertCount = await AlertSQL.count({
      where: { 
        type: 'criminal_match',
        severity: 'critical'
      }
    });

    const todayAlertCount = await AlertSQL.count({
      where: { 
        type: 'criminal_match',
        createdAt: { 
          [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) 
        }
      }
    });

    console.log('=== Criminal Records Stats (PostgreSQL) ===');
    console.log('Unique persons with records:', criminalCount);
    console.log('Total criminal match alerts:', alertCount);
    console.log('Critical alerts:', criticalAlertCount);
    console.log('Today alerts:', todayAlertCount);

    // Get sample records
    const records = await CriminalRecordSQL.findAll({
      where: { hasRecord: true },
      limit: 3
    });

    console.log('\nSample Criminal Records:');
    records.forEach(record => {
      console.log(`- ${record.personName || record.name} (${record.riskLevel})`);
    });

    // Get sample alerts
    const alerts = await AlertSQL.findAll({
      where: { type: 'criminal_match' },
      limit: 3
    });

    console.log('\nSample Alerts:');
    alerts.forEach(alert => {
      console.log(`- ${alert.title} (${alert.severity})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testCriminalsStats();
