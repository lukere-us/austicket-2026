<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/http.php';
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/jwt.php';
require_once __DIR__ . '/lib/site_settings.php';
require_once __DIR__ . '/lib/home_hero_settings.php';
require_once __DIR__ . '/lib/home_listings_settings.php';
require_once __DIR__ . '/lib/home_hero_stats.php';

cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// If deployed under /api, trim prefix
if (str_starts_with($path, '/api')) {
  $path = substr($path, 4) ?: '/';
}

function now_sql(): string
{
  return gmdate('Y-m-d H:i:s');
}

function is_listing_visible_row(array $row): bool
{
  if (($row['status'] ?? '') !== 'published') return false;
  $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
  if (!empty($row['publish_at'])) {
    $pub = new DateTimeImmutable($row['publish_at'], new DateTimeZone('UTC'));
    if ($pub > $now) return false;
  }
  if (!empty($row['unpublish_at'])) {
    $unpub = new DateTimeImmutable($row['unpublish_at'], new DateTimeZone('UTC'));
    if ($unpub <= $now) return false;
  }
  return true;
}

function is_promotion_visible_row(array $row): bool
{
  if (($row['status'] ?? '') !== 'published') return false;
  $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
  if (!empty($row['publish_at'])) {
    $pub = new DateTimeImmutable($row['publish_at'], new DateTimeZone('UTC'));
    if ($pub > $now) return false;
  }
  if (!empty($row['unpublish_at'])) {
    $unpub = new DateTimeImmutable($row['unpublish_at'], new DateTimeZone('UTC'));
    if ($unpub <= $now) return false;
  }
  return true;
}

function youtube_embed_url(?string $url): ?string
{
  $url = trim((string)$url);
  if ($url === '') return null;
  $parts = parse_url($url);
  if (!is_array($parts)) return null;
  $host = strtolower((string)($parts['host'] ?? ''));
  $path = (string)($parts['path'] ?? '');
  $query = (string)($parts['query'] ?? '');

  if ($host === 'youtu.be' || str_ends_with($host, '.youtu.be')) {
    $id = trim($path, '/');
    if ($id !== '') return "https://www.youtube.com/embed/" . rawurlencode($id);
  }
  if ($host === 'youtube.com' || str_ends_with($host, '.youtube.com')) {
    parse_str($query, $qs);
    $id = isset($qs['v']) ? (string)$qs['v'] : '';
    if ($id !== '') return "https://www.youtube.com/embed/" . rawurlencode($id);
  }
  return null;
}

