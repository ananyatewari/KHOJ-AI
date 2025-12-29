import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';
import AlertSQL from './Alert.js';

export const AlertDocumentSQL = sequelize.define('AlertDocument', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  alert_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'alerts',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  document_id: {
    type: DataTypes.STRING(24),
    allowNull: false
  },
  document_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      isIn: [['Document', 'OcrDocument', 'Transcription', 'CCTVVideo']]
    }
  }
}, {
  tableName: 'alert_documents',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      fields: ['alert_id']
    },
    {
      fields: ['document_id', 'document_type']
    }
  ]
});

AlertSQL.hasMany(AlertDocumentSQL, { foreignKey: 'alert_id', as: 'alertDocuments' });
AlertDocumentSQL.belongsTo(AlertSQL, { foreignKey: 'alert_id', as: 'alert' });

export default AlertDocumentSQL;
