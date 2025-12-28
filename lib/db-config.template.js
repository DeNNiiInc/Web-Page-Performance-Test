// Database Configuration Template
// Copy this file to lib/db-config.js and update with your actual credentials
// NEVER commit lib/db-config.js to Git - it's in .gitignore for security

module.exports = {
  host: 'YOUR_DATABASE_HOST',        // e.g., 'localhost' or '172.16.69.219'
  user: 'YOUR_DATABASE_USER',        // e.g., 'postgres'
  password: 'YOUR_DATABASE_PASSWORD', // Database password
  database: 'YOUR_DATABASE_NAME',    // e.g., 'webperformance'
  port: 5432,                        // Default PostgreSQL port
};
