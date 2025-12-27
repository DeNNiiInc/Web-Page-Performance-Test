const db = require('./lib/db');

(async () => {
  console.log('Testing DB connectivity...');
  try {
    const client = await db.pool.connect();
    console.log('Successfully connected to PostgreSQL!');
    client.release();
    
    console.log('Initializing Schema...');
    await db.initSchema();
    console.log('Schema Check Complete.');
  } catch (err) {
    console.error('DB Connection Failed:', err);
  } finally {
    process.exit();
  }
})();
