const { Pool } = require('pg');
const config = require('./lib/db-config');

// Force verify config is using localhost
if (config.host !== 'localhost' && config.host !== '127.0.0.1') {
    console.error(`❌ Config is NOT pointing to localhost! It is pointing to: ${config.host}`);
    console.log('Overriding to localhost for this test...');
    config.host = 'localhost';
}

const pool = new Pool(config);

async function testConnection() {
    console.log(`🔌 Testing connection to ${config.database} on ${config.host} as ${config.user}...`);
    try {
        const client = await pool.connect();
        console.log('✅ Connection Successful!');
        
        const res = await client.query('SELECT NOW() as now, current_database() as db, current_user as user');
        console.log(`📊 Connected Info:`);
        console.log(`   - Time: ${res.rows[0].now}`);
        console.log(`   - DB:   ${res.rows[0].db}`);
        console.log(`   - User: ${res.rows[0].user}`);

        // Check if table exists
        const tableCheck = await client.query("SELECT to_regclass('public.test_results') as table_exists");
        if (tableCheck.rows[0].table_exists) {
            console.log('✅ Base table "test_results" found.');
        } else {
            console.warn('⚠️  Base table "test_results" NOT FOUND. Schema might need initialization.');
        }

        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Connection Failed:', err.message);
        if (err.code === '28P01') {
            console.error('   Hint: Authentication failed. Check password.');
        } else if (err.code === '3D000') {
            console.error(`   Hint: Database "${config.database}" does not exist.`);
        }
        process.exit(1);
    }
}

testConnection();
