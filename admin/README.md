# AUS Ticket Lanka Admin (`/admin`)

Admin panel built with AdminJS. Runs as a separate Node server.

## Setup

1. Copy env:
   - `cp .env.example .env` (Windows: duplicate file)
2. Install deps:
   - `npm install`
3. Run:
   - `npm run dev`

## Login

Create admins in MySQL `admins` table. Dev seed exists in `db/002_seed_dev.sql`.\n
Default seed email: `admin@austicketlanka.local`\n
Password hash is included (adjust as needed).

