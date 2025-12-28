# Web Performance Test - Quick Start Guide

This guide will help you deploy the Web Performance Test application in minutes.

## 🚀 Quick Setup (3 Steps)

### 1. Clone and Install

```bash
git clone https://github.com/DeNNiiInc/Web-Page-Performance-Test.git
cd Web-Page-Performance-Test
npm install
```

### 2. Configure Database

Create your database configuration file:

```bash
cp lib/db-config.template.js lib/db-config.js
```

Edit `lib/db-config.js` with your PostgreSQL credentials:

```javascript
module.exports = {
  host: 'YOUR_DATABASE_HOST',     // e.g., 'localhost' or '172.16.69.219'
  user: 'postgres',               // Database username
  password: 'YOUR_PASSWORD',      // Database password
  database: 'webperformance',     // Database name
  port: 5432,                     // Default PostgreSQL port
};
```

### 3. Initialize Database

Run the database initialization script:

```bash
node lib/db.js
```

This will create the required database table and indexes.

### 4. Start the Application

#### Development Mode:
```bash
npm start
```

#### Production Mode (with PM2):
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the instructions to enable auto-start
```

The application will be available at `http://localhost:3000`

## 📋 Prerequisites

- **Node.js** v14 or higher
- **PostgreSQL** v12 or higher
- **Chrome/Chromium** (installed automatically with puppeteer)

## 🗄️ Database Setup

If you need to set up PostgreSQL from scratch:

### On Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Create Database:
```bash
sudo -u postgres psql
```

```sql
CREATE DATABASE webperformance;
ALTER USER postgres PASSWORD 'your_password_here';
\q
```

### Configure Remote Access (if needed):

Edit PostgreSQL configuration:
```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
```

Add or uncomment:
```ini
listen_addresses = '*'
```

Edit access control:
```bash
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Add:
```
host all all 0.0.0.0/0 scram-sha-256
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

## 🔧 Configuration

### Environment Variables (Optional)

You can set these environment variables for additional configuration:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

### PM2 Configuration

The `ecosystem.config.js` file contains PM2 configuration. You can customize:
- Instance name
- Number of instances
- Memory limits
- Log locations

## 📁 Project Structure

```
Web-Page-Performance-Test/
├── server.js              # Express server
├── index.html             # Main interface
├── waterfall.html         # Network waterfall visualization
├── images.html            # Filmstrip gallery
├── compare.html           # Test comparison tool
├── lib/                   # Core modules
│   ├── runner.js          # Lighthouse test runner
│   ├── db.js              # Database setup
│   └── db-config.js       # Database credentials (not in git)
├── migrations/            # Database migrations
└── docs/                  # Additional documentation
```

## 🐛 Troubleshooting

### Database Connection Issues

**Error: `connect ECONNREFUSED`**
- Verify PostgreSQL is running: `systemctl status postgresql`
- Check database credentials in `lib/db-config.js`
- Verify pg_hba.conf allows connection from your IP

**Error: `password authentication failed`**
- Reset PostgreSQL password:
  ```bash
  sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'new_password';"
  ```

### Chrome/Puppeteer Issues

**Error: `Failed to launch chrome`**
- Install required dependencies:
  ```bash
  sudo apt install -y chromium-browser chromium-chromedriver
  ```

### Port Already in Use

**Error: `EADDRINUSE: address already in use`**
- Change the port in `server.js` or:
  ```bash
  PORT=3001 npm start
  ```

## 📚 Additional Documentation

- **Full Deployment Guide**: See `DEPLOYMENT.md`
- **Proxmox Deployment**: See `PROXMOX_DEPLOY_TEMPLATE.md`
- **API Documentation**: See `docs/API.md`

## 🔒 Security Notes

- Never commit `lib/db-config.js` to version control (it's in `.gitignore`)
- Use strong passwords for database access
- Consider restricting database access to specific IPs in production
- Keep dependencies updated: `npm audit fix`

## 📝 License

GPL v3 - See LICENSE file for details
