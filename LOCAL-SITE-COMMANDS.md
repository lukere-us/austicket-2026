# AUS Ticket Lanka — Local Site Command Cheat Sheet (Windows + XAMPP)

Copy-paste commands for running the site on your PC. Use **PowerShell**.
For the live server, see `LIVE-SERVER-COMMANDS.md`.

---

## 0. Your local setup

| Part | URL / location | How it runs |
|---|---|---|
| Project | `E:\Xampp\htdocs\austicket-2026` | — |
| Frontend (Next.js) | http://localhost:3000 | `npm run dev` / `npm run dev:fast` |
| Admin (AdminJS) | http://localhost:3003/admin (also http://localhost:3000/admin) | `npm run dev` |
| API (PHP) | http://localhost/api | XAMPP **Apache** |
| Images | http://localhost/api/media/… | from `Upload\` |
| Database | `aus-booking-live` (user `root`, no password) | XAMPP **MySQL** |
| MySQL tools | `E:\Xampp\mysql\bin\` | `mysql.exe`, `mysqldump.exe` |
| phpMyAdmin | http://localhost/phpmyadmin | XAMPP |

> The DB name `aus-booking-live` is set in **both** `api\config.php` (`define('db', …)`) and `admin\.env` (`DB_NAME=`). If you switch databases, change both.

Paste this once per PowerShell window so the commands below are shorter:

```powershell
$APP   = 'E:\Xampp\htdocs\austicket-2026'
$MYSQL = 'E:\Xampp\mysql\bin\mysql.exe'
$DUMP  = 'E:\Xampp\mysql\bin\mysqldump.exe'
$DB    = 'aus-booking-live'
$BK    = "$APP\Live DB"          # backups folder (gitignored)

# Helper: import a .sql file into a database (handles spaces in paths + UTF-8 text)
function Import-Sql($db, $file) {
  $f = (Resolve-Path $file).Path -replace '\\','/'
  & $MYSQL -u root --default-character-set=utf8mb4 $db -e "source $f"
}
```

---

## 1. Start the site (every day)

1. Open **XAMPP Control Panel** → **Start** `Apache` and `MySQL`.
2. Terminal 1 — Admin:

   ```powershell
   cd E:\Xampp\htdocs\austicket-2026\admin
   npm run dev
   ```

3. Terminal 2 — Frontend:

   ```powershell
   cd E:\Xampp\htdocs\austicket-2026\frontend
   npm run dev:fast      # faster: build cache on C: SSD (AppData\Local\austicket-2026-next)
   # or
   npm run dev           # normal: build cache in frontend\.next
   ```

4. Open http://localhost:3000 and http://localhost:3003/admin

Stop either app: **Ctrl + C** in its terminal.

Quick health check:

```powershell
curl.exe -s http://localhost/api/                                    # API → JSON
curl.exe -s -o NUL -w "frontend %{http_code}`n" http://localhost:3000
curl.exe -s -o NUL -w "admin    %{http_code}`n" http://localhost:3003/admin/login
```

---

## 2. Install / update dependencies

Run after `git pull` when `package.json` or `package-lock.json` changed:

```powershell
cd $APP\frontend; npm ci
cd $APP\admin;    npm ci
```

(`npm ci` = clean install from the lock file. Use `npm install <pkg>` only when adding a package.)

---

## 3. Build the frontend (production test)

```powershell
cd $APP\frontend
npm run build
npm run start          # serves the production build on :3000
```

Lint:

```powershell
npm run lint
```

> `NEXT_PUBLIC_*` values in `frontend\.env.local` are baked in at build time — rebuild after changing them.

---

## 4. Build the admin bundle

Needed after changing anything in `admin\src\components\`:

```powershell
cd $APP\admin
npm run build:bundle
npm run dev            # restart admin
```

---

## 5. Get latest code

```powershell
cd $APP;          git pull
cd $APP\frontend; git pull     # frontend is a separate git repo — pull it too
```

Check what changed / what's uncommitted:

```powershell
cd $APP;          git status; git log --oneline -5
cd $APP\frontend; git status; git log --oneline -5
```

---

## 6. Database backup (local)

```powershell
$TS = Get-Date -Format 'yyyyMMdd-HHmm'
& $DUMP -u root --single-transaction --routines --triggers --default-character-set=utf8mb4 `
  --result-file="$BK\$DB-local-$TS.sql" $DB
Get-ChildItem $BK | Sort-Object LastWriteTime -Descending | Select-Object -First 5
```

