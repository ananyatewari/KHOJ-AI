import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export const AlertSQL = sequelize.define('Alert', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.ENUM(
      'entity_match', 
      'geo_spike', 
      'risk_profile', 
      'cross_agency', 
      'custom', 
      'event_created', 
      'document_created', 
      'new_document', 
      'new_ocr_document', 
      'new_transcription', 
      'criminal_match'
    ),
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('active', 'resolved', 'archived'),
    allowNull: false,
    defaultValue: 'active'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  agencies: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  details: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'alerts',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['status', 'created_at']
    },
    {
      fields: ['agencies']
    },
    {
      fields: ['severity', 'created_at']
    },
    {
      fields: ['type', 'status']
    },
    {
      fields: ['expires_at']
    }
  ]
});

export default AlertSQL;
