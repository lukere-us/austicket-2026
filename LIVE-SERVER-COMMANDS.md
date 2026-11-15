# AUS Ticket Lanka — Live Server Command Cheat Sheet

Quick copy-paste commands for the live server (Linux VPS, Nginx + PHP-FPM + Node + MySQL, PM2).

> **Before you start:** the values below follow `DEPLOYMENT.md` / `NAMECHEAP-DEPLOYMENT.md`.
> If your server uses a different path, user, PHP version or PM2 name, change them **once** in section 0.

---

## 0. Set variables (paste once per SSH session)

```bash
export APP_DIR=/var/www/austicket        # project root on server
export DB_NAME=aus-booking               # MySQL database
export DB_USER=austicket                 # MySQL user
export BACKUP_DIR=/var/backups/austicket # where backups are stored
export WEB_PM2=austicket-web             # PM2 name: Next.js frontend (port 3000)
export ADMIN_PM2=austicket-admin         # PM2 name: AdminJS (port 3001)
export PHP_FPM=php8.2-fpm                # check with: systemctl list-units | grep fpm
mkdir -p "$BACKUP_DIR"
```

**Store the DB password once** so `mysqldump`/`mysql` don't prompt (and the password never appears in shell history):

```bash
cat > ~/.my.cnf <<'CNF'
[client]
user=austicket
password=YOUR_DB_PASSWORD
CNF
chmod 600 ~/.my.cnf
```

---

## 1. Connect

```bash
# From your PC (PowerShell or terminal)
ssh root@YOUR_SERVER_IP
# or, with a key
ssh -i C:\Users\YOU\.ssh\id_rsa root@YOUR_SERVER_IP

cd $APP_DIR
```

---

## 2. Status at a glance

```bash
pm2 status                         # are web + admin online?
pm2 monit                          # live CPU / RAM per app (q to quit)
systemctl status nginx --no-pager
systemctl status $PHP_FPM --no-pager
systemctl status mysql --no-pager  # or: mariadb
df -h                              # disk space
free -h                            # memory
```

Health checks:

```bash
curl -s  http://127.0.0.1:3000 -o /dev/null -w "frontend %{http_code}\n"
curl -s  http://127.0.0.1:3001/admin -o /dev/null -w "admin    %{http_code}\n"
curl -s  https://www.YOURDOMAIN.com/api/          # should return JSON
```

---

## 3. Deploy a code update (full)

> ⚠️ `frontend/` is its **own git repo** inside the project. `git pull` in the root does **not** update it — pull both.

```bash
cd $APP_DIR

# 0) Safety backup first (see section 6)
mysqldump --single-transaction --routines --triggers $DB_NAME | gzip > $BACKUP_DIR/$DB_NAME-$(date +%Y%m%d-%H%M).sql.gz

# 1) Pull code
git pull
cd frontend && git pull && cd ..

# 2) Frontend
cd $APP_DIR/frontend
npm ci
npm run build
pm2 restart $WEB_PM2

# 3) Admin
cd $APP_DIR/admin
npm ci
npm run build:bundle
pm2 restart $ADMIN_PM2

# 4) API (PHP) — no build. Reload PHP to clear OPcache:
sudo systemctl reload $PHP_FPM
```

---

## 4. Build only the frontend (Next.js)

```bash
cd $APP_DIR/frontend
npm ci                 # only needed if package.json / lock changed
npm run build
pm2 restart $WEB_PM2
pm2 logs $WEB_PM2 --lines 30
```

> `NEXT_PUBLIC_*` values in `frontend/.env.local` are baked in at build time — **rebuild after changing them**.

If the build runs out of memory:

```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

---

## 5. Build only the admin (AdminJS)

```bash
cd $APP_DIR/admin
npm ci                 # only if dependencies changed
npm run build:bundle   # required after any change in admin/src/components/
pm2 restart $ADMIN_PM2
pm2 logs $ADMIN_PM2 --lines 30
```

First-time / after a fresh `npm ci` on Linux, apply the Linux patches:

```bash
npm run patch:linux
```

(Re)create the admin PM2 process if it's missing:

```bash
cd $APP_DIR/admin
pm2 start scripts/start-production.mjs --name $ADMIN_PM2   # patches + starts on PORT 3001
pm2 save
```

Recreate the frontend PM2 process if it's missing:

```bash
cd $APP_DIR/frontend
pm2 start npm --name $WEB_PM2 -- start
pm2 save
```

---

## 6. Database backup

### 6.1 Make a backup (compressed, timestamped)

```bash
mysqldump --single-transaction --routines --triggers --default-character-set=utf8mb4 \
  $DB_NAME | gzip > $BACKUP_DIR/$DB_NAME-$(date +%Y%m%d-%H%M).sql.gz

