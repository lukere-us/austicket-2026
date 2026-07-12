<?php

declare(strict_types=1);

const PARTNERS_SETTING_KEY = 'home_partners';

function partners_default_settings(): array
{
  return [
    'enabled' => true,
    'sectionTitle' => 'Our partners',
    'speedSeconds' => 35,
    'pauseOnHover' => true,
    'logoMaxHeight' => 100,
    'gapPx' => 48,
    'showDecorLines' => true,
    'loadSequence' => 'ascending',
    'logos' => [],
  ];
}

function partners_clone_logos(array $items): array
{
  $out = [];
  foreach ($items as $index => $item) {
    if (!is_array($item)) continue;
    $imageUrl = trim((string)($item['imageUrl'] ?? ''));
    if ($imageUrl === '') continue;
    $out[] = [
      'id' => trim((string)($item['id'] ?? ('partner-' . ($index + 1)))),
      'name' => trim((string)($item['name'] ?? '')),
      'imageUrl' => $imageUrl,
      'linkUrl' => trim((string)($item['linkUrl'] ?? '')),
      'enabled' => !array_key_exists('enabled', $item) || site_settings_bool($item['enabled'], true),
    ];
  }
  return $out;
}

function partners_merge_settings(array $input): array
{
  $defaults = partners_default_settings();
  $out = $defaults;

  $rules = [
    'enabled' => 'bool',
    'sectionTitle' => 'text',
    'speedSeconds' => ['num', 8, 120],
    'pauseOnHover' => 'bool',
    'logoMaxHeight' => ['num', 32, 120],
    'gapPx' => ['num', 16, 120],
    'showDecorLines' => 'bool',
    'loadSequence' => ['enum', ['random', 'ascending', 'descending']],
  ];

  foreach ($rules as $key => $rule) {
    if (!array_key_exists($key, $input)) continue;
    $raw = $input[$key];
    $fallback = $defaults[$key];

    if ($rule === 'bool') {
      $out[$key] = site_settings_bool($raw, $fallback);
      continue;
    }
    if ($rule === 'text') {
      $s = trim((string)$raw);
      $out[$key] = $s !== '' ? $s : $fallback;
      continue;
    }
    if (is_array($rule) && ($rule[0] ?? '') === 'enum') {
      $s = strtolower(trim((string)$raw));
      $allowed = $rule[1] ?? [];
      $out[$key] = in_array($s, $allowed, true) ? $s : $fallback;
      continue;
    }
    if (is_array($rule) && ($rule[0] ?? '') === 'num') {
      $n = site_settings_clamp_number($raw, (float)$rule[1], (float)$rule[2]);
      $out[$key] = $n === null ? $fallback : (int)$n;
    }
  }

  if (array_key_exists('logos', $input) && is_array($input['logos'])) {
    $out['logos'] = partners_clone_logos($input['logos']);
  }

  return $out;
}

function load_partners_settings(PDO $pdo): array
{
  try {
    $stmt = $pdo->prepare('SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1');
    $stmt->execute([PARTNERS_SETTING_KEY]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row && array_key_exists('setting_value', $row)) {
      $parsed = site_settings_decode_json($row['setting_value']);
      if (is_array($parsed)) {
        return partners_merge_settings($parsed);
      }
    }
  } catch (Throwable) {
    // table may not exist yet
  }
  return partners_default_settings();
}
