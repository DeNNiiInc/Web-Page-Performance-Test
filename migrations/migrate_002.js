const db = require('../lib/db');
const fs = require('fs');
const path = require('path');

const migrationFile = path.join(__dirname, '002_add_filmstrip.sql');

async function runMigration() {
  try {
    console.log('Reading migration file:', migrationFile);
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log('Applying migration...');
    await db.pool.query(sql);
    
    console.log('✅ Migration 002 applied successfully!');
    process.exit(0);
  } catch (err) {
    if (err.code === '42701') { // duplicate_column
        console.log('⚠️ Column already exists. Skipping.');
        process.exit(0);
    }
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
