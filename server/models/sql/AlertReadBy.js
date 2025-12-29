import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';
import AlertSQL from './Alert.js';

export const AlertReadBySQL = sequelize.define('AlertReadBy', {
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
  user_id: {
    type: DataTypes.STRING(24),
    allowNull: false
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'alert_read_by',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      fields: ['alert_id']
    },
    {
      fields: ['user_id']
    }
  ]
});

AlertSQL.hasMany(AlertReadBySQL, { foreignKey: 'alert_id', as: 'readByUsers' });
AlertReadBySQL.belongsTo(AlertSQL, { foreignKey: 'alert_id', as: 'alert' });

export default AlertReadBySQL;
