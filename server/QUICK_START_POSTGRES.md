# Quick Start: PostgreSQL Authentication

## 5-Minute Setup

### 1. Install Dependencies
```bash
cd server
npm install pg sequelize
```

### 2. Install PostgreSQL
- **Windows**: Download from https://www.postgresql.org/download/windows/
- Run installer, set password for `postgres` user
- Keep default port `5432`

### 3. Create Database
```bash
psql -U postgres
CREATE DATABASE khoj_db;
\q
```

### 4. Update .env File
```env
# Add these lines to your .env file
USE_POSTGRES=false
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=khoj_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password_here
```

### 5. Test (MongoDB Mode)
```bash
npm start
```
Should work exactly as before ✓

### 6. Enable PostgreSQL
Stop server, then update `.env`:
```env
USE_POSTGRES=true
```

Start server again:
```bash
npm start
```

You should see:
```
PostgreSQL connected successfully
PostgreSQL enabled for authentication
```

### 7. Migrate Users
```bash
node scripts/migrate-users-to-postgres.js
```

### 8. Test Login
Login with existing credentials - should work seamlessly!

## Rollback
If anything breaks:
```env
USE_POSTGRES=false
```
Restart server - back to MongoDB instantly!

## What Changed?
- ✅ User authentication now uses PostgreSQL
- ✅ All other data still in MongoDB
- ✅ Can switch between databases with one variable
- ✅ Zero code changes needed in frontend
- ✅ Backward compatible

## Files Added
- `config/database.js` - PostgreSQL connection
- `models/sql/User.js` - SQL user model
- `routes/auth-postgres.js` - New auth routes
- `scripts/migrate-users-to-postgres.js` - Migration tool

## Need Help?
See `POSTGRES_MIGRATION_GUIDE.md` for detailed documentation.
