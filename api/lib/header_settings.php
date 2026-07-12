<?php

declare(strict_types=1);

const HEADER_SETTING_KEY = 'header';

function header_default_nav_links(): array
{
  return [
    ['label' => 'Blog', 'url' => '/blogs', 'enabled' => true],
  ];
}

function header_default_settings(): array
{
  return [
    'siteName' => 'AUS Ticket Lanka',
    'siteNameAu' => '',
    'siteNameNz' => '',
    'taglineTemplate' => "What's on across {location}",
    'homeUrl' => '/',
    'logoAuUrl' => '',
    'logoNzUrl' => '',
    'countryBranding' => new stdClass(),
    'useCountryBadge' => true,
    'customBadgeText' => 'AUS',
    'showSearch' => true,
    'showCountrySelector' => true,
    'showThemeToggle' => true,
    'showAuthButtons' => true,
    'loginLabel' => 'Login',
    'registerLabel' => 'Register',
    'navLinks' => header_default_nav_links(),
  ];
}

function header_clone_nav_links(array $items): array
{
  $out = [];
  foreach ($items as $item) {
    if (!is_array($item)) continue;
    $label = trim((string)($item['label'] ?? ''));
    $url = trim((string)($item['url'] ?? ''));
    if ($label === '' || $url === '') continue;
    $enabled = !array_key_exists('enabled', $item) || site_settings_bool($item['enabled'], true);
    $out[] = ['label' => $label, 'url' => $url, 'enabled' => $enabled];
  }
  return $out;
}

function header_normalize_country_code(mixed $raw): string
{
  $code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', (string)$raw) ?? '');
  return substr($code, 0, 10);
}

/**
 * @return array<string, array{siteName: string, logoUrl: string}>
 */
function header_clone_country_branding(mixed $input): array
{
  $out = [];
  if (!is_array($input) && !($input instanceof stdClass)) {
    return $out;
  }
  $items = is_array($input) ? $input : (array)$input;
  foreach ($items as $rawCode => $rawEntry) {
    $code = header_normalize_country_code($rawCode);
    if ($code === '') continue;
    $entry = is_array($rawEntry) ? $rawEntry : (is_object($rawEntry) ? (array)$rawEntry : []);
    $out[$code] = [
      'siteName' => trim((string)($entry['siteName'] ?? '')),
      'logoUrl' => trim((string)($entry['logoUrl'] ?? '')),
    ];
  }
  return $out;
}

/**
 * @param array<string, array{siteName: string, logoUrl: string}> $branding
 * @return array<string, array{siteName: string, logoUrl: string}>
 */
function header_seed_country_branding_from_legacy(array $branding, array $input): array
{
  $logoAu = trim((string)($input['logoAuUrl'] ?? ''));
  $logoNz = trim((string)($input['logoNzUrl'] ?? ''));
  $nameAu = trim((string)($input['siteNameAu'] ?? ''));
  $nameNz = trim((string)($input['siteNameNz'] ?? ''));

  if ($logoAu !== '' || $nameAu !== '') {
    $branding['AU'] = [
      'siteName' => trim((string)($branding['AU']['siteName'] ?? '')) !== ''
        ? (string)$branding['AU']['siteName']
        : $nameAu,
      'logoUrl' => trim((string)($branding['AU']['logoUrl'] ?? '')) !== ''
        ? (string)$branding['AU']['logoUrl']
        : $logoAu,
    ];
  }
  if ($logoNz !== '' || $nameNz !== '') {
    $branding['NZ'] = [
      'siteName' => trim((string)($branding['NZ']['siteName'] ?? '')) !== ''
        ? (string)$branding['NZ']['siteName']
        : $nameNz,
      'logoUrl' => trim((string)($branding['NZ']['logoUrl'] ?? '')) !== ''
        ? (string)$branding['NZ']['logoUrl']
        : $logoNz,
    ];
  }

  $legacyLogo = trim((string)($input['logoImageUrl'] ?? ''));
  if ($legacyLogo !== '') {
    if (!isset($branding['AU'])) $branding['AU'] = ['siteName' => '', 'logoUrl' => ''];
    if (!isset($branding['NZ'])) $branding['NZ'] = ['siteName' => '', 'logoUrl' => ''];
    if ($branding['AU']['logoUrl'] === '') $branding['AU']['logoUrl'] = $legacyLogo;
    if ($branding['NZ']['logoUrl'] === '') $branding['NZ']['logoUrl'] = $legacyLogo;
  }

  return $branding;
}

/**
 * @param array<string, mixed> $out
 * @return array<string, mixed>
 */
function header_sync_legacy_from_country_branding(array $out): array
{
  $branding = is_array($out['countryBranding'] ?? null) ? $out['countryBranding'] : [];
  $out['logoAuUrl'] = trim((string)($branding['AU']['logoUrl'] ?? ''));
  $out['logoNzUrl'] = trim((string)($branding['NZ']['logoUrl'] ?? ''));
  $out['siteNameAu'] = trim((string)($branding['AU']['siteName'] ?? ''));
  $out['siteNameNz'] = trim((string)($branding['NZ']['siteName'] ?? ''));
  return $out;
}

function header_merge_settings(array $input): array
{
  $defaults = header_default_settings();
  $out = $defaults;
  // Encode empty object for JSON; keep PHP array for working copy.
  $out['countryBranding'] = [];

  $rules = [
    'siteName' => 'text',
    'taglineTemplate' => 'text',
    'homeUrl' => 'text',
    'useCountryBadge' => 'bool',
    'customBadgeText' => 'text',
    'showSearch' => 'bool',
    'showCountrySelector' => 'bool',
    'showThemeToggle' => 'bool',
    'showAuthButtons' => 'bool',
    'loginLabel' => 'text',
    'registerLabel' => 'text',
  ];

  foreach ($rules as $key => $rule) {
    if (!array_key_exists($key, $input)) continue;
    $raw = $input[$key];
    $fallback = $defaults[$key];

    if ($rule === 'bool') {
      $out[$key] = site_settings_bool($raw, $fallback);
      continue;
    }
    $s = trim((string)$raw);
    $out[$key] = $s !== '' ? $s : $fallback;
  }

  if (array_key_exists('navLinks', $input) && is_array($input['navLinks'])) {
    $out['navLinks'] = header_clone_nav_links($input['navLinks']);
  }

  $branding = [];
  if (array_key_exists('countryBranding', $input)) {
    $branding = header_clone_country_branding($input['countryBranding']);
  }
  $branding = header_seed_country_branding_from_legacy($branding, $input);
  $out['countryBranding'] = $branding;

  return header_sync_legacy_from_country_branding($out);
}

function load_header_settings(PDO $pdo): array
{
  try {
    $stmt = $pdo->prepare('SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1');
    $stmt->execute([HEADER_SETTING_KEY]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row && array_key_exists('setting_value', $row)) {
      $parsed = site_settings_decode_json($row['setting_value']);
      if (is_array($parsed)) {
        return header_merge_settings($parsed);
      }
    }
  } catch (Throwable) {
    // table may not exist yet
  }
  $defaults = header_default_settings();
  $defaults['countryBranding'] = [];
  return $defaults;
}
