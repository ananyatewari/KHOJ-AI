import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import CriminalRecordSQL from "./CriminalRecord.js";

const CriminalDocumentSQL = sequelize.define(
  "CriminalDocument",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    criminal_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "criminal_records",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    document_id: {
      type: DataTypes.STRING(24),
      allowNull: false,
      comment: "MongoDB ObjectId as string",
    },
    document_type: {
      type: DataTypes.ENUM("Document", "OcrDocument", "Transcription"),
      allowNull: false,
    },
    detected_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "criminal_documents",
    timestamps: false,
    indexes: [
      {
        fields: ["criminal_id"],
      },
      {
        fields: ["document_id"],
      },
      {
        unique: true,
        fields: ["criminal_id", "document_id"],
      },
    ],
  }
);

CriminalDocumentSQL.belongsTo(CriminalRecordSQL, {
  foreignKey: "criminal_id",
  as: "criminalRecord",
});

CriminalRecordSQL.hasMany(CriminalDocumentSQL, {
  foreignKey: "criminal_id",
  as: "relatedDocuments",
});

export default CriminalDocumentSQL;
