import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export const DocumentSQL = sequelize.define('Document', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  agency: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  uploadedBy: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  fileType: {
    type: DataTypes.STRING(50),
    defaultValue: 'pdf'
  },
  entities: {
    type: DataTypes.JSONB,
    defaultValue: {
      persons: [],
      places: [],
      dates: [],
      organizations: [],
      phoneNumbers: []
    }
  },
  aiSummary: {
    type: DataTypes.JSONB,
    defaultValue: {
      executiveSummary: '',
      keyFindings: [],
      entityInsights: {
        persons: [],
        places: [],
        organizations: []
      },
      analystTakeaways: []
    }
  },
  embedding: {
    type: DataTypes.ARRAY(DataTypes.FLOAT),
    defaultValue: []
  },
  chunks: {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    defaultValue: []
  },
  chunkEmbeddings: {
    type: DataTypes.ARRAY(DataTypes.ARRAY(DataTypes.FLOAT)),
    defaultValue: []
  },
  visibility: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  indexed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sharedWithChatbot: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  approvedForCrossAgency: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'documents',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['agency', 'created_at']
    },
    {
      fields: ['visibility', 'created_at']
    },
    {
      fields: ['file_type']
    },
    {
      fields: ['uploaded_by']
    }
  ]
});

export default DocumentSQL;
