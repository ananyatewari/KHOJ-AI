import mongoose from "mongoose";
import dotenv from "dotenv";
import { connectPostgres } from "../config/database.js";
import CriminalRecord from "../models/CriminalRecord.js";
import CriminalRecordSQL from "../models/sql/CriminalRecord.js";
import CriminalAliasSQL from "../models/sql/CriminalAlias.js";
import CourtCaseSQL from "../models/sql/CourtCase.js";
import CriminalOrganizationSQL from "../models/sql/CriminalOrganization.js";
import CriminalDocumentSQL from "../models/sql/CriminalDocument.js";

dotenv.config();

async function migrateCriminalsToPostgres() {
  try {
    console.log("Starting criminal records migration to PostgreSQL...");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Connect to PostgreSQL
    const pgConnected = await connectPostgres();
    if (!pgConnected) {
      throw new Error("Failed to connect to PostgreSQL");
    }
    console.log("✓ Connected to PostgreSQL");

    // Sync models (create tables if they don't exist)
    await CriminalRecordSQL.sync({ alter: true });
    await CriminalAliasSQL.sync({ alter: true });
    await CourtCaseSQL.sync({ alter: true });
    await CriminalOrganizationSQL.sync({ alter: true });
    await CriminalDocumentSQL.sync({ alter: true });
    console.log("✓ PostgreSQL tables synchronized");

    // Fetch all criminal records from MongoDB
    const mongoCriminals = await CriminalRecord.find({});
    console.log(`Found ${mongoCriminals.length} criminal records in MongoDB`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const mongoCriminal of mongoCriminals) {
      try {
        // Check if already exists in PostgreSQL
        const existing = await CriminalRecordSQL.findOne({
          where: { name: mongoCriminal.name }
        });

        if (existing) {
          console.log(`⊘ Skipping duplicate: ${mongoCriminal.name}`);
          skipped++;
          continue;
        }

        // Create criminal record in PostgreSQL
        const pgCriminal = await CriminalRecordSQL.create({
          name: mongoCriminal.name,
          has_record: mongoCriminal.hasRecord,
          risk_level: mongoCriminal.riskLevel || 'none',
          active_warrants: mongoCriminal.activeWarrants,
          conviction_count: mongoCriminal.convictionCount,
          last_known_location: mongoCriminal.lastKnownLocation,
          source: mongoCriminal.source,
          last_checked: mongoCriminal.lastChecked,
          check_count: mongoCriminal.checkCount,
          metadata_json: mongoCriminal.metadata || null,
          created_at: mongoCriminal.createdAt,
          updated_at: mongoCriminal.updatedAt
        });

        // Migrate aliases
        if (mongoCriminal.aliases && mongoCriminal.aliases.length > 0) {
          const aliasRecords = mongoCriminal.aliases.map(alias => ({
            criminal_id: pgCriminal.id,
            alias_name: alias
          }));
          await CriminalAliasSQL.bulkCreate(aliasRecords);
        }

        // Migrate court cases
        if (mongoCriminal.courtCases && mongoCriminal.courtCases.length > 0) {
          const courtCaseRecords = mongoCriminal.courtCases.map(courtCase => ({
            criminal_id: pgCriminal.id,
            case_number: courtCase.caseNumber,
            charges: courtCase.charges || [],
            court: courtCase.court,
            state: courtCase.state,
            filed_date: courtCase.filedDate,
            status: courtCase.status,
            verdict: courtCase.verdict,
            next_hearing: courtCase.nextHearing,
            severity: courtCase.severity,
            description: courtCase.description,
            amount_involved: courtCase.amountInvolved
          }));
          await CourtCaseSQL.bulkCreate(courtCaseRecords);
        }

        // Migrate associated organizations
        if (mongoCriminal.associatedOrganizations && mongoCriminal.associatedOrganizations.length > 0) {
          const orgRecords = mongoCriminal.associatedOrganizations.map(org => ({
            criminal_id: pgCriminal.id,
            organization_name: org
          }));
          await CriminalOrganizationSQL.bulkCreate(orgRecords);
        }

        // Migrate related documents
        if (mongoCriminal.relatedDocuments && mongoCriminal.relatedDocuments.length > 0) {
          const docRecords = mongoCriminal.relatedDocuments.map(doc => ({
            criminal_id: pgCriminal.id,
            document_id: doc.documentId.toString(),
            document_type: doc.documentType,
            detected_at: doc.detectedAt
          }));
          await CriminalDocumentSQL.bulkCreate(docRecords);
        }

        console.log(`✓ Migrated: ${mongoCriminal.name} (${mongoCriminal.courtCases?.length || 0} court cases)`);
        migrated++;

      } catch (error) {
        console.error(`✗ Error migrating ${mongoCriminal.name}:`, error.message);
        errors++;
      }
    }

    console.log("\n=== Migration Summary ===");
    console.log(`Total criminal records: ${mongoCriminals.length}`);
    console.log(`Successfully migrated: ${migrated}`);
    console.log(`Skipped (duplicates): ${skipped}`);
    console.log(`Errors: ${errors}`);
    console.log("========================\n");

    // Verify migration
    const pgCount = await CriminalRecordSQL.count();
    console.log(`PostgreSQL now has ${pgCount} criminal records`);

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
    process.exit(0);
  }
}

migrateCriminalsToPostgres();
