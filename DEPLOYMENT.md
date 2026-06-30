# AUS Ticket Lanka — Live hosting guide

This project is **three applications + one database**, deployed together:

| Part | Tech | Default path | Purpose |
|------|------|--------------|---------|
| **Frontend** | Next.js 16 | `/` | Public website |
| **API** | PHP 8.1+ | `/api` | Listings, auth, settings, media |
| **Admin** | Node.js (AdminJS) | `/admin` | Content management |
| **Database** | MySQL 8+ / MariaDB 10.6+ | — | `aus-booking` |
| **Uploads** | Files on disk | `Upload/` | Posters, logos, blog images, etc. |

---

## 1. Recommended production layout

Use **one domain** with a reverse proxy (Nginx or Apache). Example:

```
https://www.yoursite.com/          → Next.js (port 3000)
https://www.yoursite.com/api/      → PHP API
https://www.yoursite.com/admin/    → AdminJS (port 3001)
```

All three apps share the same repo root. The `Upload/` folder must be writable and reachable by both **API** and **Admin**.

```
/var/www/austicket/
├── frontend/          # Next.js app
├── api/               # PHP API
├── admin/             # AdminJS app
├── db/                # SQL migrations
└── Upload/            # User uploads (create if missing, chmod 775)
```

---

## 2. Server requirements

| Requirement | Version |
|-------------|---------|
| Node.js | 20 LTS or newer |
| npm | 10+ |
| PHP | 8.1+ with `pdo_mysql`, `json`, `mbstring` |
| Web server | Nginx **or** Apache with `mod_rewrite` |
| PHP handler | PHP-FPM (Nginx) or Apache module |
| MySQL | 8.0+ or MariaDB 10.6+ |
| RAM | 2 GB minimum (4 GB+ recommended for AdminJS build) |
| Disk | Depends on uploads; allow room for images |

---

## 3. Database setup

### 3.1 Create database and user

```sql
CREATE DATABASE `aus-booking`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'austicket'@'localhost' IDENTIFIED BY 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON `aus-booking`.* TO 'austicket'@'localhost';
FLUSH PRIVILEGES;
```

### 3.2 Run migrations (in order)

From the project root, run each file in `db/` **in numeric order**:

```
db/000_create_database.sql
db/001_init.sql
db/003_promotions.sql
db/004_places_google_map_link.sql
db/005_casts.sql
db/006_country_flags.sql
db/007_site_settings.sql
db/008_admin_role_permissions_seed.sql
db/008_listing_detail_banner.sql
db/009_footer_settings.sql
db/010_blogs.sql
db/010_blogs_permissions.sql
db/011_blogs_drop_schedule_columns.sql
db/012_repair_show_times.sql
db/013_header_settings.sql
db/014_partners_settings.sql
db/015_page_visits_visited_at.sql
db/016_youtube_carousel_settings.sql
```

Example (Linux):

```bash
for f in db/000_create_database.sql db/001_init.sql db/003_*.sql db/004_*.sql \
  db/005_*.sql db/006_*.sql db/007_*.sql db/008_*.sql db/009_*.sql \
  db/010_*.sql db/011_*.sql db/012_*.sql db/013_*.sql db/014_*.sql \
  db/015_*.sql db/016_*.sql; do
  mysql -u austicket -p aus-booking < "$f"
done
```

> **Production:** Do **not** run `db/002_seed_dev.sql` on a live site. Create your own admin account instead (see §7).

---

## 4. Configuration files

### 4.1 PHP API — `api/config.php`

Edit before going live:

```php
<?php
declare(strict_types=1);

define('host', 'localhost');        // DB host
define('user', 'austicket');        // DB user
define('pwd', 'STRONG_PASSWORD');   // DB password
define('db', 'aus-booking');

// MUST change in production — use a long random string (32+ chars)
define('JWT_SECRET', 'replace-with-random-secret');
define('JWT_ISSUER', 'aus-ticket-lanka');
define('JWT_ACCESS_TTL_SECONDS', 900);
define('JWT_REFRESH_TTL_SECONDS', 60 * 60 * 24 * 30);

// Add your live domain(s) — required for browser login & API calls from frontend
define('CORS_ALLOW_ORIGINS', [
  'https://www.yoursite.com',
  'https://yoursite.com',
  // If admin is on same domain, include it too (usually same origin, no CORS needed)
]);
```

**Health check:** `GET https://www.yoursite.com/api/` should return JSON.

**Media URL:** Images are served at `GET /api/media/{path}` from the repo `Upload/` folder.

---

### 4.2 Admin — `admin/.env`

Create `admin/.env`:

```env
# Server
PORT=3001
NODE_ENV=production

# Database (same as API)
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=austicket
DB_PASSWORD=STRONG_PASSWORD
DB_NAME=aus-booking

# MUST change — long random string, at least 32 characters
SESSION_SECRET=replace-with-random-session-secret

# Optional: AdminJS bundle cache directory
# ADMIN_JS_TMP_DIR=.adminjs
```