ls -lh $BACKUP_DIR | tail     # confirm it's there and not 0 bytes
```

Same naming as the local `Live DB/` folder (e.g. `aus-booking-20260905-1321.sql.gz`).

### 6.2 Backup the uploads folder (images)

```bash
tar -czf $BACKUP_DIR/upload-$(date +%Y%m%d-%H%M).tar.gz -C $APP_DIR Upload
```

### 6.3 Full backup (DB + uploads + config) in one go

```bash
TS=$(date +%Y%m%d-%H%M)
mysqldump --single-transaction --routines --triggers $DB_NAME | gzip > $BACKUP_DIR/$DB_NAME-$TS.sql.gz
tar -czf $BACKUP_DIR/upload-$TS.tar.gz -C $APP_DIR Upload
tar -czf $BACKUP_DIR/config-$TS.tar.gz -C $APP_DIR api/config.php admin/.env frontend/.env.local
ls -lh $BACKUP_DIR/*$TS*
```

> `config-*.tar.gz` contains passwords and secrets — keep it private.

### 6.4 Automatic daily backup (cron, 2:30 AM) + keep 14 days

```bash
crontab -e
```

Add:

```cron
30 2 * * * mysqldump --single-transaction --routines --triggers aus-booking | gzip > /var/backups/austicket/aus-booking-$(date +\%Y\%m\%d-\%H\%M).sql.gz
45 2 * * * find /var/backups/austicket -name "*.gz" -mtime +14 -delete
```

(`%` must be escaped as `\%` inside crontab.)

---

## 7. Download a backup to your PC

Run these **on your PC** (Windows PowerShell has `scp` built in), not on the server.

```powershell
# Latest DB backup → into the project's "Live DB" folder
scp root@YOUR_SERVER_IP:/var/backups/austicket/aus-booking-20261115-1030.sql.gz "E:\Xampp\htdocs\austicket-2026\Live DB\"

# Uploads archive
scp root@YOUR_SERVER_IP:/var/backups/austicket/upload-20261115-1030.tar.gz "E:\Xampp\htdocs\austicket-2026\Live DB\"
```

Find the latest file name first (on the server):

```bash
ls -t $BACKUP_DIR | head -5
```

GUI alternative: **WinSCP** or **FileZilla** (SFTP, port 22) → browse to `/var/backups/austicket`.

### 7.1 Import a live backup into local XAMPP

```powershell
cd "E:\Xampp\htdocs\austicket-2026\Live DB"
# unzip .gz with 7-Zip, then:
E:\Xampp\mysql\bin\mysql.exe -u root -e 'DROP DATABASE IF EXISTS `aus-booking`; CREATE DATABASE `aus-booking` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
cmd /c "E:\Xampp\mysql\bin\mysql.exe -u root aus-booking < aus-booking-20261115-1030.sql"
```

Unpack uploads into the local `Upload/` folder with 7-Zip.

---

## 8. Restore a backup on the live server

> ⚠️ Overwrites live data. Take a fresh backup first (section 6.1).

```bash
pm2 stop $ADMIN_PM2                                   # stop admin writes
gunzip < $BACKUP_DIR/aus-booking-20261115-1030.sql.gz | mysql $DB_NAME
pm2 start $ADMIN_PM2
pm2 restart $WEB_PM2
```

Restore uploads:

```bash
tar -xzf $BACKUP_DIR/upload-20261115-1030.tar.gz -C $APP_DIR
sudo chown -R www-data:www-data $APP_DIR/Upload && sudo chmod -R 775 $APP_DIR/Upload
```

Upload a backup from your PC to the server:

```powershell
scp "E:\Xampp\htdocs\austicket-2026\Live DB\aus-booking-XXXX.sql.gz" root@YOUR_SERVER_IP:/var/backups/austicket/
```

---

## 9. Run database migrations (new `db/*.sql` files)

```bash
cd $APP_DIR
# Backup first!
mysqldump --single-transaction $DB_NAME | gzip > $BACKUP_DIR/$DB_NAME-pre-migrate-$(date +%Y%m%d-%H%M).sql.gz

# Apply one file
mysql $DB_NAME < db/025_show_time_sold_out.sql

# Apply a range (e.g. 017 → 025) in order
for f in db/01[7-9]_*.sql db/02[0-5]_*.sql; do echo ">> $f"; mysql $DB_NAME < "$f" || break; done

pm2 restart $ADMIN_PM2      # admin runs schema helpers on boot
```

> Never run `db/002_seed_dev.sql` on live.
> Check which tables/columns exist: `mysql $DB_NAME -e "SHOW TABLES;"` / `mysql $DB_NAME -e "DESCRIBE listings;"`

---

## 10. Clear caches

| What's stale | Command |
|---|---|
| Site shows old content after admin save | Wait ~60 s (ISR cache), or `pm2 restart $WEB_PM2` |
| Next.js build cache (odd build errors) | `cd $APP_DIR/frontend && rm -rf .next/cache && npm run build && pm2 restart $WEB_PM2` |
| Full Next.js rebuild | `cd $APP_DIR/frontend && rm -rf .next && npm run build && pm2 restart $WEB_PM2` |
| AdminJS custom components not updating | `cd $APP_DIR/admin && rm -rf .adminjs && npm run build:bundle && pm2 restart $ADMIN_PM2` |
| PHP code change not taking effect (OPcache) | `sudo systemctl reload $PHP_FPM` |
| TryBooking seat counts (cached 60 s) | `rm -rf /tmp/austicket-trybooking` |
| Nginx config changed | `sudo nginx -t && sudo systemctl reload nginx` |
| npm acting up | `npm cache clean --force` then `rm -rf node_modules && npm ci` |
| Browser shows old CSS/JS | Hard refresh: `Ctrl + Shift + R` (or Cloudflare → Purge cache if used) |

Clear **everything** in one go:

```bash
cd $APP_DIR/frontend && rm -rf .next/cache && npm run build && pm2 restart $WEB_PM2
cd $APP_DIR/admin && rm -rf .adminjs && npm run build:bundle && pm2 restart $ADMIN_PM2
rm -rf /tmp/austicket-trybooking
sudo systemctl reload $PHP_FPM
sudo nginx -t && sudo systemctl reload nginx
```

---

## 11. Start / stop / restart

```bash
pm2 restart $WEB_PM2            # frontend
pm2 restart $ADMIN_PM2          # admin
pm2 restart all                 # both
pm2 stop $ADMIN_PM2             # stop admin
pm2 start $ADMIN_PM2
pm2 reload $WEB_PM2             # zero-downtime restart (frontend)

sudo systemctl restart nginx
sudo systemctl restart $PHP_FPM
sudo systemctl restart mysql    # or mariadb

pm2 save                        # remember current process list
pm2 startup                     # auto-start PM2 after reboot (run once, follow printed command)
```

---

## 12. Logs

```bash
pm2 logs                                  # all apps, live (Ctrl+C to exit)
pm2 logs $WEB_PM2 --lines 100
pm2 logs $ADMIN_PM2 --lines 100
pm2 flush                                 # clear PM2 log files

sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/$PHP_FPM.log        # PHP-FPM (API) errors
sudo tail -f /var/log/mysql/error.log
```

---

## 13. Uploads folder permissions

```bash
sudo chown -R www-data:www-data $APP_DIR/Upload
sudo chmod -R 775 $APP_DIR/Upload
du -sh $APP_DIR/Upload                    # how big are uploads?
```

---

## 14. Admin users

Reset an admin password:

```bash
cd $APP_DIR/admin
node -e "import('bcryptjs').then(b=>console.log(b.default.hashSync('NewStrongPassword',10)))"
# copy the $2b$10$... hash, then:
mysql $DB_NAME -e "UPDATE admins SET password_hash='PASTE_HASH' WHERE email='you@yourcompany.com';"
```

List admins:

```bash
mysql $DB_NAME -e "SELECT id, name, email, is_active FROM admins;"
```

---

## 15. Housekeeping

```bash
ls -lh $BACKUP_DIR                                       # backups
find $BACKUP_DIR -name "*.gz" -mtime +14 -delete          # delete backups older than 14 days
du -sh $APP_DIR/frontend/.next $APP_DIR/*/node_modules    # big folders
sudo journalctl --vacuum-time=7d                          # trim system logs
pm2 flush                                                 # trim PM2 logs
```

SSL certificate (Let's Encrypt):

```bash
sudo certbot certificates          # expiry dates
sudo certbot renew --dry-run       # test auto-renew
```

---

## 16. Quick troubleshooting

| Symptom | Try |
|---|---|
| Site down (502) | `pm2 status` → `pm2 restart $WEB_PM2` → `pm2 logs $WEB_PM2` |
| Admin 503 / blank custom pages | `cd admin && npm run build:bundle && pm2 restart $ADMIN_PM2` |
| No listings on site | `curl https://www.YOURDOMAIN.com/api/` → check PHP-FPM + `api/config.php` DB details |
| Images broken | Check `NEXT_PUBLIC_UPLOADS_BASE` in `frontend/.env.local`, rebuild; check `Upload/` permissions |
| Frontend login fails | Add domain to `CORS_ALLOW_ORIGINS` in `api/config.php`, reload PHP-FPM |
| Seat counts wrong | `rm -rf /tmp/austicket-trybooking`; check TryBooking keys in Admin → General settings |
| Disk full | `df -h`, then section 15 |
