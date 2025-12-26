#!/usr/bin/env node
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import Transcription from '../models/Transcription.js';

async function migrate() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/khoj';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB for migration');

  const cursor = Transcription.find({ 'aiSummary': { $exists: true } }).cursor();
  let count = 0;
  for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
    const old = doc.aiSummary || {};

    // Detect old schema (keyDiscussionPoints etc) and skip if already in new schema
    const isOld = !!(old.keyDiscussionPoints || old.decisionsMade || old.actionItems || old.takeaways);
    const isNew = !!(old.keyFindings || old.entityInsights || old.analystTakeaways);
    if (!isOld || isNew) continue;

    const newSummary = {
      executiveSummary: old.executiveSummary || old.summary || '',
      keyFindings: old.keyDiscussionPoints || old.key_points || [],
      entityInsights: {
        persons: (doc.entities?.persons || []).map(p => p.text),
        places: (doc.entities?.places || []).map(p => p.text),
        organizations: (doc.entities?.organizations || []).map(o => o.text)
      },
      analystTakeaways: old.takeaways || []
    };

    doc.aiSummary = newSummary;
    await doc.save();
    count++;
    if (count % 50 === 0) console.log(`Migrated ${count} records...`);
  }

  console.log(`Migration complete. ${count} records migrated.`);
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
