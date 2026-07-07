# Step-by-step: Namecheap shared hosting

Your project has **3 parts**. On **shared hosting** you can only run **PHP + MySQL** directly.

| Part | Where it goes on shared hosting |
|------|----------------------------------|
| **API** (`api/`) | Yes — upload to cPanel |
| **Uploads** (`Upload/`) | Yes — upload to cPanel |
| **Database** | Yes — MySQL in cPanel |
| **Frontend** (Next.js) | No — use **Vercel** (free) |
| **Admin** (Node.js) | No — use **cPanel Node.js** (if your plan has it) or a **small VPS** |

Replace `yoursite.com` with your real domain everywhere below.

---

## Overview (what you will have at the end)

```
https://www.yoursite.com          → Vercel (Next.js frontend)
https://yoursite.com/api/         → Namecheap shared (PHP API)
https://yoursite.com/api/media/   → Images from Upload folder
https://admin.yoursite.com        → Admin panel (Node — see Part 6)
```

---

## Part 1 — Prepare on your PC

### 1.1 Create a ZIP to upload

Zip these folders from your project (do **not** include `node_modules`, `.next`, or `.git`):

```
api/          → entire folder
Upload/       → entire folder (create empty if missing)
db/           → SQL files (for import only, not public web)
```

Keep `frontend/` and `admin/` for Vercel / Node hosting later.

### 1.2 Generate secrets (save in a password manager)

Use long random strings, for example:

- `JWT_SECRET` — for `api/config.php`
- `SESSION_SECRET` — for admin `.env` later

---

## Part 2 — Namecheap: log in to cPanel

1. Log in to **Namecheap** → **Hosting List** → **Manage**
2. Open **cPanel**
3. Note your:
   - **cPanel username** (e.g. `namec123`)
   - **Primary domain** (e.g. `austicketlanka.com`)
   - **Server hostname** (for FTP — e.g. `server123.web-hosting.com`)

---

## Part 3 — Create MySQL database

1. In cPanel, open **MySQL® Databases**
2. **Create database**
   - Name: `ausbooking` (cPanel will prefix it, e.g. `namec123_ausbooking`)
3. **Create user**
   - Username: `aususer`
   - Strong password → **save it**
4. **Add user to database** → check **ALL PRIVILEGES** → Make Changes
5. Write down the **full names**:
   - Database: `namec123_ausbooking`
   - User: `namec123_aususer`
   - Password: `********`
   - Host: `localhost` (for PHP on the same server)

---

## Part 4 — Import database tables

1. cPanel → **phpMyAdmin**
2. Click your database (`namec123_ausbooking`) in the left sidebar
3. **Import** tab
4. Import each SQL file from `db/` **in this order** (one file per import):

   ```
   000_create_database.sql   ← skip if DB already created in Part 3
   001_init.sql
   003_promotions.sql
   004_places_google_map_link.sql
   005_casts.sql
   006_country_flags.sql
   007_site_settings.sql
   008_admin_role_permissions_seed.sql
   008_listing_detail_banner.sql
   009_footer_settings.sql
   010_blogs.sql
   010_blogs_permissions.sql
   011_blogs_drop_schedule_columns.sql
   012_repair_show_times.sql
   013_header_settings.sql
   014_partners_settings.sql
   015_page_visits_visited_at.sql
   016_youtube_carousel_settings.sql
   ```

   > Do **not** import `002_seed_dev.sql` on a live site.

5. If import fails on `000_create_database.sql`, skip it — you already created the DB in Part 3.

---

## Part 5 — Upload API and Uploads (FTP)

### 5.1 Create FTP account (if needed)

cPanel → **FTP Accounts** → create or use main cPanel FTP login.

### 5.2 Connect with FileZilla

- Host: `server123.web-hosting.com` (your server hostname)
- Username: cPanel username
- Password: cPanel password
- Port: `21`

### 5.3 Upload to `public_html`

On the server, open **`public_html`**. Final structure **must** be:

