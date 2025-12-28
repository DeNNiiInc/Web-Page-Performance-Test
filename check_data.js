const { Pool } = require('pg');
const config = require('./lib/db-config');
const pool = new Pool(config);

async function checkData() {
    console.log(`🔎 Checking data in ${config.database}...`);
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT COUNT(*) FROM test_results');
        console.log(`📊 Total Test Results: ${res.rows[0].count}`);
        
        if (parseInt(res.rows[0].count) > 0) {
            const recent = await client.query('SELECT id, url, timestamp FROM test_results ORDER BY timestamp DESC LIMIT 5');
            console.log('🕒 Most Recent Entries:');
            console.table(recent.rows);
        } else {
            console.warn('⚠️  Table is empty!');
        }
        
        client.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Query Failed:', err.message);
        process.exit(1);
    }
}

checkData();
