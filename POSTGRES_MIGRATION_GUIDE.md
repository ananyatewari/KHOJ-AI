# PostgreSQL Migration Guide for User Authentication

This guide will help you migrate user authentication from MongoDB to PostgreSQL without breaking your existing application.

## Overview

The migration has been implemented with a **dual-database approach** that allows you to:
- Keep MongoDB running for all other data (documents, events, alerts, etc.)
- Use PostgreSQL specifically for user authentication
- Switch between MongoDB and PostgreSQL with a single environment variable
- Maintain backward compatibility with MongoDB as a fallback

## Prerequisites

1. **PostgreSQL Installation**
   - Download and install PostgreSQL from: https://www.postgresql.org/download/
   - During installation, remember your postgres user password
   - Default port is 5432

2. **Node.js Dependencies**
   ```bash
   cd server
   npm install pg sequelize
   ```

## Step-by-Step Migration

### Step 1: Install PostgreSQL

**Windows:**
1. Download PostgreSQL installer from postgresql.org
2. Run the installer
3. Set a password for the postgres user (remember this!)
4. Keep default port 5432
5. Complete installation

**Verify Installation:**
```bash
psql --version
```

### Step 2: Create Database

Open PostgreSQL command line (psql) or pgAdmin and run:

```sql
CREATE DATABASE khoj_db;
```

Or use command line:
```bash
psql -U postgres
CREATE DATABASE khoj_db;
\q
```

### Step 3: Configure Environment Variables

Update your `.env` file in the `server` directory:

```env
# Keep existing MongoDB connection
MONGO_URI=mongodb://localhost:27017/khoj

# Add PostgreSQL configuration
USE_POSTGRES=false
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=khoj_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_actual_password_here

# Keep existing JWT secret
JWT_SECRET=your_jwt_secret_here
```

**Important:** Set `USE_POSTGRES=false` initially to test the setup without breaking existing functionality.

### Step 4: Test PostgreSQL Connection

Start your server with PostgreSQL disabled to ensure nothing breaks:

```bash
cd server
npm start
```

You should see:
```
Mongo connected
Server running on 3000
```

Your application should work exactly as before.

### Step 5: Enable PostgreSQL (Test Mode)

1. Stop your server (Ctrl+C)
2. Update `.env`:
   ```env
   USE_POSTGRES=true
   ```
3. Start server again:
   ```bash
   npm start
   ```

You should see:
```
Mongo connected
PostgreSQL connected successfully
PostgreSQL models synchronized
PostgreSQL enabled for authentication
Server running on 3000
```

### Step 6: Migrate Existing Users

Run the migration script to copy all users from MongoDB to PostgreSQL:

```bash
cd server
node scripts/migrate-users-to-postgres.js
```

Expected output:
```
Starting user migration from MongoDB to PostgreSQL...

✓ Connected to MongoDB
✓ Connected to PostgreSQL
✓ PostgreSQL tables synchronized

Found X users in MongoDB

✓ Migrated user: admin (Police Department)
✓ Migrated user: officer1 (FBI)
...

=== Migration Summary ===
Total users in MongoDB: X
Successfully migrated: X
Skipped (already exist): 0
Errors: 0

Total users in PostgreSQL: X

✓ Migration completed successfully!
```

### Step 7: Test Authentication

1. **Test Login with Existing User:**
   - Open your application frontend
   - Try logging in with an existing username/password
   - Should work seamlessly

2. **Test New User Registration:**
   - Create a new user through signup
   - New user will be created in PostgreSQL
   - Login should work immediately

3. **Verify Database:**
   ```sql
   -- Connect to PostgreSQL
   psql -U postgres -d khoj_db
   
   -- Check users table
   SELECT * FROM users;
   
   -- You should see all migrated users
   ```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  agency VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Sessions Table (for future use)
