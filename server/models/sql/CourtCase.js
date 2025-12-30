import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import CriminalRecordSQL from "./CriminalRecord.js";

const CourtCaseSQL = sequelize.define(
  "CourtCase",
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
    case_number: {
      type: DataTypes.STRING(100),
      allowNull: true,
      index: true,
    },
    charges: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      comment: "Array of charges",
    },
    court: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    filed_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(
        "Trial Ongoing",
        "Under Investigation",
        "Pending",
        "Convicted",
        "Acquitted",
        "Closed",
        "Unknown"
      ),
      allowNull: true,
      index: true,
    },
    verdict: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    next_hearing: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    severity: {
      type: DataTypes.ENUM("critical", "high", "medium", "low"),
      allowNull: true,
      index: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    amount_involved: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    tableName: "court_cases",
    timestamps: false,
    indexes: [
      {
        fields: ["criminal_id"],
      },
      {
        fields: ["case_number"],
      },
      {
        fields: ["status"],
      },
      {
        fields: ["severity"],
      },
    ],
  }
);

CourtCaseSQL.belongsTo(CriminalRecordSQL, {
  foreignKey: "criminal_id",
  as: "criminalRecord",
});

CriminalRecordSQL.hasMany(CourtCaseSQL, {
  foreignKey: "criminal_id",
  as: "courtCases",
});

export default CourtCaseSQL;
