#!/bin/bash
echo "Starting PostgreSQL Setup..."

# Ensure service is running
service postgresql start

# Set postgres user password
# Use single quotes for the inner SQL string to handle special characters if possible, 
# but password has single quote? No: X@gon2005!#$ 
# We need to escape carefully.
echo "Setting postgres user password..."
su - postgres -c "psql -c \"ALTER USER postgres PASSWORD 'X@gon2005!#$';\""

# Create Database
echo "Creating database WebPerformance..."
su - postgres -c "createdb WebPerformance" || echo "Database WebPerformance might already exist or creation failed."

# Initialize Schema using application code
echo "Initializing Database Schema..."
cd /var/www/web-page-performance-test || exit
# Ensure dependencies are installed
npm install
# Run the schema initialization function exported in lib/db.js
node -e "const db = require('./lib/db'); db.initSchema().then(() => { console.log('Schema init called'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });"

echo "PostgreSQL Setup Complete."