```
public_html/
├── api/
│   ├── index.php
│   ├── config.php
│   ├── .htaccess
│   └── lib/
│       └── ...
└── Upload/
    ├── logos/
    ├── listing_...jpg
    └── ...
```

Important:

- `Upload/` is **next to** `api/`, not inside `api/`
- The API reads images from `../Upload` relative to `api/`

### 5.4 Folder permissions

In cPanel **File Manager**:

- Right-click `Upload` → **Permissions** → `755` (or `775` if uploads fail)
- Ensure `Upload` and subfolders are writable by the web server

---

## Part 6 — Configure PHP API

Edit **`public_html/api/config.php`** on the server (cPanel File Manager → Edit):

```php
<?php

declare(strict_types=1);

define('host', 'localhost');
define('user', 'namec123_aususer');      // your full DB user
define('pwd', 'YOUR_DB_PASSWORD');
define('db', 'namec123_ausbooking');       // your full DB name

define('JWT_SECRET', 'paste-long-random-secret-here');
define('JWT_ISSUER', 'aus-ticket-lanka');
define('JWT_ACCESS_TTL_SECONDS', 900);
define('JWT_REFRESH_TTL_SECONDS', 60 * 60 * 24 * 30);

define('CORS_ALLOW_ORIGINS', [
  'https://www.yoursite.com',
  'https://yoursite.com',
  'https://yoursite.vercel.app',   // remove after custom domain works
]);
```

### 6.1 Test API

Open in browser:

```
https://yoursite.com/api/
```

Expected:

```json
{"name":"aus-ticket-lanka-api","status":"ok"}
```

Then test:

```
https://yoursite.com/api/listings?country=AU
```

If you get **500 error**, check cPanel → **Errors** or **Metrics → Errors** for PHP logs.

---

## Part 7 — SSL (HTTPS)

1. cPanel → **SSL/TLS Status** or **AutoSSL**
2. Run AutoSSL for your domain (free Let’s Encrypt)
3. cPanel → **Domains** → enable **Force HTTPS Redirect**

All live URLs must use `https://`.

---

## Part 8 — Deploy frontend on Vercel (free)

Shared hosting cannot run Next.js. Use Vercel:

### 8.1 Push code to GitHub

1. Create a GitHub repository
2. Push your whole project (or at least the `frontend/` folder in a repo)

### 8.2 Import to Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up → **Add New Project**
2. Import your GitHub repo
3. **Root Directory** → set to `frontend`
4. Framework: **Next.js** (auto-detected)

### 8.3 Environment variables (Vercel project settings)

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_API_BASE` | `https://yoursite.com/api` |
| `NEXT_PUBLIC_UPLOADS_BASE` | `https://yoursite.com/api/media` |

### 8.4 Deploy

Click **Deploy**. You get a URL like `https://your-project.vercel.app`.

### 8.5 Connect your domain

1. Vercel → Project → **Settings** → **Domains**
2. Add `www.yoursite.com` and `yoursite.com`
3. Vercel shows DNS records to add

### 8.6 Namecheap DNS for frontend

Namecheap → Domain → **Advanced DNS**:

| Type | Host | Value |
|------|------|-------|
| A Record | `@` | (IP shown in cPanel for shared hosting — **keep for API**) |
| CNAME | `www` | `cname.vercel-dns.com` (use exact value from Vercel) |

**Typical setup:**

- `yoursite.com` → stays on Namecheap (API at `/api`)
- `www.yoursite.com` → Vercel (public website)

Or point both `www` and apex to Vercel if you use Vercel’s apex A records — but then `/api` must stay reachable. **Safest for beginners:**

- `www.yoursite.com` → Vercel (main site)
- `yoursite.com` → Namecheap shared (API only, or redirect www)

Update `CORS_ALLOW_ORIGINS` in `api/config.php` to match your final frontend URL.

### 8.7 Test frontend

Open `https://www.yoursite.com` — listings and images should load from `yoursite.com/api`.

---

## Part 9 — Admin panel (choose ONE option)

Admin needs **Node.js**. Shared hosting usually cannot run it like XAMPP unless your plan has **Setup Node.js App**.

