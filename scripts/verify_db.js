const db = require('../lib/db');
const crypto = require('crypto');

async function testInsert() {
  const id = crypto.randomUUID();
  console.log('Testing DB Insert with ID:', id);
  try {
    const query = `
      INSERT INTO test_results (id, url, user_uuid, user_ip, is_mobile, scores, metrics, filmstrip, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `;
    const values = [
      id, 
      'http://verify.local', 
      'user_verify', 
      '127.0.0.1', 
      false, 
      JSON.stringify({performance: 100}), 
      JSON.stringify({lcp: 500}), 
      JSON.stringify([{timing: 0, data: 'data:image/jpeg...'}])
    ];

    await db.pool.query(query, values);
    console.log('✅ Insert successful!');
    
    // Check if we can read it back
    const res = await db.pool.query('SELECT * FROM test_results WHERE id = $1', [id]);
    if(res.rows.length > 0) {
        console.log('✅ Read successful:', res.rows[0].url);
        console.log('   Data:', JSON.stringify(res.rows[0].scores));
    } else {
        console.error('❌ Read failed!');
    }
    
    // Cleanup (optional, keeping it validates "filled" db, but user said "do insertions you need")
    // Let's keep one row to show "it works"? No, cleaner to clean up or let user run real test.
    // I will delete it to avoid junk.
    await db.pool.query('DELETE FROM test_results WHERE id = $1', [id]);
    console.log('✅ Cleanup successful!');
    process.exit(0);
  } catch (err) {
    console.error('❌ DB Error:', err);
    process.exit(1);
  }
}

testInsert();
