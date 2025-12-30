import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import CriminalRecordSQL from "./CriminalRecord.js";

const CriminalAliasSQL = sequelize.define(
  "CriminalAlias",
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
    alias_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    tableName: "criminal_aliases",
    timestamps: false,
    indexes: [
      {
        fields: ["criminal_id"],
      },
      {
        fields: ["alias_name"],
      },
    ],
  }
);

CriminalAliasSQL.belongsTo(CriminalRecordSQL, {
  foreignKey: "criminal_id",
  as: "criminalRecord",
});

CriminalRecordSQL.hasMany(CriminalAliasSQL, {
  foreignKey: "criminal_id",
  as: "aliases",
});

export default CriminalAliasSQL;
