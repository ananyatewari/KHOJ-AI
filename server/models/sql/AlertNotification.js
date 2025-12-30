import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';
import AlertSQL from './Alert.js';

export const AlertNotificationSQL = sequelize.define('AlertNotification', {
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
  agency: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  notified_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  method: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'internal',
    validate: {
      isIn: [['email', 'sms', 'internal']]
    }
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'sent',
    validate: {
      isIn: [['pending', 'sent', 'failed']]
    }
  }
}, {
  tableName: 'alert_notifications',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      fields: ['alert_id']
    },
    {
      fields: ['agency']
    },
    {
      fields: ['notified_at']
    }
  ]
});

AlertSQL.hasMany(AlertNotificationSQL, { foreignKey: 'alert_id', as: 'notifications' });
AlertNotificationSQL.belongsTo(AlertSQL, { foreignKey: 'alert_id', as: 'alert' });

export default AlertNotificationSQL;