```sql
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Rollback Plan

If you encounter any issues, you can instantly rollback:

1. Stop your server
2. Update `.env`:
   ```env
   USE_POSTGRES=false
   ```
3. Start server again

Your application will immediately switch back to MongoDB authentication.

## How It Works

### Dual-Database Architecture

```
┌─────────────────────────────────────┐
│         Your Application            │
├─────────────────────────────────────┤
│                                     │
│  USE_POSTGRES=true                  │
│       ↓                             │
│  ┌──────────────┐  ┌─────────────┐ │
│  │  PostgreSQL  │  │   MongoDB   │ │
│  │   (Users)    │  │  (All else) │ │
│  └──────────────┘  └─────────────┘ │
│                                     │
│  USE_POSTGRES=false                 │
│       ↓                             │
│  ┌──────────────┐  ┌─────────────┐ │
│  │  PostgreSQL  │  │   MongoDB   │ │
│  │   (Unused)   │  │ (Everything)│ │
│  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────┘
```

### Authentication Flow

**With PostgreSQL Enabled:**
1. User attempts login
2. System checks PostgreSQL for user
3. If not found, falls back to MongoDB (for safety)
4. JWT token generated and returned

**With PostgreSQL Disabled:**
1. User attempts login
2. System checks MongoDB for user
3. JWT token generated and returned

## Files Created

### Configuration
- `server/config/database.js` - PostgreSQL connection setup

### Models
- `server/models/sql/User.js` - PostgreSQL User model
- `server/models/sql/Session.js` - PostgreSQL Session model (for future)

### Routes
- `server/routes/auth-postgres.js` - New auth routes with PostgreSQL support

### Scripts
- `server/scripts/migrate-users-to-postgres.js` - Migration utility

### Documentation
- `POSTGRES_MIGRATION_GUIDE.md` - This file

## Benefits of PostgreSQL for Authentication

1. **ACID Compliance** - Guaranteed data consistency for user accounts
2. **Better Security** - Row-level security, audit logging capabilities
3. **Referential Integrity** - Foreign keys ensure data relationships
4. **Session Management** - Built-in support for complex session tracking
5. **Performance** - Faster queries for user lookups and authentication
6. **Scalability** - Better for high-concurrency authentication scenarios

## Troubleshooting

### Error: "Unable to connect to PostgreSQL"
- Check if PostgreSQL service is running
- Verify credentials in `.env` file
- Test connection: `psql -U postgres -d khoj_db`

### Error: "relation 'users' does not exist"
- Database tables not created
- Restart server to trigger `sequelize.sync()`
- Or manually run migration script

### Users can't login after migration
- Verify migration completed successfully
- Check PostgreSQL has all users: `SELECT COUNT(*) FROM users;`
- Check server logs for authentication errors
- Try setting `USE_POSTGRES=false` to verify MongoDB still works

### New users not appearing
- Check `USE_POSTGRES` environment variable
- Verify PostgreSQL connection is active
- Check server logs for errors

## Next Steps

Once PostgreSQL authentication is stable, you can:

1. **Add Session Management** - Track active user sessions in PostgreSQL
2. **Implement Role-Based Access Control (RBAC)** - Add roles and permissions tables
3. **Add Audit Logging** - Track all authentication events
4. **Migrate Alerts** - Move alerts system to PostgreSQL for better analytics
5. **Migrate Criminal Records** - Normalize court cases into relational structure

## Support

If you encounter issues:
1. Check server logs for error messages
2. Verify PostgreSQL is running: `pg_isready`
3. Test database connection: `psql -U postgres -d khoj_db`
4. Rollback to MongoDB if needed: `USE_POSTGRES=false`

## Summary

✅ **Zero Downtime Migration** - Switch with environment variable  
✅ **Backward Compatible** - MongoDB fallback always available  
✅ **Safe Migration** - Existing data preserved in both databases  
✅ **Easy Rollback** - One environment variable change  
✅ **Production Ready** - Tested dual-database approach