---

### 4.3 Frontend — `frontend/.env.local` (build time)

Create `frontend/.env.local` **before** `npm run build`:

```env
# Public API base URL (must match your live domain)
NEXT_PUBLIC_API_BASE=https://www.yoursite.com/api

# Where listing/blog/partner images are loaded from
NEXT_PUBLIC_UPLOADS_BASE=https://www.yoursite.com/api/media

# Optional: only if you serve admin uploads directly (usually not needed)
# NEXT_PUBLIC_ADMIN_UPLOADS_BASE=https://www.yoursite.com/admin/uploads-root
```

> These `NEXT_PUBLIC_*` values are baked into the client bundle at **build time**. Rebuild frontend after changing them.

---

## 5. Build & install

Run on the server (or in CI) from the project root:

### 5.1 Frontend

```bash
cd frontend
npm ci
npm run build
```

Run in production:

```bash
NODE_ENV=production npm run start
# Listens on port 3000 by default
```

### 5.2 Admin

```bash
cd admin
npm ci
npm run build:bundle    # Builds AdminJS custom components bundle
```

Run in production (Linux/macOS):

```bash
cd admin
NODE_ENV=production NODE_OPTIONS=--max-old-space-size=4096 node src/server.js
```

On Windows PowerShell:

```powershell
cd admin
npm run start
```

Admin listens on `PORT` (default **3001**) at path **`/admin`**.

> After changing any file in `admin/src/components/`, run `npm run build:bundle` and restart admin.

### 5.3 API (PHP)

No build step. Ensure:

- `api/` is web-accessible at `/api`
- `api/.htaccess` is enabled (Apache) or equivalent Nginx rules (see §6)
- PHP can read/write `Upload/` (for any server-side file ops)

```bash
mkdir -p Upload
chmod 775 Upload
# chown www-data:www-data Upload   # Linux: match your web server user
```

---

## 6. Reverse proxy examples

### 6.1 Nginx (recommended)

```nginx
server {
    listen 443 ssl http2;
    server_name www.yoursite.com;

    ssl_certificate     /etc/letsencrypt/live/www.yoursite.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.yoursite.com/privkey.pem;

    client_max_body_size 32M;

    # Next.js frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # PHP API
    location /api {
        alias /var/www/austicket/api;
        try_files $uri $uri/ @api;

        location ~ \.php$ {
            include fastcgi_params;
            fastcgi_param SCRIPT_FILENAME /var/www/austicket/api/index.php;
            fastcgi_param PATH_INFO $fastcgi_path_info;
            fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        }
    }

    location @api {
        rewrite ^/api/(.*)$ /api/index.php last;
    }

    # AdminJS
    location /admin {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name www.yoursite.com yoursite.com;
    return 301 https://www.yoursite.com$request_uri;
}
```

> Adjust PHP-FPM socket path and file paths for your server.

**Alternative (Apache for API only):** Point `/api` to the `api/` folder with `AllowOverride All` so `.htaccess` routing works.

---

## 7. First admin login (production)

Do **not** rely on the dev seed password. Create an admin manually:

1. Generate a bcrypt hash for your password (Node):

   ```bash
   node -e "import bcrypt from 'bcryptjs'; console.log(bcrypt.hashSync('YourSecurePassword', 10))"
   ```

2. Insert into MySQL:

   ```sql
   INSERT INTO admins (role_id, name, email, password_hash, is_active)
   SELECT r.id, 'Site Admin', 'you@yourcompany.com', '$2b$10$....yourhash....', 1
   FROM admin_roles r WHERE r.name = 'main_admin' LIMIT 1;
   ```

3. Open `https://www.yoursite.com/admin` and sign in.

The admin server auto-syncs **main_admin** permissions on startup.

---

## 8. Process management (keep apps running)

Use **PM2** or **systemd** so Node apps restart after reboot.

### PM2 example

```bash
npm install -g pm2

cd /var/www/austicket/frontend
pm2 start npm --name austicket-web -- start

cd /var/www/austicket/admin
pm2 start src/server.js --name austicket-admin \
  --node-args="--max-old-space-size=4096" \
  --env production

pm2 save
pm2 startup
```

---

## 9. Production checklist

Before going live, confirm:

- [ ] **HTTPS** enabled on the public domain
- [ ] `JWT_SECRET` changed in `api/config.php`
- [ ] `SESSION_SECRET` changed in `admin/.env`
- [ ] Strong DB password; dev seed (`002_seed_dev.sql`) not used
- [ ] `CORS_ALLOW_ORIGINS` includes your live frontend URL(s)
- [ ] `NEXT_PUBLIC_API_BASE` and `NEXT_PUBLIC_UPLOADS_BASE` point to live URLs
- [ ] Frontend rebuilt after env changes (`npm run build`)
- [ ] Admin bundle built (`npm run build:bundle`)
- [ ] `Upload/` folder exists and is writable
- [ ] All SQL migrations applied
- [ ] Firewall: only ports 80/443 public; 3000/3001 bound to localhost
- [ ] Backups: database + `Upload/` folder scheduled