### Option A — cPanel Node.js (if available)

1. cPanel → **Setup Node.js App** (or **Application Manager**)
2. Create application:
   - Node version: **20**
   - Application mode: **Production**
   - Application root: `admin` (upload `admin/` folder to home directory, e.g. `~/admin`, not inside `public_html`)
   - Application URL: `admin.yoursite.com` (create subdomain first)
   - Startup file: `src/server.js`
3. cPanel → **Subdomains** → create `admin.yoursite.com`
4. Upload `admin/` via FTP to `~/admin` (outside `public_html`)
5. SSH or cPanel **Terminal**:

   ```bash
   cd ~/admin
   npm install
   npm run build:bundle
   ```

6. Create `~/admin/.env`:

   ```env
   PORT=3001
   NODE_ENV=production
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=namec123_aususer
   DB_PASSWORD=YOUR_DB_PASSWORD
   DB_NAME=namec123_ausbooking
   SESSION_SECRET=long-random-secret
   ```

7. Start/restart the Node app in cPanel Node.js UI
8. Open `https://admin.yoursite.com/admin`

> If `npm run build:bundle` fails (out of memory), run it on your PC and upload the `.adminjs` folder.

### Option B — Small VPS only for admin (~$6/month)

If cPanel has no Node.js:

1. Get Namecheap **VPS** or use Railway/Render
2. Deploy only the `admin/` folder
3. `DB_HOST` = Namecheap **remote MySQL hostname** (cPanel → Remote MySQL → allow VPS IP)
4. Admin URL: `https://admin.yoursite.com`

### Option C — Temporary: admin on your PC only

For testing until Node hosting is ready:

- Run `cd admin && npm start` on your PC
- Use SSH tunnel or only manage content locally  
  **Not recommended for production.**

---

## Part 10 — Create live admin user

Do not use the dev password from `002_seed_dev.sql`.

1. Generate bcrypt hash on your PC:

   ```bash
   cd admin
   node -e "import('bcryptjs').then(b=>console.log(b.hashSync('YourSecurePassword123',10)))"
   ```

2. phpMyAdmin → `admins` table → **Insert** or SQL:

   ```sql
   INSERT INTO admins (role_id, name, email, password_hash, is_active)
   SELECT r.id, 'Site Admin', 'you@yoursite.com', '$2b$10$....yourhash....', 1
   FROM admin_roles r WHERE r.name = 'main_admin' LIMIT 1;
   ```

---

## Part 11 — Final checklist

- [ ] `https://yoursite.com/api/` returns OK
- [ ] `https://yoursite.com/api/listings` returns JSON
- [ ] `https://www.yoursite.com` shows homepage with listings
- [ ] Images load (`/api/media/...`)
- [ ] HTTPS on all URLs
- [ ] `JWT_SECRET` and `SESSION_SECRET` changed
- [ ] CORS includes your real frontend domain
- [ ] Admin login works
- [ ] Uploaded images in admin appear on the site

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| API 500 | Wrong DB user/password in `config.php`; check cPanel error log |
| API 404 | `.htaccess` missing in `api/`; enable **AllowOverride** (contact support) |
| CORS error in browser | Add frontend URL to `CORS_ALLOW_ORIGINS` |
| Images broken | `Upload/` must be sibling of `api/`; check permissions 755/775 |
| Frontend empty | `NEXT_PUBLIC_API_BASE` wrong; redeploy Vercel after fixing |
| Admin won’t start | Plan has no Node.js — use VPS or upgrade plan |
| phpMyAdmin import too large | Import SQL files one at a time; increase upload limit in cPanel |

---

## Quick reference — what lives where

```
NAMECHEAP SHARED (public_html)
├── api/              ← PHP API
└── Upload/           ← images

NAMECHEAP MySQL
└── namec123_ausbooking

VERCEL
└── frontend/         ← public website

NODE HOST (cPanel Node or VPS)
└── admin/            ← admin panel
```

---

Need help with a specific step? Note your cPanel username prefix, domain, and whether you see **Setup Node.js App** in cPanel.
