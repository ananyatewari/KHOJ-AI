import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export const AlertSQL = sequelize.define('Alert', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['entity_match', 'geo_spike', 'risk_profile', 'cross_agency', 'custom', 'event_created', 'document_created', 'new_document', 'new_ocr_document', 'new_transcription', 'criminal_match']]
    }
  },
  severity: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'medium',
    validate: {
      isIn: [['low', 'medium', 'high', 'critical']]
    }
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    defaultValue: 'unread',
    validate: {
      isIn: [['unread', 'read', 'acknowledged', 'resolved', 'dismissed']]
    }
  },
  triggered_by: {
    type: DataTypes.STRING(100),
    defaultValue: 'AI'
  },
  action_taken: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  related_event_id: {
    type: DataTypes.STRING(24),
    allowNull: true
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  acknowledged_by_user_id: {
    type: DataTypes.STRING(24),
    allowNull: true
  },
  acknowledged_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  details_json: {
    type: DataTypes.JSONB,
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
      fields: ['severity', 'created_at']
    },
    {
      fields: ['type', 'status']
    },
    {
      fields: ['expires_at']
    },
    {
      fields: ['created_at']
    }
  ]
});

export default AlertSQL;