---

## 10. Environment variable reference

### Frontend (`frontend/.env.local`)

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `NEXT_PUBLIC_API_BASE` | Yes | `https://www.yoursite.com/api` | API root URL |
| `NEXT_PUBLIC_UPLOADS_BASE` | Yes | `https://www.yoursite.com/api/media` | Image CDN/base |
| `NEXT_PUBLIC_ADMIN_UPLOADS_BASE` | No | — | Fallback upload base |
| `NEXT_DIST_DIR` | No | `.next` | Custom build output path |

### Admin (`admin/.env`)

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `PORT` | No | `3001` | Admin server port |
| `NODE_ENV` | Yes | `production` | |
| `DB_HOST` | Yes | `127.0.0.1` | |
| `DB_PORT` | No | `3306` | |
| `DB_USER` | Yes | `root` | |
| `DB_PASSWORD` | Yes | — | |
| `DB_NAME` | Yes | `aus-booking` | |
| `SESSION_SECRET` | Yes | — | Cookie signing |
| `ADMIN_JS_TMP_DIR` | No | `.adminjs` | Bundle cache dir |

### API (`api/config.php`)

| Constant | Required | Notes |
|----------|----------|-------|
| `host`, `user`, `pwd`, `db` | Yes | MySQL connection |
| `JWT_SECRET` | Yes | Auth token signing |
| `JWT_ISSUER` | No | Token issuer claim |
| `CORS_ALLOW_ORIGINS` | Yes | Allowed browser origins |

---

## 11. Alternative: split hosting

You *can* host parts separately, but configuration is harder:

| Component | Host example | Config change |
|-----------|--------------|---------------|
| Frontend | Vercel / Netlify | Set `NEXT_PUBLIC_*` to external API URL |
| API | Shared PHP hosting | Update `CORS_ALLOW_ORIGINS`; upload `api/` + `Upload/` |
| Admin | VPS | `DB_*` points to remote MySQL; restrict `/admin` by IP or VPN |

**Caveats:**

- Frontend and API must share CORS + cookie rules if auth is used cross-domain
- Upload paths must stay consistent between admin saves and API media URLs
- AdminJS on a subdomain needs proxy or separate `rootPath` changes (not supported out of the box)

**Single-server deployment (§1) is strongly recommended.**

---

## 12. Updates & maintenance

### Deploy code update

```bash
git pull
cd frontend && npm ci && npm run build && pm2 restart austicket-web
cd ../admin && npm ci && npm run build:bundle && pm2 restart austicket-admin
# API: no build; ensure config.php unchanged or re-applied
```

### Database update

Apply new files in `db/` in order, then restart admin (runs schema helpers on boot).

### Logs

- **Frontend:** PM2 logs / `pm2 logs austicket-web`
- **Admin:** PM2 logs / console output on startup
- **API:** PHP-FPM / Apache error log
- **MySQL:** standard MySQL slow/error logs

---

## 13. Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| Site loads but no listings | API unreachable | Check `NEXT_PUBLIC_API_BASE`, PHP-FPM, Nginx `/api` routing |
| Images broken | Wrong uploads base | Set `NEXT_PUBLIC_UPLOADS_BASE=https://domain/api/media` and rebuild |
| Admin 503 on custom pages | Missing bundle | Run `npm run build:bundle` in `admin/` |
| Login fails on frontend | CORS / JWT | Add domain to `CORS_ALLOW_ORIGINS`; check `JWT_SECRET` |
| Admin login fails | DB / session | Verify `DB_*` and `SESSION_SECRET`; check `admins` table |
| 401 on `/api/me` | Auth header not passed | Ensure Nginx/Apache forwards `Authorization` (see `api/.htaccess`) |
| Settings slow to update on site | ISR cache (60s) | Wait up to 1 minute after admin save, or restart frontend |

---

## 14. Quick local → live mapping

| Local (XAMPP) | Production |
|---------------|------------|
| `http://localhost:3000` | `https://www.yoursite.com` |
| `http://localhost/api` | `https://www.yoursite.com/api` |
| `http://localhost:3001/admin` | `https://www.yoursite.com/admin` |
| `http://localhost/api/media` | `https://www.yoursite.com/api/media` |
| MySQL `root` / no password | Dedicated DB user + strong password |

---

## 15. Support files in this repo

- `api/README.md` — API endpoints overview
- `admin/README.md` — Admin local setup
- `db/*.sql` — Database schema and migrations

For questions about server choice: a **Linux VPS** (DigitalOcean, Linode, AWS Lightsail, etc.) with Nginx + PHP-FPM + Node + MySQL is the simplest path for this stack.
