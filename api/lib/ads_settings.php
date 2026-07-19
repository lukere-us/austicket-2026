<?php

declare(strict_types=1);

const ADS_SETTING_KEY = 'site_ads';

function ads_default_settings(): array
{
  return [
    'publishStatus' => 'published',
    'adsPerRow' => 2,
    'sectionTitle' => '',
    'items' => [],
  ];
}

function ads_normalize_type(mixed $raw): string
{
  $s = strtolower(trim((string)$raw));
  if (in_array($s, ['image', 'youtube', 'html', 'iframe'], true)) return $s;
  return 'image';
}

function ads_clone_items(array $items): array
{
  $out = [];
  foreach ($items as $index => $item) {
    if (!is_array($item)) continue;
    $adType = ads_normalize_type($item['adType'] ?? 'image');
    $entry = [
      'id' => trim((string)($item['id'] ?? ('ad-' . ($index + 1)))),
      'adType' => $adType,
      'title' => trim((string)($item['title'] ?? '')),
      'imageUrl' => trim((string)($item['imageUrl'] ?? '')),
      'linkUrl' => trim((string)($item['linkUrl'] ?? '')),
      'youtubeUrl' => trim((string)($item['youtubeUrl'] ?? '')),
      'embedHtml' => trim((string)($item['embedHtml'] ?? '')),
      'iframeUrl' => trim((string)($item['iframeUrl'] ?? '')),
      'enabled' => !array_key_exists('enabled', $item) || site_settings_bool($item['enabled'], true),
      'showOnDetailsPage' => array_key_exists('showOnDetailsPage', $item)
        ? site_settings_bool($item['showOnDetailsPage'], false)
        : false,
    ];

    $ok = match ($adType) {
      'image' => $entry['imageUrl'] !== '',
      'youtube' => $entry['youtubeUrl'] !== '',
      'html' => $entry['embedHtml'] !== '',
      'iframe' => $entry['iframeUrl'] !== '',
      default => false,
    };
    if ($ok) $out[] = $entry;
  }
  return $out;
}

function ads_merge_settings(array $input): array
{
  $defaults = ads_default_settings();
  $out = $defaults;

  if (array_key_exists('publishStatus', $input)) {
    $status = strtolower(trim((string)$input['publishStatus']));
    $out['publishStatus'] = in_array($status, ['published', 'draft'], true) ? $status : $defaults['publishStatus'];
  } elseif (array_key_exists('enabled', $input)) {
    $out['publishStatus'] = site_settings_bool($input['enabled'], true) ? 'published' : 'draft';
  }

  if (array_key_exists('adsPerRow', $input)) {
    $n = site_settings_clamp_number($input['adsPerRow'], 1, 4);
    $out['adsPerRow'] = $n === null ? $defaults['adsPerRow'] : (int)$n;
  }

  if (array_key_exists('sectionTitle', $input)) {
    $out['sectionTitle'] = trim((string)$input['sectionTitle']);
  }

  if (array_key_exists('items', $input) && is_array($input['items'])) {
    $out['items'] = ads_clone_items($input['items']);
  }

  return $out;
}

function load_ads_settings(PDO $pdo): array
{
  try {
    $stmt = $pdo->prepare('SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1');
    $stmt->execute([ADS_SETTING_KEY]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row && array_key_exists('setting_value', $row)) {
      $parsed = site_settings_decode_json($row['setting_value']);
      if (is_array($parsed)) {
        return ads_merge_settings($parsed);
      }
    }
  } catch (Throwable) {
    // table may not exist yet
  }
  return ads_default_settings();
}
