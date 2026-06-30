<?php

declare(strict_types=1);

const YOUTUBE_CAROUSEL_SETTING_KEY = 'home_youtube_carousel';

function youtube_carousel_extract_video_id(string $url): string
{
  $url = trim($url);
  if ($url === '') return '';

  $parts = parse_url($url);
  if (!is_array($parts)) return '';

  $host = strtolower((string)($parts['host'] ?? ''));
  $host = preg_replace('/^www\./', '', $host) ?? $host;
  $path = (string)($parts['path'] ?? '');
  $query = (string)($parts['query'] ?? '');

  if ($host === 'youtu.be' || str_ends_with($host, '.youtu.be')) {
    $id = trim($path, '/');
    return $id !== '' ? explode('/', $id)[0] : '';
  }

  if ($host === 'youtube.com' || str_ends_with($host, '.youtube.com')) {
    if (str_starts_with($path, '/embed/')) {
      $id = substr($path, strlen('/embed/'));
      return $id !== '' ? explode('/', $id)[0] : '';
    }
    if (str_starts_with($path, '/shorts/')) {
      $id = substr($path, strlen('/shorts/'));
      return $id !== '' ? explode('/', $id)[0] : '';
    }
    parse_str($query, $qs);
    return isset($qs['v']) ? trim((string)$qs['v']) : '';
  }

  return '';
}

function youtube_carousel_default_settings(): array
{
  return [
    'enabled' => true,
    'sectionTitle' => 'Our Streaming',
    'showDecorLines' => true,
    'autoplayCarousel' => false,
    'scrollSeconds' => 8,
    'videos' => [],
  ];
}

function youtube_carousel_clone_videos(array $items): array
{
  $out = [];
  foreach ($items as $index => $item) {
    if (!is_array($item)) continue;
    $youtubeUrl = trim((string)($item['youtubeUrl'] ?? ''));
    $videoId = youtube_carousel_extract_video_id($youtubeUrl);
    if ($videoId === '') continue;
    $out[] = [
      'id' => trim((string)($item['id'] ?? ('video-' . ($index + 1)))),
      'title' => trim((string)($item['title'] ?? '')),
      'youtubeUrl' => $youtubeUrl,
      'videoId' => $videoId,
      'enabled' => !array_key_exists('enabled', $item) || site_settings_bool($item['enabled'], true),
    ];
  }
  return $out;
}

function youtube_carousel_merge_settings(array $input): array
{
  $defaults = youtube_carousel_default_settings();
  $out = $defaults;

  $rules = [
    'enabled' => 'bool',
    'sectionTitle' => 'text',
    'showDecorLines' => 'bool',
    'autoplayCarousel' => 'bool',
    'scrollSeconds' => ['num', 3, 60],
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
    if (is_array($rule) && ($rule[0] ?? '') === 'num') {
      $n = site_settings_clamp_number($raw, (float)$rule[1], (float)$rule[2]);
      $out[$key] = $n === null ? $fallback : (int)$n;
    }
  }

  if (array_key_exists('videos', $input) && is_array($input['videos'])) {
    $out['videos'] = youtube_carousel_clone_videos($input['videos']);
  }

  return $out;
}

function load_youtube_carousel_settings(PDO $pdo): array
{
  try {
    $stmt = $pdo->prepare('SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1');
    $stmt->execute([YOUTUBE_CAROUSEL_SETTING_KEY]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row && array_key_exists('setting_value', $row)) {
      $parsed = site_settings_decode_json($row['setting_value']);
      if (is_array($parsed)) {
        return youtube_carousel_merge_settings($parsed);
      }
    }
  } catch (Throwable) {
    // table may not exist yet
  }
  return youtube_carousel_default_settings();
}
