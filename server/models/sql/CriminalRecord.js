import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export const CriminalRecordSQL = sequelize.define('CriminalRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  personName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  hasRecord: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  riskLevel: {
    type: DataTypes.ENUM('none', 'low', 'medium', 'high', 'critical'),
    defaultValue: 'none'
  },
  convictionCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  activeWarrants: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastKnownLocation: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  checkCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastChecked: {
    type: DataTypes.DATE,
    allowNull: true
  },
  courtCases: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  relatedDocuments: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  agencies: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
}, {
  tableName: 'criminal_records',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['name', 'has_record']
    },
    {
      fields: ['risk_level', 'has_record']
    },
    {
      fields: ['last_checked']
    },
    {
      fields: ['person_name']
    }
  ]
});

export default CriminalRecordSQL;