> Use `--result-file` (not `>`). In Windows PowerShell, `>` saves as UTF-16 and the file won't import.

Zip it (optional):

```powershell
Compress-Archive -Path "$BK\$DB-local-$TS.sql" -DestinationPath "$BK\$DB-local-$TS.zip"
```

Back up the images folder:

```powershell
Compress-Archive -Path "$APP\Upload\*" -DestinationPath "$BK\upload-local-$TS.zip"
```

Backup via GUI: phpMyAdmin → select DB → **Export** → Quick → SQL → Go.

---

## 7. Restore / import a database

### 7.1 Import into the current DB (overwrites it)

```powershell
# take a backup first (section 6)
& $MYSQL -u root -e "DROP DATABASE IF EXISTS ``$DB``; CREATE DATABASE ``$DB`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
Import-Sql $DB "$BK\aus-booking-20260905-1323.sql"
```

### 7.2 Import a live backup into a separate DB (safer)

```powershell
$NEW = 'aus-booking-live-20261115'
& $MYSQL -u root -e "CREATE DATABASE ``$NEW`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
Import-Sql $NEW "$BK\aus-booking-20261115-1030.sql"
```

Then point the site at it — edit **both**:

- `api\config.php` → `define('db', 'aus-booking-live-20261115');`
- `admin\.env` → `DB_NAME=aus-booking-live-20261115`

…and restart admin (Ctrl+C → `npm run dev`).

`.sql.gz` files from the live server: extract with **7-Zip** first (right-click → 7-Zip → Extract Here).

Live images: extract the `upload-*.tar.gz` with 7-Zip into `$APP\Upload\`.

> How to download a backup from the live server: `LIVE-SERVER-COMMANDS.md` → section 7.

---

## 8. Set up / update the database schema

Brand-new local DB (creates `aus-booking` + dev seed + migrations up to 016):

```powershell
cd $APP
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap-db.ps1
```

> The bootstrap script stops at **016**. Apply 017 → 025 afterwards (below).
> Dev login from the seed: `admin@austicketlanka.local` (password in `db\002_seed_dev.sql`).

Apply one migration:

```powershell
Import-Sql $DB "$APP\db\025_show_time_sold_out.sql"
```

Apply a range (017 → 025) in order:

```powershell
Get-ChildItem "$APP\db" -Filter '0*.sql' |
  Where-Object { [int]($_.Name.Substring(0,3)) -ge 17 -and [int]($_.Name.Substring(0,3)) -le 25 } |
  Sort-Object Name | ForEach-Object {
    Write-Host ">> $($_.Name)"
    Import-Sql $DB $_.FullName
  }
