import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import CriminalRecordSQL from "./CriminalRecord.js";

const CriminalOrganizationSQL = sequelize.define(
  "CriminalOrganization",
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
    organization_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    tableName: "criminal_organizations",
    timestamps: false,
    indexes: [
      {
        fields: ["criminal_id"],
      },
      {
        fields: ["organization_name"],
      },
    ],
  }
);

CriminalOrganizationSQL.belongsTo(CriminalRecordSQL, {
  foreignKey: "criminal_id",
  as: "criminalRecord",
});

CriminalRecordSQL.hasMany(CriminalOrganizationSQL, {
  foreignKey: "criminal_id",
  as: "organizations",
});

export default CriminalOrganizationSQL;
