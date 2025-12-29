import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

export const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'khoj_db',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'password',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

export async function connectPostgres() {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected successfully');
    
    await sequelize.sync({ alter: false });
    console.log('PostgreSQL models synchronized');
    
    return true;
  } catch (error) {
    console.error('Unable to connect to PostgreSQL:', error.message);
    return false;
  }
}

export default sequelize;
