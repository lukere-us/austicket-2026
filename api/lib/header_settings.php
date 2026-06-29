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

function header_merge_settings(array $input): array
{
  $defaults = header_default_settings();
  $out = $defaults;

  $rules = [
    'siteName' => 'text',
    'siteNameAu' => 'optional_text',
    'siteNameNz' => 'optional_text',
    'taglineTemplate' => 'text',
    'homeUrl' => 'text',
    'logoAuUrl' => 'text',
    'logoNzUrl' => 'text',
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
    if ($rule === 'optional_text') {
      $out[$key] = trim((string)$raw);
      continue;
    }
    $s = trim((string)$raw);
    $out[$key] = $s !== '' ? $s : $fallback;
  }

  if (array_key_exists('navLinks', $input) && is_array($input['navLinks'])) {
    $out['navLinks'] = header_clone_nav_links($input['navLinks']);
  }

  if (empty($out['logoAuUrl']) && empty($out['logoNzUrl']) && !empty($input['logoImageUrl'])) {
    $legacy = trim((string)$input['logoImageUrl']);
    if ($legacy !== '') {
      $out['logoAuUrl'] = $legacy;
      $out['logoNzUrl'] = $legacy;
    }
  }

  return $out;
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
  return header_default_settings();
}