```

Then restart admin (it runs schema helpers on start).

Inspect the DB:

```powershell
& $MYSQL -u root -e "SHOW DATABASES;"
& $MYSQL -u root $DB -e "SHOW TABLES;"
& $MYSQL -u root $DB -e "DESCRIBE listings;"
& $MYSQL -u root $DB                         # interactive prompt (type exit to leave)
```

---

## 9. Clear caches

| What's stale | Command |
|---|---|
| Site shows old content after admin save | Wait ~60 s, or restart frontend (Ctrl+C → `npm run dev`) |
| Next.js cache — `npm run dev` | `Remove-Item -Recurse -Force $APP\frontend\.next` |
| Next.js cache — `npm run dev:fast` | `Remove-Item -Recurse -Force "$env:LOCALAPPDATA\austicket-2026-next"` |
| Admin components not updating | `Remove-Item -Recurse -Force $APP\admin\.adminjs; cd $APP\admin; npm run build:bundle` |
| PHP change not showing | XAMPP → Apache **Stop** → **Start** |
| TryBooking seat counts (60 s cache) | see below |
| npm problems | `npm cache clean --force`, then delete `node_modules` and `npm ci` |
| Browser shows old CSS/JS | **Ctrl + Shift + R** |

TryBooking cache folder (PHP temp dir + `austicket-trybooking`):

```powershell
Remove-Item -Recurse -Force "$env:TEMP\austicket-trybooking", 'E:\Xampp\tmp\austicket-trybooking', 'C:\Windows\Temp\austicket-trybooking' -ErrorAction SilentlyContinue
```

Clear **everything** (stop both npm terminals first):

```powershell
Remove-Item -Recurse -Force $APP\frontend\.next, "$env:LOCALAPPDATA\austicket-2026-next", $APP\admin\.adminjs -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:TEMP\austicket-trybooking", 'E:\Xampp\tmp\austicket-trybooking' -ErrorAction SilentlyContinue
cd $APP\admin; npm run build:bundle
# restart Apache in XAMPP, then start admin + frontend again (section 1)
```

Full reinstall of packages (when things are really broken):

```powershell
cd $APP\frontend; Remove-Item -Recurse -Force node_modules; npm ci
cd $APP\admin;    Remove-Item -Recurse -Force node_modules; npm ci
```

---

## 10. Port already in use

```powershell
# Who is using port 3000 / 3003 / 80 / 3306?
Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object LocalPort, OwningProcess
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess

# Kill it
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000 -State Listen).OwningProcess -Force
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3003 -State Listen).OwningProcess -Force

# Kill all Node processes (stops frontend + admin)
Stop-Process -Name node -Force
```

> If 3000 is busy, Next.js silently moves to 3001 — kill the old process instead so the site stays on 3000.

---

## 11. Logs

- **Frontend / Admin:** the terminal window where `npm run dev` runs.
- **Admin last run:** `Get-Content $APP\admin\admin-run.log -Tail 50`
- **PHP / API errors:** `Get-Content E:\Xampp\apache\logs\error.log -Tail 50`
- **Apache access:** `Get-Content E:\Xampp\apache\logs\access.log -Tail 50`
- **MySQL:** `Get-Content E:\Xampp\mysql\data\*.err -Tail 50`
- Live tail (like `tail -f`): add `-Wait`, e.g. `Get-Content E:\Xampp\apache\logs\error.log -Tail 20 -Wait`

---

## 12. Admin users (local)

List admins:

```powershell
& $MYSQL -u root $DB -e "SELECT id, name, email, is_active FROM admins;"
```

Reset a password:

```powershell
cd $APP\admin
node -e "import('bcryptjs').then(b=>console.log(b.default.hashSync('admin123',10)))"
# copy the $2b$10$... hash, then (single quotes keep the $ signs):
& $MYSQL -u root $DB -e 'UPDATE admins SET password_hash=''PASTE_HASH'' WHERE email=''admin@austicketlanka.local'';'
```

---

## 13. Quick troubleshooting

| Symptom | Try |
|---|---|
| Site loads but no listings | Is XAMPP Apache + MySQL running? `curl.exe http://localhost/api/` |
| API error "could not connect" | MySQL stopped, or wrong `define('db', …)` in `api\config.php` |
| Admin won't log in / crashes on start | Check `DB_NAME` in `admin\.env` matches `api\config.php`; MySQL running |
| Admin custom pages blank / 503 | `cd admin; npm run build:bundle`, restart admin |
| Images broken | `NEXT_PUBLIC_UPLOADS_BASE=http://localhost/api/media` in `frontend\.env.local`; file exists in `Upload\` |
| Frontend very slow to compile | Use `npm run dev:fast` |
| "Port 3000 in use" | Section 10 |
| MySQL won't start in XAMPP | Another MySQL service is running: `Get-Service *mysql*` → stop it, or check `E:\Xampp\mysql\data\*.err` |
| Strange build errors after `git pull` | `npm ci` in that folder, then clear `.next` (section 9) |

> Note: `CACHE_REVALIDATE_SECRET` / `FRONTEND_INTERNAL_URL` are set in `admin\.env` and `frontend\.env.local`, but no code uses them yet — there is no "clear website cache" endpoint. Restarting the frontend is the way to force fresh content.
