import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';
import UserSQL from './User.js';

export const SessionSQL = sequelize.define('Session', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  token: {
    type: DataTypes.STRING(500),
    unique: true,
    allowNull: false
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'sessions',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['token']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['expires_at']
    }
  ]
});

UserSQL.hasMany(SessionSQL, { foreignKey: 'user_id', as: 'sessions' });
SessionSQL.belongsTo(UserSQL, { foreignKey: 'user_id', as: 'user' });

export default SessionSQL;
