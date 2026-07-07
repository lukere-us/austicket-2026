# Deploy AUS Ticket Lanka on Namecheap (Linux)

This project needs **PHP + MySQL + Node.js (2 apps)**. Choose the right Namecheap product first.

| Namecheap product | Good for this project? | Why |
|-------------------|------------------------|-----|
| **VPS** (recommended) | Yes | Full Linux, Nginx, Node, PHP, MySQL — same as local XAMPP but production |
| **Shared hosting** (Stellar / cPanel) | Partial only | PHP + MySQL work; Next.js + AdminJS are hard on shared plans |
| **EasyWP** | No | WordPress only |

---

## Option A — Namecheap VPS (recommended)

Best if you want everything on one server: `yoursite.com`, `/api`, `/admin`.

### What to buy

- **Namecheap VPS** — Ubuntu 22.04 or 24.04, at least **2 GB RAM** (4 GB better for AdminJS builds)
- Point your domain DNS to the VPS IP (Namecheap → Domain → Advanced DNS → A record `@` and `www`)

### Server setup (one-time)

SSH into the VPS:

```bash
ssh root@YOUR_VPS_IP
```

Install stack:

```bash
apt update && apt upgrade -y
apt install -y nginx mysql-server php8.2-fpm php8.2-mysql php8.2-mbstring php8.2-xml php8.2-curl git curl unzip
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g pm2
```

Secure MySQL and create database:

```bash
mysql_secure_installation
mysql -u root -p
```

