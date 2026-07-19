<?php

declare(strict_types=1);

const HOME_LISTINGS_SETTING_KEY = 'home_listings';

function home_listings_default_settings(): array
{
  return [
    'columnsMobile' => 2,
    'columnsTablet' => 3,
    'columnsDesktop' => 4,
    'maxListings' => 0,
    'gridGapX' => 16,
    'gridGapY' => 32,
    'showCityTabs' => true,
    'locationTabsMode' => 'cities',
    'showSectionDecorLines' => true,
    'sectionTitle' => 'Top Events in {location}',
    'sectionSubtitle' => 'Find Events in Your City.',
    'showTypeBadge' => true,
    'showHoverCta' => true,
    'showTitleBelowCard' => true,
    'cardHoverLift' => true,
    'cardImageAspect' => '2/3',
    'animationEnabled' => true,
    'animationStaggerMs' => 50,
    'skeletonCount' => 8,
    'emptyStateShowAdminLink' => true,
  ];
}

function home_listings_merge_settings(array $input): array
{
  $defaults = home_listings_default_settings();
  $out = $defaults;

  $rules = [
    'columnsMobile' => ['num', 1, 4],
    'columnsTablet' => ['num', 1, 6],
    'columnsDesktop' => ['num', 1, 8],
    'maxListings' => ['num', 0, 96],
    'gridGapX' => ['num', 0, 64],
    'gridGapY' => ['num', 0, 96],
    'showCityTabs' => 'bool',
    'locationTabsMode' => 'tabsMode',
    'showSectionDecorLines' => 'bool',
    'sectionTitle' => 'text',
    'sectionSubtitle' => 'text',
    'showTypeBadge' => 'bool',
    'showHoverCta' => 'bool',
    'showTitleBelowCard' => 'bool',
    'cardHoverLift' => 'bool',
    'cardImageAspect' => 'aspect',
    'animationEnabled' => 'bool',
    'animationStaggerMs' => ['num', 0, 200],
    'skeletonCount' => ['num', 4, 24],
    'emptyStateShowAdminLink' => 'bool',
  ];

  foreach ($defaults as $key => $fallback) {
    if (!array_key_exists($key, $input)) continue;
    $rule = $rules[$key] ?? null;
    $raw = $input[$key];

    if ($rule === 'bool') {
      $out[$key] = site_settings_bool($raw, $fallback);
      continue;
    }
    if ($rule === 'text') {
      $s = trim((string)$raw);
      $out[$key] = $s !== '' ? $s : $fallback;
      continue;
    }
    if ($rule === 'aspect') {
      $out[$key] = in_array($raw, ['2/3', '3/4', '1/1'], true) ? $raw : $fallback;
      continue;
    }
    if ($rule === 'tabsMode') {
      $mode = strtolower(trim((string)$raw));
      $out[$key] = in_array($mode, ['cities', 'states'], true) ? $mode : $fallback;
      continue;
    }
    if (is_array($rule) && ($rule[0] ?? '') === 'num') {
      $n = site_settings_clamp_number($raw, (float)$rule[1], (float)$rule[2]);
      $out[$key] = $n === null ? $fallback : (int)$n;
      continue;
    }
    $out[$key] = $raw;
  }

  return $out;
}

function load_home_listings_settings(PDO $pdo): array
{
  try {
    $stmt = $pdo->prepare('SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1');
    $stmt->execute([HOME_LISTINGS_SETTING_KEY]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row && array_key_exists('setting_value', $row)) {
      $parsed = site_settings_decode_json($row['setting_value']);
      if (is_array($parsed)) {
        return home_listings_merge_settings($parsed);
      }
    }
  } catch (Throwable) {
    // table may not exist yet
  }
  return home_listings_default_settings();
}
