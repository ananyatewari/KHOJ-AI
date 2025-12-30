import DocumentSQL from './models/sql/Document.js';
import { sequelize } from './config/database.js';
import { Op } from 'sequelize';

async function testGeotagging() {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connection established successfully');

    const docs = await DocumentSQL.findAll({
      where: {
        [Op.or]: [
          { entities: { [Op.not]: null } },
          { entities: { [Op.ne]: '{}' } }
        ]
      },
      limit: 5
    });

    console.log(`Found ${docs.length} documents with entities:`);
    
    docs.forEach(doc => {
      const plainDoc = doc.get({ plain: true });
      let entities = plainDoc.entities;
      
      if (typeof entities === 'string') {
        try {
          entities = JSON.parse(entities);
        } catch (e) {
          entities = {};
        }
      }
      
      console.log(`\n📄 File: ${plainDoc.filename}`);
      console.log(`📍 Places: ${entities?.places?.join(', ') || 'None'}`);
      console.log(`👥 Persons: ${entities?.persons?.slice(0, 3).join(', ') || 'None'}${entities?.persons?.length > 3 ? '...' : ''}`);
      console.log(`🏢 Organizations: ${entities?.organizations?.slice(0, 3).join(', ') || 'None'}${entities?.organizations?.length > 3 ? '...' : ''}`);
      console.log('---');
    });

    // Count documents with location data
    const locationDocs = await DocumentSQL.findAll({
      where: {
        [Op.and]: [
          {
            [Op.or]: [
              { entities: { [Op.not]: null } },
              { entities: { [Op.ne]: '{}' } }
            ]
          }
        ]
      }
    });

    let docsWithPlaces = 0;
    locationDocs.forEach(doc => {
      const plainDoc = doc.get({ plain: true });
      let entities = plainDoc.entities;
      
      if (typeof entities === 'string') {
        try {
          entities = JSON.parse(entities);
        } catch (e) {
          entities = {};
        }
      }
      
      if (entities?.places && entities.places.length > 0) {
        docsWithPlaces++;
      }
    });

    console.log(`\n📊 Summary:`);
    console.log(`Total documents with entities: ${locationDocs.length}`);
    console.log(`Documents with location data: ${docsWithPlaces}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testGeotagging();
