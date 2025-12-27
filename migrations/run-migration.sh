#!/bin/bash
# Database Migration Script for Multi-Run Support
# Run this on the production server to apply schema changes

set -e  # Exit on error

echo "=== Multi-Run Statistics Migration ==="
echo "Starting database migration..."

# Database connection details
DB_HOST="202.171.184.108"
DB_USER="postgres"
DB_NAME="WebPerformance"
DB_PORT="5432"

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
MIGRATION_FILE="$SCRIPT_DIR/001_multi_run_support.sql"

# Check if migration file exists
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "Migration file: $MIGRATION_FILE"
echo "Target database: $DB_NAME on $DB_HOST"
echo ""
read -p "Continue with migration? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Migration cancelled"
    exit 0
fi

# Run migration
echo "Applying migration..."
PGPASSWORD='X@gon2005!#$' psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -p "$DB_PORT" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "New tables/columns created:"
    echo "  - test_suites (new table)"
    echo "  - test_results.suite_id (new column)"
    echo "  - test_results.run_number (new column)"
    echo "  - test_results.is_median (new column)"
    echo ""
    echo "You can now deploy the application code."
else
    echo ""
    echo "❌ Migration failed!"
    echo "Please check the error messages above."
    exit 1
fi
