# AUS Ticket Lanka Admin (`/admin`)

Admin panel built with AdminJS. Runs as a separate Node server.

## Local setup (XAMPP)

1. Start **MySQL** in the XAMPP Control Panel.
2. Bootstrap the database (first time only, from repo root):
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-db.ps1
   ```
3. Copy env and install:
   ```powershell
   cd admin
   copy .env.example .env
   npm install
   ```
4. Start admin (defaults to port **3003**):
   ```powershell
   npm run dev
   ```
5. Open either:
   - `http://localhost:3003/admin` (direct), or
   - `http://localhost:3000/admin` (proxied via Next.js when frontend is running)

> **Port note:** The frontend uses port 3000. If that is busy, Next.js may move to 3001 — which conflicts with production admin port. Local admin uses **3003** to avoid this.

## Login

Dev seed is in `db/002_seed_dev.sql`.

- Email: `admin@austicketlanka.local`
- Password: see seed file comments (default dev password is documented there)

## Production

Set `PORT=3001` in `.env` when behind Nginx/Apache on the same host as the public site.
