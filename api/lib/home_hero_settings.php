<?php

declare(strict_types=1);

const HOME_HERO_SETTING_KEY = 'home_hero';

function home_hero_default_settings(): array
{
  static $defaults = null;
  if ($defaults !== null) return $defaults;

  $path = dirname(__DIR__, 2) . '/shared/home-hero-settings.defaults.json';
  $raw = @file_get_contents($path);
  if ($raw === false) {
    $defaults = [];
    return $defaults;
  }
  $decoded = json_decode($raw, true);
  $defaults = is_array($decoded) ? $decoded : [];
  return $defaults;
}

function home_hero_clamp_number(mixed $value, float $min, float $max): ?float
{
  if (!is_numeric($value)) return null;
  $n = (float)$value;
  return min($max, max($min, $n));
}

function home_hero_merge_settings(array $input): array
{
  $defaults = home_hero_default_settings();
  $out = $defaults;

  $rules = [
    'autoplayEnabled' => 'bool',
    'autoplayIntervalMs' => ['num', 2000, 60000],
    'pauseOnHover' => 'bool',
    'transitionDurationMs' => ['num', 200, 3000],
    'maxSlides' => ['num', 1, 12],
    'swipeThresholdPx' => ['num', 10, 200],
    'showNavButtons' => 'bool',
    'showDots' => 'bool',
    'showReflection' => 'bool',
    'posterHeightMobileActive' => ['num', 120, 600],
    'posterHeightDesktopActive' => ['num', 200, 800],
    'posterHeightMobileInactive' => ['num', 100, 500],
    'posterHeightDesktopInactive' => ['num', 150, 700],
    'stageHeightMobile' => ['num', 200, 700],
    'stageHeightDesktop' => ['num', 300, 900],
    'spreadMobile' => ['num', 40, 400],
    'spreadDesktop' => ['num', 40, 500],
    'inactiveBlurPx' => ['num', 0, 20],
    'inactiveOpacity' => ['num', 0, 1],
    'inactiveScale' => ['num', 0.2, 1],
    'activeScale' => ['num', 0.5, 1.2],
    'rotateYMobile' => ['num', 0, 90],
    'rotateYDesktop' => ['num', 0, 90],
    'translateZActive' => ['num', -200, 200],
    'translateZInactive' => ['num', -300, 100],
    'backgroundBlurPx' => ['num', 0, 40],
    'backgroundFadeMs' => ['num', 200, 3000],
    'backgroundTransition' => 'fade_slide',
    'useTrailerVideo' => 'bool',
    'backgroundObjectPosition' => 'text',
    'backgroundScalePercent' => ['num', 100, 150],
    'backgroundSaturationPercent' => ['num', 50, 200],
    'scrimBaseOpacity' => ['num', 0, 100],
    'scrimGradientTopOpacity' => ['num', 0, 100],
    'scrimGradientMidOpacity' => ['num', 0, 100],
    'scrimGradientBottomOpacity' => ['num', 0, 100],
    'scrimSideOpacity' => ['num', 0, 100],
  ];

  foreach ($defaults as $key => $fallback) {
    if (!array_key_exists($key, $input)) continue;
    $rule = $rules[$key] ?? null;
    $raw = $input[$key];

    if ($rule === 'bool') {
      $out[$key] = site_settings_bool($raw, (bool)$fallback);
      continue;
    }
    if ($rule === 'text') {
      $s = trim((string)$raw);
      $out[$key] = $s !== '' ? $s : $fallback;
      continue;
    }
    if ($rule === 'fade_slide') {
      $out[$key] = in_array($raw, ['fade', 'slide'], true) ? $raw : $fallback;
      continue;
    }
    if (is_array($rule) && ($rule[0] ?? '') === 'num') {
      $n = home_hero_clamp_number($raw, (float)$rule[1], (float)$rule[2]);
      $out[$key] = $n === null ? $fallback : $n;
      continue;
    }
    $out[$key] = $raw;
  }

  return $out;
}

function load_home_hero_settings(PDO $pdo): array
{
  try {
    $stmt = $pdo->prepare('SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1');
    $stmt->execute([HOME_HERO_SETTING_KEY]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row && array_key_exists('setting_value', $row)) {
      $parsed = site_settings_decode_json($row['setting_value']);
      if (is_array($parsed)) {
        return home_hero_merge_settings($parsed);
      }
    }
  } catch (Throwable) {
    // table may not exist yet
  }
  return home_hero_default_settings();
}
