import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import UserSQL from '../models/sql/User.js';
import { sequelize, connectPostgres } from '../config/database.js';

dotenv.config();

async function migrateUsers() {
  try {
    console.log('Starting user migration from MongoDB to PostgreSQL...\n');

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    const postgresConnected = await connectPostgres();
    if (!postgresConnected) {
      throw new Error('Failed to connect to PostgreSQL');
    }
    console.log('✓ Connected to PostgreSQL\n');

    await sequelize.sync({ force: false });
    console.log('✓ PostgreSQL tables synchronized\n');

    const mongoUsers = await User.find({});
    console.log(`Found ${mongoUsers.length} users in MongoDB\n`);

    if (mongoUsers.length === 0) {
      console.log('No users to migrate. Exiting...');
      process.exit(0);
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const mongoUser of mongoUsers) {
      try {
        const existingUser = await UserSQL.findOne({
          where: { username: mongoUser.username }
        });

        if (existingUser) {
          console.log(`⊘ Skipping ${mongoUser.username} - already exists in PostgreSQL`);
          skipCount++;
          continue;
        }

        await UserSQL.create({
          username: mongoUser.username,
          password: mongoUser.password,
          agency: mongoUser.agency
        });

        console.log(`✓ Migrated user: ${mongoUser.username} (${mongoUser.agency})`);
        successCount++;
      } catch (error) {
        console.error(`✗ Error migrating ${mongoUser.username}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total users in MongoDB: ${mongoUsers.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Skipped (already exist): ${skipCount}`);
    console.log(`Errors: ${errorCount}`);

    const postgresCount = await UserSQL.count();
    console.log(`\nTotal users in PostgreSQL: ${postgresCount}`);

    await mongoose.connection.close();
    await sequelize.close();
    
    console.log('\n✓ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

migrateUsers();
