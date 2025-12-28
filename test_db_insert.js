const { Pool } = require('pg');
const config = require('./lib/db-config');
const crypto = require('crypto');

const pool = new Pool(config);

async function testInsert() {
    console.log('🧪 Testing Manual Insert...');
    const client = await pool.connect();
    
    try {
        const testId = crypto.randomUUID();
        const query = `
            INSERT INTO test_results (
                id, url, user_uuid, is_mobile, 
                scores, metrics, filmstrip, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING id
        `;
        
        const values = [
            testId,
            'https://example.com',
            'test-user-uuid',
            false,
            JSON.stringify({ performance: 100 }),
            JSON.stringify({ lcp: 500 }),
            JSON.stringify([])
        ];
        
        console.log('📝 Executing Query:', query);
        console.log('📄 Values:', values);

        const res = await client.query(query, values);
        console.log('✅ Insert Successful! ID:', res.rows[0].id);
        
        const countRes = await client.query('SELECT COUNT(*) FROM test_results');
        console.log('📊 New Row Count:', countRes.rows[0].count);

    } catch (err) {
        console.error('❌ Insert Failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

testInsert();