```sql
CREATE DATABASE `aus-booking` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'austicket'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
GRANT ALL ON `aus-booking`.* TO 'austicket'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Upload project

On your PC (or use Git on the server):

```bash
# On server
mkdir -p /var/www/austicket
cd /var/www/austicket
git clone YOUR_REPO_URL .
# Or upload zip via SFTP to /var/www/austicket and unzip
```

Import database (run all `db/*.sql` files in order — see `DEPLOYMENT.md`).

Create uploads folder:

```bash
mkdir -p /var/www/austicket/Upload
chown -R www-data:www-data /var/www/austicket/Upload
chmod -R 775 /var/www/austicket/Upload
```

### Configure

**1. `api/config.php`**

```php
define('host', 'localhost');
define('user', 'austicket');
define('pwd', 'YOUR_STRONG_PASSWORD');
define('db', 'aus-booking');
define('JWT_SECRET', 'long-random-string-here');
define('CORS_ALLOW_ORIGINS', [
  'https://www.yoursite.com',
  'https://yoursite.com',
]);
```

**2. `admin/.env`**

```env
PORT=3001
NODE_ENV=production
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=austicket
DB_PASSWORD=YOUR_STRONG_PASSWORD
DB_NAME=aus-booking
SESSION_SECRET=another-long-random-string
```

**3. `frontend/.env.local`** (before build)

```env
NEXT_PUBLIC_API_BASE=https://www.yoursite.com/api
NEXT_PUBLIC_UPLOADS_BASE=https://www.yoursite.com/api/media
```

### Build

```bash
cd /var/www/austicket/frontend
npm ci
npm run build

cd /var/www/austicket/admin
npm ci
npm run build:bundle
```

> On Linux, if `npm run start` fails in admin, use:
> `NODE_ENV=production NODE_OPTIONS=--max-old-space-size=4096 node src/server.js`

### Start with PM2

```bash
cd /var/www/austicket/frontend
pm2 start npm --name austicket-web -- start

cd /var/www/austicket/admin
pm2 start src/server.js --name austicket-admin --node-args="--max-old-space-size=4096"

pm2 save
pm2 startup
```

### Nginx

Create `/etc/nginx/sites-available/austicket`:

```nginx
server {
    listen 80;
    server_name yoursite.com www.yoursite.com;

    client_max_body_size 32M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        alias /var/www/austicket/api;
        try_files $uri $uri/ @api;
        location ~ \.php$ {
            include fastcgi_params;
            fastcgi_param SCRIPT_FILENAME /var/www/austicket/api/index.php;
            fastcgi_pass unix:/run/php/php8.2-fpm.sock;
        }
    }

    location @api {
        rewrite ^/api/(.*)$ /api/index.php last;
    }

    location /admin {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and SSL:

```bash
ln -s /etc/nginx/sites-available/austicket /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
apt install -y certbot python3-certbot-nginx
certbot --nginx -d yoursite.com -d www.yoursite.com
```

### Verify

- `https://www.yoursite.com` — homepage
- `https://www.yoursite.com/api/` — `{"status":"ok"}`
- `https://www.yoursite.com/admin` — admin login

Full details: see **`DEPLOYMENT.md`** in the project root.

---

## Option B — Namecheap Shared Hosting (cPanel) + split deploy

Use this if you only have **Stellar / shared Linux hosting** (no VPS).

Shared hosting runs **PHP + MySQL** well. It does **not** reliably run **Next.js** and **AdminJS** 24/7.

### Split layout

| Part | Where to host | URL |
|------|---------------|-----|
| PHP API + uploads | Namecheap shared (`public_html`) | `https://yoursite.com/api` |
| MySQL | Namecheap cPanel → MySQL Databases | — |
| Frontend (Next.js) | **Vercel** (free) | `https://yoursite.com` or `www` |
| Admin (Node) | Small **VPS** or **Railway/Render** | `https://admin.yoursite.com` |

### On Namecheap shared (cPanel)

1. **File Manager** or FTP → `public_html/`
2. Upload folders:
   - `api/` → `public_html/api/`
   - `Upload/` → `public_html/Upload/` (same level as `api`, not inside it)

   ```
   public_html/
   ├── api/
   │   ├── index.php
   │   └── .htaccess
   └── Upload/
   ```

3. **cPanel → MySQL Databases**
   - Create database (e.g. `cpaneluser_ausbooking`)
   - Create user + password
   - Add user to database (ALL PRIVILEGES)

4. **phpMyAdmin** — import all `db/*.sql` files in order

5. Edit **`api/config.php`** with cPanel MySQL details:

   ```php
   define('host', 'localhost');
   define('user', 'cpaneluser_aususer');
   define('pwd', 'YOUR_CPANEL_DB_PASSWORD');
   define('db', 'cpaneluser_ausbooking');
   ```

   > On shared hosting the DB name and user are often prefixed with your cPanel username.

6. Set **`CORS_ALLOW_ORIGINS`** to your real frontend URL (e.g. Vercel URL or custom domain).

7. Test: `https://yoursite.com/api/`

### Frontend on Vercel

1. Push code to GitHub
2. [vercel.com](https://vercel.com) → Import `frontend` folder (or monorepo with root `frontend`)
3. Environment variables:

   ```
   NEXT_PUBLIC_API_BASE=https://yoursite.com/api
   NEXT_PUBLIC_UPLOADS_BASE=https://yoursite.com/api/media
   ```

4. Deploy → connect custom domain in Vercel DNS

### Admin on a small VPS or Railway

Admin needs Node 20+ and ~1–2 GB RAM for builds.

- Deploy `admin/` folder
- Set `DB_HOST` to Namecheap **remote MySQL** only if Namecheap allows remote MySQL (often disabled on shared — then admin must use a VPS with MySQL or tunnel)
- **Easier:** use a cheap VPS for admin + MySQL replica, or upgrade to VPS for everything (Option A)

---

## Option C — Namecheap shared with cPanel “Setup Node.js App”

Some cPanel plans include **Node.js Selector**. You can try:

1. **Subdomain** `admin.yoursite.com` → Node app → `admin/src/server.js`
2. **Main domain** → second Node app for Next.js (`frontend`, start script `npm start`)

Limitations:

- Often **one Node version**, memory limits, app may sleep
- AdminJS build needs `npm run build:bundle` via SSH terminal in cPanel
- Next.js + Admin on same shared account may exceed limits

Only use if Option A (VPS) is not possible.

---

## DNS checklist (Namecheap domain)

In **Namecheap → Domain List → Manage → Advanced DNS**:

| Type | Host | Value |
|------|------|-------|
| A Record | `@` | VPS IP (Option A) or shared hosting IP |
| A Record | `www` | Same IP |
| CNAME | `www` | `yoursite.com` (alternative to second A record) |
| A Record | `admin` | VPS IP (if admin on subdomain) |

For Vercel frontend: use Vercel’s DNS instructions (CNAME to `cname.vercel-dns.com`).

Wait up to 24–48 hours for DNS (usually faster).

---

## Production checklist

- [ ] HTTPS enabled (Let’s Encrypt on VPS, or AutoSSL on cPanel)
- [ ] `JWT_SECRET` and `SESSION_SECRET` changed
- [ ] Strong MySQL password
- [ ] `NEXT_PUBLIC_API_BASE` points to live API
- [ ] `Upload/` writable by PHP
- [ ] Do not use dev admin seed (`db/002_seed_dev.sql`)
- [ ] Create real admin user in database
- [ ] Firewall: only ports 80/443 public (VPS)

---

## Quick decision

```
Do you have Namecheap VPS?
  YES → Follow Option A (one server, easiest long-term)
  NO  → Do you need admin panel on same host?
          YES → Upgrade to VPS (Option A)
          NO  → Option B: API on shared, frontend on Vercel
```

---

## Need help?

Tell us:

1. Exact Namecheap plan (VPS / Stellar Plus / etc.)
2. Your domain name
3. Whether you use cPanel or SSH only

We can give exact paths for your account (e.g. `public_html` vs `home/username/domain.com`).
