const { Pool } = require('pg');
const dbConfig = require('./db-config');

const pool = new Pool(dbConfig);

async function initSchema() {
  const client = await pool.connect();
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS test_results (
        id UUID PRIMARY KEY,
        url TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        is_mobile BOOLEAN NOT NULL,
        scores JSONB NOT NULL,
        metrics JSONB NOT NULL,
        user_uuid TEXT NOT NULL,
        user_ip TEXT NOT NULL,
        filmstrip JSONB
      );
    `;
    await client.query(query);
    console.log("Schema initialized: test_results table ready.");
  } catch (err) {
    console.error("Error initializing schema:", err);
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initSchema
};
