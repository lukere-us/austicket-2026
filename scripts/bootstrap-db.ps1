# Bootstrap aus-booking schema for local XAMPP.
# Usage (from repo root): .\scripts\bootstrap-db.ps1

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$mysql = 'E:\Xampp\mysql\bin\mysql.exe'

if (-not (Test-Path $mysql)) {
  Write-Error "MySQL client not found at $mysql. Adjust the path in scripts/bootstrap-db.ps1."
}

Write-Host 'Checking MySQL...'
& $mysql -u root -e 'SELECT 1' 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Error @"
MySQL is not running. Start it from the XAMPP Control Panel (MySQL -> Start), then run this script again.
"@
}

$sqlFiles = @(
  '000_create_database.sql',
  '001_init.sql',
  '002_seed_dev.sql',
  '003_promotions.sql',
  '004_places_google_map_link.sql',
  '005_casts.sql',
  '006_country_flags.sql',
  '007_site_settings.sql',
  '008_listing_detail_banner.sql',
  '008_admin_role_permissions_seed.sql',
  '009_footer_settings.sql',
  '010_blogs.sql',
  '010_blogs_permissions.sql',
  '011_blogs_drop_schedule_columns.sql',
  '012_repair_show_times.sql',
  '013_header_settings.sql',
  '014_partners_settings.sql',
  '016_youtube_carousel_settings.sql'
)

foreach ($file in $sqlFiles) {
  $path = Join-Path $repoRoot "db\$file"
  if (-not (Test-Path $path)) {
    Write-Warning "Skipping missing file: db\$file"
    continue
  }
  Write-Host "Applying db\$file ..."
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $output = if ($file -eq '000_create_database.sql') {
    Get-Content $path -Raw | & $mysql -u root 2>&1
  } else {
    Get-Content $path -Raw | & $mysql -u root aus-booking 2>&1
  }
  $exit = $LASTEXITCODE
  $ErrorActionPreference = $prev
  if ($output) { $output | Out-String | Write-Host }
  if ($exit -ne 0) {
    $text = ($output | Out-String)
    if ($text -match 'Duplicate column|already exists|Duplicate key') {
      Write-Warning "Skipped db\$file (already applied)"
      continue
    }
    Write-Error "Failed applying db\$file"
  }
}

Write-Host 'Done. Restart admin: cd admin && npm run dev'
