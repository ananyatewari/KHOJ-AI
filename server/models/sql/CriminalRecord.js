import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

const CriminalRecordSQL = sequelize.define(
  "CriminalRecord",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      index: true,
    },
    has_record: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      index: true,
    },
    risk_level: {
      type: DataTypes.ENUM("none", "low", "medium", "high", "critical"),
      defaultValue: "none",
      index: true,
    },
    active_warrants: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    conviction_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    last_known_location: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    source: {
      type: DataTypes.STRING(100),
      defaultValue: "crimecheck.in",
    },
    last_checked: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      index: true,
    },
    check_count: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    metadata_json: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: "Stores dob, photoUrl, fingerprints, additionalInfo",
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
  },
  {
    tableName: "criminal_records",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["name", "has_record"],
      },
      {
        fields: ["risk_level", "has_record"],
      },
      {
        fields: ["last_checked"],
        order: [["last_checked", "DESC"]],
      },
    ],
  }
);

export default CriminalRecordSQL;
