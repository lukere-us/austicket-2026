<?php

declare(strict_types=1);

const GENERAL_SETTING_KEY = 'site_general';

function general_default_settings(): array
{
  return [
    'analyticsEnabled' => true,
    'googleAnalyticsId' => '',
    'googleTagManagerId' => '',
    'facebookPixelId' => '',
    'customHeadHtml' => '',
    'customBodyEndHtml' => '',
  ];
}

function general_normalize_tracking_id(mixed $raw): string
{
  $s = trim((string)$raw);
  return trim($s, "\"'");
}

function general_merge_settings(array $input): array
{
  $defaults = general_default_settings();
  return [
    'analyticsEnabled' => site_settings_bool($input['analyticsEnabled'] ?? $defaults['analyticsEnabled'], true),
    'googleAnalyticsId' => general_normalize_tracking_id($input['googleAnalyticsId'] ?? ''),
    'googleTagManagerId' => general_normalize_tracking_id($input['googleTagManagerId'] ?? ''),
    'facebookPixelId' => general_normalize_tracking_id($input['facebookPixelId'] ?? ''),
    'customHeadHtml' => (string)($input['customHeadHtml'] ?? ''),
    'customBodyEndHtml' => (string)($input['customBodyEndHtml'] ?? ''),
  ];
}

function load_general_settings(PDO $pdo): array
{
  try {
    $stmt = $pdo->prepare('SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1');
    $stmt->execute([GENERAL_SETTING_KEY]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row && array_key_exists('setting_value', $row)) {
      $parsed = site_settings_decode_json($row['setting_value']);
      if (is_array($parsed)) {
        return general_merge_settings($parsed);
      }
    }
  } catch (Throwable) {
    // table may not exist yet
  }
  return general_default_settings();
}
