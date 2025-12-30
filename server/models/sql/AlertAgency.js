import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';
import AlertSQL from './Alert.js';

export const AlertAgencySQL = sequelize.define('AlertAgency', {
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
  }
}, {
  tableName: 'alert_agencies',
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
      fields: ['agency', 'alert_id']
    }
  ]
});

AlertSQL.hasMany(AlertAgencySQL, { foreignKey: 'alert_id', as: 'alertAgencies' });
AlertAgencySQL.belongsTo(AlertSQL, { foreignKey: 'alert_id', as: 'alert' });

export default AlertAgencySQL;