function promotion_render_html(array $p): string
{
  $type = (string)($p['promo_type'] ?? 'image');
  $title = (string)($p['title'] ?? '');

  if ($type === 'youtube') {
    $embed = youtube_embed_url((string)($p['youtube_url'] ?? ''));
    if (!$embed) return '';
    $t = htmlspecialchars($title !== '' ? $title : 'Promotion video', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $src = htmlspecialchars($embed, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    return '<div class="promo promo--youtube"><div class="promo__media" style="position:relative;padding-top:56.25%"><iframe src="' . $src . '" title="' . $t . '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div></div>';
  }

  if ($type === 'html') {
    return (string)($p['embed_html'] ?? '');
  }

  // image (default)
  $path = trim((string)($p['image_path'] ?? ''));
  if ($path === '') return '';
  $src = '/' . ltrim($path, '/');
  $src = htmlspecialchars($src, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
  $alt = htmlspecialchars($title !== '' ? $title : 'Promotion', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
  return '<div class="promo promo--image"><img src="' . $src . '" alt="' . $alt . '" style="max-width:100%;height:auto;display:block" /></div>';
}

function expand_promotion_shortcodes(PDO $pdo, ?string $html): ?string
{
  if ($html === null || trim($html) === '') return $html;
  if (stripos($html, '[promotion') === false) return $html;

  // [promotion id="123"] or [promotion slug="summer-sale"]
  return preg_replace_callback('/\[promotion\s+([^\]]+)\]/i', function ($m) use ($pdo) {
    $attrsRaw = (string)($m[1] ?? '');
    $attrs = [];
    if (preg_match_all('/(\w+)\s*=\s*"([^"]*)"/', $attrsRaw, $mm, PREG_SET_ORDER)) {
      foreach ($mm as $a) {
        $attrs[strtolower($a[1])] = $a[2];
      }
    }

    $id = isset($attrs['id']) ? (int)$attrs['id'] : 0;
    $slug = isset($attrs['slug']) ? trim((string)$attrs['slug']) : '';

    if ($id <= 0 && $slug === '') {
      return '';
    }

    if ($id > 0) {
      $stmt = $pdo->prepare("SELECT * FROM promotions WHERE id = :id LIMIT 1");
      $stmt->execute([':id' => $id]);
    } else {
      $stmt = $pdo->prepare("SELECT * FROM promotions WHERE slug = :s LIMIT 1");
      $stmt->execute([':s' => $slug]);
    }
    $p = $stmt->fetch();
    if (!$p || !is_promotion_visible_row($p)) return '';
    return promotion_render_html($p);
  }, $html);
}

function read_client_ip(): ?string
{
  return $_SERVER['REMOTE_ADDR'] ?? null;
}

function read_user_agent(): ?string
{
  return $_SERVER['HTTP_USER_AGENT'] ?? null;
}

function normalize_country_name(?string $raw): ?string
{
  $c = strtoupper(trim((string)$raw));
  if ($c === '') return null;
  if (in_array($c, ['AU', 'AUS', 'AUSTRALIA', '1'], true)) return 'Australia';
  if (in_array($c, ['NZ', 'NZL', 'NEW ZEALAND', '2'], true)) return 'New Zealand';
  return null;
}

function listing_country_exists_sql(string $countryParam): string
{
  return "
    EXISTS (
      SELECT 1
      FROM shows s
      JOIN places p ON p.id = s.place_id
      JOIN cities c ON c.id = p.city_id
      JOIN states st ON st.id = c.state_id
      JOIN countries co ON co.id = st.country_id
      WHERE s.listing_id = l.id
        AND co.name = $countryParam
    )
  ";
}

function listing_city_exists_sql(string $cityParam): string
{
  return "
    EXISTS (
      SELECT 1
      FROM shows s
      JOIN places p ON p.id = s.place_id
      JOIN cities c ON c.id = p.city_id
      WHERE s.listing_id = l.id
        AND c.name = $cityParam
    )
  ";
}

function attach_show_times_to_shows(PDO $pdo, array $shows): array
{
  if (!count($shows)) return $shows;

  $showIds = array_map(fn($s) => (string)$s['id'], $shows);
  $in = implode(',', array_fill(0, count($showIds), '?'));
  $stmt = $pdo->prepare("SELECT id, show_id, show_time, notes FROM show_times WHERE show_id IN ($in) ORDER BY show_time ASC");
  $stmt->execute($showIds);
  $times = $stmt->fetchAll();
  $byShow = [];
  foreach ($times as $t) {
    $sid = (string)$t['show_id'];
    if (!isset($byShow[$sid])) $byShow[$sid] = [];
    $byShow[$sid][] = $t;
  }
  foreach ($shows as &$s) {
    $s['times'] = $byShow[(string)$s['id']] ?? [];
  }
  unset($s);

  return $shows;
}

function fetch_listing_show_countries(PDO $pdo, int $listingId): array
{
  $stmt = $pdo->prepare("
    SELECT DISTINCT co.name AS country_name
    FROM shows s
    JOIN places p ON p.id = s.place_id
    JOIN cities c ON c.id = p.city_id
    JOIN states st ON st.id = c.state_id
    JOIN countries co ON co.id = st.country_id
    WHERE s.listing_id = :id
    ORDER BY co.name ASC
  ");
  $stmt->execute([':id' => $listingId]);
  return array_values(array_filter(array_map(
    fn($row) => $row['country_name'] ?? null,
    $stmt->fetchAll()
  )));
}

function fetch_listing_detail_shows(PDO $pdo, int $listingId, ?string $countryName): array
{
  $showCountrySql = $countryName !== null ? 'AND co.name = :country_name' : '';
  $showParams = [':id' => $listingId];
  if ($countryName !== null) {
    $showParams[':country_name'] = $countryName;
  }

  $stmt = $pdo->prepare("
    SELECT
      s.*,
      p.name AS place_name, p.address AS place_address, p.google_map_link AS place_google_map_link,
      c.name AS city_name,
      st.name AS state_name,
      co.name AS country_name
    FROM shows s
    JOIN places p ON p.id = s.place_id
    JOIN cities c ON c.id = p.city_id
    JOIN states st ON st.id = c.state_id
    JOIN countries co ON co.id = st.country_id
    WHERE s.listing_id = :id
      $showCountrySql
    ORDER BY s.start_date ASC, s.id ASC
  ");
  $stmt->execute($showParams);
  return attach_show_times_to_shows($pdo, $stmt->fetchAll());
}

function listing_visible_where(): array
{
  return [
    "l.status = 'published'",
    "(l.publish_at IS NULL OR l.publish_at <= UTC_TIMESTAMP())",
    "(l.unpublish_at IS NULL OR l.unpublish_at > UTC_TIMESTAMP())",
  ];
}

function active_show_sql(string $alias = 's'): string
{
  // Show-level publish windows were removed from the schema; listing schedule is authoritative.
  return '1=1';
}

function listing_card_select_sql(): string
{
  $activeSh = active_show_sql('sh');
  return "
    l.id, l.title, l.slug, l.banner_image, l.trailer_url, l.publish_at, l.created_at,
    COALESCE(l.is_featured, 0) AS is_featured,
    t.name AS type_name, t.slug AS type_slug,
    (
      SELECT COALESCE(
        (
          SELECT MIN(st.show_time)
          FROM show_times st
          JOIN shows sh ON sh.id = st.show_id
          WHERE sh.listing_id = l.id AND $activeSh
        ),
        (
          SELECT MIN(sh.start_date)
          FROM shows sh
          WHERE sh.listing_id = l.id AND $activeSh
        )
      )
    ) AS event_date,
    (
      SELECT CONCAT(p.name, ', ', c.name)
      FROM shows sh
      JOIN places p ON p.id = sh.place_id
      JOIN cities c ON c.id = p.city_id
      WHERE sh.listing_id = l.id AND $activeSh
      ORDER BY COALESCE(sh.start_date, '9999-12-31') ASC, sh.id ASC
      LIMIT 1
    ) AS event_location,
    (
      SELECT sh.booking_url
      FROM shows sh
      WHERE sh.listing_id = l.id AND $activeSh AND sh.booking_url IS NOT NULL AND sh.booking_url <> ''
      ORDER BY COALESCE(sh.start_date, '9999-12-31') ASC, sh.id ASC
      LIMIT 1
    ) AS booking_url
  ";
}

function fetch_listing_cards(PDO $pdo, array $extraWhere, array $params, string $orderBy, int $limit): array
{
  $where = array_merge(listing_visible_where(), $extraWhere);
  $sql = "
    SELECT " . listing_card_select_sql() . "
    FROM listings l
    JOIN types t ON t.id = l.type_id
    WHERE " . implode(' AND ', $where) . "
    ORDER BY $orderBy
    LIMIT $limit
  ";
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $rows = $stmt->fetchAll() ?: [];
  return attach_upcoming_show_times($pdo, $rows);
}

function attach_upcoming_show_times(PDO $pdo, array $items, int $limitPerListing = 4): array
{
  if (count($items) === 0) {
    return $items;
  }

  $listingIds = [];
  foreach ($items as $row) {
    if (isset($row['id'])) {
      $listingIds[] = (int)$row['id'];
    }
  }
  $listingIds = array_values(array_unique($listingIds));
  if (count($listingIds) === 0) {
    return $items;
  }

  $placeholders = implode(',', array_fill(0, count($listingIds), '?'));
  $stmt = $pdo->prepare("
    SELECT sh.listing_id, st.show_time, st.notes
    FROM show_times st
    INNER JOIN shows sh ON sh.id = st.show_id
    WHERE sh.listing_id IN ($placeholders)
      AND st.show_time >= UTC_TIMESTAMP()
    ORDER BY st.show_time ASC
  ");
  $stmt->execute($listingIds);
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

  $byListing = [];
  foreach ($rows as $row) {
    $lid = (string)$row['listing_id'];
    if (!isset($byListing[$lid])) {
      $byListing[$lid] = [];
    }
    if (count($byListing[$lid]) < $limitPerListing) {
      $byListing[$lid][] = [
        'show_time' => $row['show_time'],
        'notes' => $row['notes'],
      ];
    }
  }

  foreach ($items as &$item) {
    $lid = (string)($item['id'] ?? '');
    $item['upcoming_show_times'] = $byListing[$lid] ?? [];
  }
  unset($item);

  return $items;
}

/** Featured carousel: featured listings first, then recent items to reach $limit (no duplicates). */
function fetch_carousel_listings(PDO $pdo, array $extra, array $params, int $limit): array
{
  $limit = max(1, min(12, $limit));
  $featuredWhere = array_merge($extra, ['COALESCE(l.is_featured, 0) = 1']);
  $featured = fetch_listing_cards(
    $pdo,
    $featuredWhere,
    $params,
    'COALESCE(l.publish_at, l.created_at) DESC',
    $limit
  );

  if (count($featured) >= $limit) {
    return array_slice($featured, 0, $limit);
  }

  $needed = $limit - count($featured);
  $fillExtra = $extra;
  $fillParams = $params;

  $excludeIds = array_values(array_filter(array_map(
    static fn($row) => isset($row['id']) ? (int)$row['id'] : 0,
    $featured
  )));

  if (count($excludeIds) > 0) {
    $inParts = [];
    foreach ($excludeIds as $i => $id) {
      $key = ':carousel_exclude_' . $i;
      $inParts[] = $key;
      $fillParams[$key] = $id;
    }
    $fillExtra[] = 'l.id NOT IN (' . implode(', ', $inParts) . ')';
  }

  $recent = fetch_listing_cards($pdo, $fillExtra, $fillParams, 'l.created_at DESC', $needed);

  return array_merge($featured, $recent);
}

function serve_upload_file(string $relativePath): void
{
  $rel = str_replace('\\', '/', trim($relativePath, '/'));
  if ($rel === '' || str_contains($rel, '..')) {
    json_response(['error' => 'not_found'], 404);
  }

  $root = realpath(__DIR__ . '/../Upload');
  if (!$root) {
    json_response(['error' => 'not_found'], 404);
  }

  $file = realpath($root . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel));
  $rootPrefix = $root . DIRECTORY_SEPARATOR;
  if (!$file || !str_starts_with($file, $rootPrefix) || !is_file($file)) {
    json_response(['error' => 'not_found'], 404);
  }

  $mime = mime_content_type($file) ?: 'application/octet-stream';
  header('Content-Type: ' . $mime);
  header('Cache-Control: public, max-age=86400');
  header('Access-Control-Allow-Origin: *');
  readfile($file);
  exit;
}

// -------------------------
// Routes
// -------------------------

if ($method === 'GET' && $path === '/') {
  json_response(['name' => 'aus-ticket-lanka-api', 'status' => 'ok']);
}

// Public: uploaded listing/gallery images from /Upload
if ($method === 'GET' && preg_match('#^/media/(.+)$#', $path, $m)) {
  serve_upload_file($m[1]);
}

// Public: cities with published listings (optionally scoped to country)
if ($method === 'GET' && $path === '/cities') {
  $pdo = db();
  $params = [];
  $where = listing_visible_where();

  $countryName = normalize_country_name($_GET['country'] ?? null);
  if ($countryName !== null) {
    $where[] = 'co.name = :country_name';
    $params[':country_name'] = $countryName;
  }

  $sql = "
    SELECT DISTINCT c.id, c.name
    FROM cities c
    JOIN states st ON st.id = c.state_id
    JOIN countries co ON co.id = st.country_id
    JOIN places p ON p.city_id = c.id
    JOIN shows s ON s.place_id = p.id
    JOIN listings l ON l.id = s.listing_id
    WHERE " . implode(' AND ', $where) . "
    ORDER BY c.name ASC
  ";

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $rows = $stmt->fetchAll();

  json_response(['items' => $rows]);
}

// Public: list listings
if ($method === 'GET' && $path === '/listings') {
  $pdo = db();
  $params = [];
  $extra = [];

  if (!empty($_GET['type'])) {
    $extra[] = 't.slug = :type_slug';
    $params[':type_slug'] = (string)$_GET['type'];
  }

  if (!empty($_GET['city'])) {
    $extra[] = listing_city_exists_sql(':city_name');
    $params[':city_name'] = (string)$_GET['city'];
  }

  $countryName = normalize_country_name($_GET['country'] ?? null);
  if ($countryName !== null) {
    $extra[] = listing_country_exists_sql(':country_name');
    $params[':country_name'] = $countryName;
  }

  $items = fetch_listing_cards($pdo, $extra, $params, 'COALESCE(l.publish_at, l.created_at) DESC', 100);
  json_response(['items' => $items]);
}

// Public: featured listings for homepage carousel
if ($method === 'GET' && $path === '/listings/featured') {
  $pdo = db();
  $params = [];
  $extra = [];

  $countryName = normalize_country_name($_GET['country'] ?? null);
  if ($countryName !== null) {
    $extra[] = listing_country_exists_sql(':country_name');
    $params[':country_name'] = $countryName;
  }

  if (!empty($_GET['city'])) {
    $extra[] = listing_city_exists_sql(':city_name');
    $params[':city_name'] = (string)$_GET['city'];
  }

  $limit = min(12, max(1, (int)($_GET['limit'] ?? 7)));

  $items = fetch_carousel_listings($pdo, $extra, $params, $limit);

  $hasFeatured = false;
  foreach ($items as $row) {
    if ((int)($row['is_featured'] ?? 0) === 1) {
      $hasFeatured = true;
      break;
    }
  }

  json_response(['items' => $items, 'featured_only' => $hasFeatured]);
}

// Public: AJAX search suggestions
if ($method === 'GET' && $path === '/listings/search') {
  $pdo = db();
  $q = trim((string)($_GET['q'] ?? ''));
  $limit = min(5, max(1, (int)($_GET['limit'] ?? 5)));

  if ($q === '') {
    json_response(['items' => []]);
  }

  $qLower = mb_strtolower($q, 'UTF-8');
  $like = '%' . $qLower . '%';
  $params = [
    ':q_title' => $like,
    ':q_type' => $like,
    ':q_desc' => $like,
    ':q_place' => $like,
    ':q_city' => $like,
    ':q_state' => $like,
    ':q_address' => $like,
  ];
  $extra = [];
  $countryName = normalize_country_name($_GET['country'] ?? null);
  if ($countryName !== null) {
    $extra[] = listing_country_exists_sql(':country_name');
    $params[':country_name'] = $countryName;
  }

  if (!empty($_GET['city'])) {
    $extra[] = listing_city_exists_sql(':city_name');
    $params[':city_name'] = (string)$_GET['city'];
  }

  $active = active_show_sql('s');
  $extra[] = "(
    LOWER(l.title) LIKE :q_title OR
    LOWER(t.name) LIKE :q_type OR
    LOWER(l.description_html) LIKE :q_desc OR
    EXISTS (
      SELECT 1
      FROM shows s
      JOIN places p ON p.id = s.place_id
      JOIN cities c ON c.id = p.city_id
      JOIN states st ON st.id = c.state_id
      WHERE s.listing_id = l.id AND $active
        AND (LOWER(p.name) LIKE :q_place OR LOWER(c.name) LIKE :q_city OR LOWER(st.name) LIKE :q_state OR LOWER(p.address) LIKE :q_address)
    )
  )";

  $items = fetch_listing_cards($pdo, $extra, $params, 'COALESCE(l.publish_at, l.created_at) DESC', $limit);
  json_response(['items' => $items]);
}

// Public: listing detail
if ($method === 'GET' && preg_match('#^/listings/([^/]+)$#', $path, $m)) {
  $slug = $m[1];
  if ($slug === 'featured' || $slug === 'search') {
    json_response(['error' => 'not_found'], 404);
  }
  $pdo = db();

  $stmt = $pdo->prepare("
    SELECT
      l.*,
      t.name AS type_name, t.slug AS type_slug
    FROM listings l
    JOIN types t ON t.id = l.type_id
    WHERE l.slug = :slug
    LIMIT 1
  ");
  $stmt->execute([':slug' => $slug]);
  $listing = $stmt->fetch();
  if (!$listing || !is_listing_visible_row($listing)) {
    json_response(['error' => 'not_found'], 404);
  }

  // Expand promotions shortcodes inside listing HTML
  $listing['description_html'] = expand_promotion_shortcodes($pdo, $listing['description_html'] ?? null);

  // Cast members (if configured)
  $stmt = $pdo->prepare("
    SELECT c.id, c.name, c.position, c.image_path
    FROM listing_casts lc
    JOIN casts c ON c.id = lc.cast_id
    WHERE lc.listing_id = :id
    ORDER BY lc.sort_order ASC, lc.id ASC
    LIMIT 12
  ");
  $stmt->execute([':id' => $listing['id']]);
  $casts = $stmt->fetchAll();

  $stmt = $pdo->prepare("SELECT id, image_path, sort_order FROM listing_gallery_images WHERE listing_id = :id ORDER BY sort_order ASC, id ASC");
  $stmt->execute([':id' => $listing['id']]);
  $gallery = $stmt->fetchAll();

  $showCountries = fetch_listing_show_countries($pdo, (int)$listing['id']);
  $countryName = normalize_country_name($_GET['country'] ?? null);
  $showsMatchCountry = true;
  $shows = fetch_listing_detail_shows($pdo, (int)$listing['id'], $countryName);

  if ($countryName !== null && count($showCountries) > 0) {
    $inSelectedCountry = in_array($countryName, $showCountries, true);
    if (!$inSelectedCountry) {
      $shows = [];
      $showsMatchCountry = false;
    } else {
      $showsMatchCountry = true;
    }
  }

  $stmt = $pdo->prepare("
    SELECT l2.id, l2.title, l2.slug, l2.banner_image,
      (
        SELECT c.name
        FROM shows sh
        JOIN places p ON p.id = sh.place_id
        JOIN cities c ON c.id = p.city_id
        WHERE sh.listing_id = l2.id
        ORDER BY sh.start_date ASC, sh.id ASC
        LIMIT 1
      ) AS city_name
    FROM listing_related r
    JOIN listings l2 ON l2.id = r.related_listing_id
    WHERE r.listing_id = :id
    LIMIT 6
  ");
  $stmt->execute([':id' => $listing['id']]);
  $related = $stmt->fetchAll();

  // Only approved comments publicly
  $stmt = $pdo->prepare("
    SELECT c.id, c.comment_text, c.created_at, u.name AS user_name
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.listing_id = :id AND c.status = 'approved'
    ORDER BY c.created_at DESC
    LIMIT 50
  ");
  $stmt->execute([':id' => $listing['id']]);
  $comments = $stmt->fetchAll();

  // Ratings aggregate
  $stmt = $pdo->prepare("SELECT COUNT(*) AS rating_count, AVG(rating_value) AS rating_avg FROM ratings WHERE listing_id = :id");
  $stmt->execute([':id' => $listing['id']]);
  $ratingAgg = $stmt->fetch() ?: ['rating_count' => 0, 'rating_avg' => null];

  json_response([
    'listing' => $listing,
    'casts' => $casts,
    'gallery' => $gallery,
    'shows' => $shows,
    'show_countries' => $showCountries,
    'shows_match_country' => $showsMatchCountry,
    'related' => $related,
    'comments' => $comments,
    'rating' => $ratingAgg,
  ]);
}

// Public: list active promotions
if ($method === 'GET' && $path === '/promotions') {
  $pdo = db();
  $stmt = $pdo->prepare("
    SELECT id, title, slug, promo_type, youtube_url, image_path, embed_html, status, publish_at, unpublish_at, sort_order
    FROM promotions
    WHERE status = 'published'
      AND (publish_at IS NULL OR publish_at <= UTC_TIMESTAMP())
      AND (unpublish_at IS NULL OR unpublish_at > UTC_TIMESTAMP())
    ORDER BY sort_order ASC, COALESCE(publish_at, created_at) DESC, id DESC
    LIMIT 100
  ");
  $stmt->execute();
  $rows = $stmt->fetchAll();
  json_response(['items' => $rows]);
}

// Public: promotion detail (by slug)
if ($method === 'GET' && preg_match('#^/promotions/([^/]+)$#', $path, $m)) {
  $slug = $m[1];
  $pdo = db();
  $stmt = $pdo->prepare("SELECT * FROM promotions WHERE slug = :s LIMIT 1");
  $stmt->execute([':s' => $slug]);
  $p = $stmt->fetch();
  if (!$p || !is_promotion_visible_row($p)) {
    json_response(['error' => 'not_found'], 404);
  }
  json_response(['promotion' => $p, 'rendered_html' => promotion_render_html($p)]);
}

// Auth: register
if ($method === 'POST' && $path === '/auth/register') {
  $body = read_json_body();
  $name = trim((string)($body['name'] ?? ''));
  $email = strtolower(trim((string)($body['email'] ?? '')));
  $password = (string)($body['password'] ?? '');

  if ($name === '' || $email === '' || strlen($password) < 8) {
    json_response(['error' => 'invalid_input'], 400);
  }

  $pdo = db();
  $hash = password_hash($password, PASSWORD_BCRYPT);
  try {
    $stmt = $pdo->prepare("INSERT INTO users (name, email, password_hash) VALUES (:n, :e, :p)");
    $stmt->execute([':n' => $name, ':e' => $email, ':p' => $hash]);
    $userId = (int)$pdo->lastInsertId();
  } catch (PDOException $e) {
    if ((int)$e->errorInfo[1] === 1062) {
      json_response(['error' => 'email_in_use'], 409);
    }
    throw $e;
  }

  json_response(['user_id' => $userId], 201);
}

function issue_tokens(int $userId): array
{
  $now = time();
  $accessPayload = [
    'iss' => JWT_ISSUER,
    'sub' => $userId,
    'typ' => 'access',
    'iat' => $now,
    'exp' => $now + JWT_ACCESS_TTL_SECONDS,
  ];
  $access = jwt_sign($accessPayload);

  $refreshToken = bin2hex(random_bytes(32));
  $refreshHash = hash('sha256', $refreshToken);
  $expiresAt = gmdate('Y-m-d H:i:s', $now + JWT_REFRESH_TTL_SECONDS);

  $pdo = db();
  $stmt = $pdo->prepare("
    INSERT INTO refresh_tokens (user_id, token_hash, user_agent, ip_address, expires_at)
    VALUES (:uid, :th, :ua, :ip, :exp)
  ");
  $stmt->execute([
    ':uid' => $userId,
    ':th' => $refreshHash,
    ':ua' => read_user_agent(),
    ':ip' => read_client_ip(),
    ':exp' => $expiresAt,
  ]);

  return [
    'access_token' => $access,
    'refresh_token' => $refreshToken,
    'access_expires_in' => JWT_ACCESS_TTL_SECONDS,
    'refresh_expires_in' => JWT_REFRESH_TTL_SECONDS,
  ];
}

// Auth: login
if ($method === 'POST' && $path === '/auth/login') {
  $body = read_json_body();
  $email = strtolower(trim((string)($body['email'] ?? '')));
  $password = (string)($body['password'] ?? '');

  $pdo = db();
  $stmt = $pdo->prepare("SELECT id, password_hash, is_blocked FROM users WHERE email = :e LIMIT 1");
  $stmt->execute([':e' => $email]);
  $user = $stmt->fetch();
  if (!$user || !password_verify($password, $user['password_hash'])) {
    json_response(['error' => 'invalid_credentials'], 401);
  }
  if ((int)$user['is_blocked'] === 1) {
    json_response(['error' => 'user_blocked'], 403);
  }

  // login event
  $stmt = $pdo->prepare("INSERT INTO login_events (user_id, ip_address, user_agent, session_info) VALUES (:uid, :ip, :ua, :s)");
  $stmt->execute([
    ':uid' => (int)$user['id'],
    ':ip' => read_client_ip(),
    ':ua' => read_user_agent(),
    ':s' => 'jwt',
  ]);

  json_response(issue_tokens((int)$user['id']));
}

// Auth: refresh
if ($method === 'POST' && $path === '/auth/refresh') {
  $body = read_json_body();
  $refresh = (string)($body['refresh_token'] ?? '');
  if ($refresh === '' || strlen($refresh) < 20) {
    json_response(['error' => 'invalid_input'], 400);
  }

  $pdo = db();
  $hash = hash('sha256', $refresh);
  $stmt = $pdo->prepare("
    SELECT id, user_id, expires_at, revoked_at
    FROM refresh_tokens
    WHERE token_hash = :h
    LIMIT 1
  ");
  $stmt->execute([':h' => $hash]);
  $row = $stmt->fetch();
  if (!$row) {
    json_response(['error' => 'invalid_refresh'], 401);
  }
  if (!empty($row['revoked_at'])) {
    json_response(['error' => 'invalid_refresh'], 401);
  }
  if (strtotime((string)$row['expires_at']) < time()) {
    json_response(['error' => 'refresh_expired'], 401);
  }

  // rotate: revoke old token
  $stmt = $pdo->prepare("UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE id = :id");
  $stmt->execute([':id' => (int)$row['id']]);

  json_response(issue_tokens((int)$row['user_id']));
}

// Auth: logout (revoke refresh)
if ($method === 'POST' && $path === '/auth/logout') {
  $body = read_json_body();
  $refresh = (string)($body['refresh_token'] ?? '');
  if ($refresh !== '') {
    $pdo = db();
    $hash = hash('sha256', $refresh);
    $stmt = $pdo->prepare("UPDATE refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE token_hash = :h");
    $stmt->execute([':h' => $hash]);
  }
  json_response(['ok' => true]);
}

// Me
if ($method === 'GET' && $path === '/me') {
  $payload = require_user();
  $uid = (int)$payload['sub'];

  $pdo = db();
  $stmt = $pdo->prepare("SELECT id, name, email, phone, country, address, is_blocked, created_at, updated_at FROM users WHERE id = :id LIMIT 1");
  $stmt->execute([':id' => $uid]);
  $user = $stmt->fetch();
  if (!$user) json_response(['error' => 'not_found'], 404);
  json_response(['user' => $user]);
}

// Me: update profile
if ($method === 'PATCH' && $path === '/me') {
  $payload = require_user();
  $uid = (int)$payload['sub'];
  $body = read_json_body();

  $name = trim((string)($body['name'] ?? ''));
  $phone = trim((string)($body['phone'] ?? ''));
  $country = trim((string)($body['country'] ?? ''));
  $address = trim((string)($body['address'] ?? ''));

  if ($name === '' || utf8_strlen($name) > 120) {
    json_response(['error' => 'invalid_input'], 400);
  }
  if (strlen($phone) > 40 || strlen($country) > 120 || strlen($address) > 255) {
    json_response(['error' => 'invalid_input'], 400);
  }

  $pdo = db();
  $stmt = $pdo->prepare("
    UPDATE users
    SET name = :n, phone = :p, country = :c, address = :a
    WHERE id = :id
  ");
  $stmt->execute([
    ':n' => $name,
    ':p' => $phone !== '' ? $phone : null,
    ':c' => $country !== '' ? $country : null,
    ':a' => $address !== '' ? $address : null,
    ':id' => $uid,
  ]);

  $stmt = $pdo->prepare("SELECT id, name, email, phone, country, address, is_blocked, created_at, updated_at FROM users WHERE id = :id LIMIT 1");
  $stmt->execute([':id' => $uid]);
  $user = $stmt->fetch();
  json_response(['user' => $user]);
}

// Me: change password
if ($method === 'POST' && $path === '/me/password') {
  $payload = require_user();
  $uid = (int)$payload['sub'];
  $body = read_json_body();

  $current = (string)($body['current_password'] ?? '');
  $new = (string)($body['new_password'] ?? '');
  if ($current === '' || strlen($new) < 8) {
    json_response(['error' => 'invalid_input'], 400);
  }

  $pdo = db();
  $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = :id LIMIT 1");
  $stmt->execute([':id' => $uid]);
  $user = $stmt->fetch();
  if (!$user || !password_verify($current, $user['password_hash'])) {
    json_response(['error' => 'invalid_credentials'], 401);
  }

  $hash = password_hash($new, PASSWORD_BCRYPT);
  $stmt = $pdo->prepare("UPDATE users SET password_hash = :p WHERE id = :id");
  $stmt->execute([':p' => $hash, ':id' => $uid]);
  json_response(['ok' => true]);
}

// Me: watch history
if ($method === 'GET' && $path === '/me/watch-history') {
  $payload = require_user();
  $uid = (int)$payload['sub'];
  $limit = min(max((int)($_GET['limit'] ?? 20), 1), 50);

  $pdo = db();
  $stmt = $pdo->prepare("
    SELECT
      pv.listing_id,
      MAX(pv.created_at) AS visited_at,
      l.title,
      l.slug,
      l.banner_image,
      t.name AS type_name,
      (
        SELECT CONCAT(p.name, ', ', c.name)
        FROM shows sh
        JOIN places p ON p.id = sh.place_id
        JOIN cities c ON c.id = p.city_id
        WHERE sh.listing_id = l.id
        ORDER BY COALESCE(sh.start_date, '9999-12-31') ASC, sh.id ASC
        LIMIT 1
      ) AS event_location
    FROM page_visits pv
    JOIN listings l ON l.id = pv.listing_id
    JOIN types t ON t.id = l.type_id
    WHERE pv.user_id = :uid AND pv.listing_id IS NOT NULL
    GROUP BY pv.listing_id, l.title, l.slug, l.banner_image, t.name
    ORDER BY visited_at DESC
    LIMIT $limit
  ");
  $stmt->execute([':uid' => $uid]);
  json_response(['items' => $stmt->fetchAll()]);
}

// Me: suggested listings in country
if ($method === 'GET' && $path === '/me/suggestions') {
  $payload = require_user();
  $uid = (int)$payload['sub'];
  $countryName = normalize_country_name($_GET['country'] ?? null) ?? 'Australia';
  $limit = min(max((int)($_GET['limit'] ?? 5), 1), 12);

  $pdo = db();
  $stmt = $pdo->prepare("
    SELECT DISTINCT listing_id
    FROM page_visits
    WHERE user_id = :uid AND listing_id IS NOT NULL
  ");
  $stmt->execute([':uid' => $uid]);
  $excludeIds = array_values(array_filter(array_map(
    fn($row) => isset($row['listing_id']) ? (int)$row['listing_id'] : 0,
    $stmt->fetchAll()
  )));

  $extra = [listing_country_exists_sql(':country_name')];
  $params = [':country_name' => $countryName];
  if (count($excludeIds)) {
    $parts = [];
    foreach ($excludeIds as $i => $id) {
      $key = ':ex' . $i;
      $parts[] = $key;
      $params[$key] = $id;
    }
    $extra[] = 'l.id NOT IN (' . implode(',', $parts) . ')';
  }

  $items = fetch_listing_cards(
    $pdo,
    $extra,
    $params,
    'COALESCE(l.publish_at, l.created_at) DESC',
    $limit
  );
  json_response(['items' => $items, 'country' => $countryName]);
}

// User action: rating
if ($method === 'POST' && preg_match('#^/listings/([0-9]+)/rating$#', $path, $m)) {
  $payload = require_user();
  $uid = (int)$payload['sub'];
  $listingId = (int)$m[1];
  $body = read_json_body();
  $rating = (int)($body['rating'] ?? 0);
  if ($rating < 1 || $rating > 5) {
    json_response(['error' => 'invalid_input'], 400);
  }

  $pdo = db();
  $stmt = $pdo->prepare("
    INSERT INTO ratings (user_id, listing_id, rating_value)
    VALUES (:u, :l, :r)
    ON DUPLICATE KEY UPDATE rating_value = VALUES(rating_value), updated_at = CURRENT_TIMESTAMP
  ");
  $stmt->execute([':u' => $uid, ':l' => $listingId, ':r' => $rating]);
  json_response(['ok' => true]);
}

// User action: comment (pending)
if ($method === 'POST' && preg_match('#^/listings/([0-9]+)/comments$#', $path, $m)) {
  $payload = require_user();
  $uid = (int)$payload['sub'];
  $listingId = (int)$m[1];
  $body = read_json_body();
  $text = trim((string)($body['comment'] ?? ''));
  if ($text === '' || utf8_strlen($text) > 2000) {
    json_response(['error' => 'invalid_input'], 400);
  }

  $pdo = db();
  $stmt = $pdo->prepare("INSERT INTO comments (user_id, listing_id, comment_text, status) VALUES (:u, :l, :t, 'pending')");
  $stmt->execute([':u' => $uid, ':l' => $listingId, ':t' => $text]);
  json_response(['ok' => true], 201);
}

// Analytics: page visit
if ($method === 'POST' && $path === '/analytics/page-visit') {
  $body = read_json_body();
  $listingId = isset($body['listing_id']) ? (int)$body['listing_id'] : null;
  $pathStr = trim((string)($body['path'] ?? ''));
  $ref = trim((string)($body['referrer'] ?? ''));

  if ($pathStr === '') json_response(['error' => 'invalid_input'], 400);

  $uid = null;
  $token = get_bearer_token();
  if ($token) {
    $p = jwt_verify($token);
    if (($p['typ'] ?? '') === 'access') $uid = (int)($p['sub'] ?? 0) ?: null;
  }

  $pdo = db();
  $stmt = $pdo->prepare("
    INSERT INTO page_visits (user_id, listing_id, path, referrer, ip_address, user_agent)
    VALUES (:u, :l, :p, :r, :ip, :ua)
  ");
  $stmt->execute([
    ':u' => $uid,
    ':l' => $listingId,
    ':p' => $pathStr,
    ':r' => ($ref === '' ? null : $ref),
    ':ip' => read_client_ip(),
    ':ua' => read_user_agent(),
  ]);
  json_response(['ok' => true], 201);
}

// Analytics: booking click
if ($method === 'POST' && $path === '/analytics/booking-click') {
  $body = read_json_body();
  $listingId = (int)($body['listing_id'] ?? 0);
  $showId = isset($body['show_id']) ? (int)$body['show_id'] : null;
  if ($listingId <= 0) json_response(['error' => 'invalid_input'], 400);

  $uid = null;
  $token = get_bearer_token();
  if ($token) {
    $p = jwt_verify($token);
    if (($p['typ'] ?? '') === 'access') $uid = (int)($p['sub'] ?? 0) ?: null;
  }

  $pdo = db();
  $stmt = $pdo->prepare("
    INSERT INTO booking_clicks (user_id, listing_id, show_id, ip_address, user_agent)
    VALUES (:u, :l, :s, :ip, :ua)
  ");
  $stmt->execute([
    ':u' => $uid,
    ':l' => $listingId,
    ':s' => $showId,
    ':ip' => read_client_ip(),
    ':ua' => read_user_agent(),
  ]);
  json_response(['ok' => true], 201);
}

// Public site settings (no cache — admin changes must show immediately)
if ($method === 'GET' && $path === '/settings/home-hero') {
  header('Cache-Control: no-store, no-cache, must-revalidate');
  header('Pragma: no-cache');
  $pdo = db();
  json_response(['settings' => load_home_hero_settings($pdo)]);
}

if ($method === 'GET' && $path === '/home/hero-counters') {
  header('Cache-Control: no-store, no-cache, must-revalidate');
  header('Pragma: no-cache');
  $pdo = db();
  $settings = load_home_hero_settings($pdo);
  json_response([
    'counters' => build_home_hero_counters($pdo, $settings),
    'animationMs' => (int)($settings['counterAnimationMs'] ?? 2000),
  ]);
}

if ($method === 'GET' && $path === '/settings/home-listings') {
  header('Cache-Control: no-store, no-cache, must-revalidate');
  header('Pragma: no-cache');
  $pdo = db();
  json_response(['settings' => load_home_listings_settings($pdo)]);
}

json_response(['error' => 'not_found'], 404);

