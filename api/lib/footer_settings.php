<?php

declare(strict_types=1);

const FOOTER_SETTING_KEY = 'footer';

function footer_default_useful_links(): array
{
  return [
    ['label' => 'About us', 'url' => '/about', 'enabled' => true],
    ['label' => 'Contact us', 'url' => '/contact', 'enabled' => true],
    ['label' => 'Blog', 'url' => '/blogs', 'enabled' => true],
    ['label' => 'Privacy policy', 'url' => '/privacy', 'enabled' => true],
    ['label' => 'Terms of use', 'url' => '/terms', 'enabled' => true],
  ];
}

function footer_default_social_links(): array
{
  return [
    ['platform' => 'facebook', 'label' => 'Facebook', 'url' => '', 'iconUrl' => '', 'enabled' => false],
    ['platform' => 'instagram', 'label' => 'Instagram', 'url' => '', 'iconUrl' => '', 'enabled' => false],
    ['platform' => 'twitter', 'label' => 'X (Twitter)', 'url' => '', 'iconUrl' => '', 'enabled' => false],
    ['platform' => 'youtube', 'label' => 'YouTube', 'url' => '', 'iconUrl' => '', 'enabled' => false],
    ['platform' => 'tiktok', 'label' => 'TikTok', 'url' => '', 'iconUrl' => '', 'enabled' => false],
    ['platform' => 'linkedin', 'label' => 'LinkedIn', 'url' => '', 'iconUrl' => '', 'enabled' => false],
  ];
}

function footer_default_settings(): array
{
  return [
    'aboutTitle' => 'AUS Ticket Lanka',
    'aboutDescription' => 'A modern listings experience that connects you to official booking links for movies and live events.',
    'citiesHeading' => 'Popular cities',
    'showAllEventsLink' => true,
    'allEventsLabel' => 'All events',
    'allEventsUrl' => '/',
    'maxAutoCities' => 8,
    'cityLinks' => [],
    'linksHeading' => 'Useful links',
    'usefulLinks' => footer_default_useful_links(),
    'contactHeading' => 'Contact details',
    'contactEmail' => 'info@austicketlanka.com',
    'contactPhone' => '',
    'socialHeading' => 'Follow us',
    'socialLinks' => footer_default_social_links(),
    'copyrightText' => '© {year} AUS Ticket Lanka. All rights reserved.',
  ];
}

function footer_clone_links(array $items, array $fallback): array
{
  if (count($items) === 0) {
    return array_map(static fn ($item) => $item, $fallback);
  }
  $out = [];
  foreach ($items as $item) {
    if (!is_array($item)) continue;
    $label = trim((string)($item['label'] ?? ''));
    $url = trim((string)($item['url'] ?? ''));
    $enabled = !array_key_exists('enabled', $item) || site_settings_bool($item['enabled'], true);
    $out[] = ['label' => $label, 'url' => $url, 'enabled' => $enabled];
  }

  $hasBlog = false;
  foreach ($out as $link) {
    if (($link['url'] ?? '') === '/blogs') {
      $hasBlog = true;
      break;
    }
  }
  if (!$hasBlog) {
    foreach ($fallback as $link) {
      if (($link['url'] ?? '') === '/blogs') {
        $inserted = false;
        foreach ($out as $i => $existing) {
          if (($existing['url'] ?? '') === '/contact') {
            array_splice($out, $i + 1, 0, [$link]);
            $inserted = true;
            break;
          }
        }
        if (!$inserted) $out[] = $link;
        break;
      }
    }
  }

  return $out;
}

function footer_clone_city_links(array $items): array
{
  $out = [];
  foreach ($items as $item) {
    if (!is_array($item)) continue;
    $label = trim((string)($item['label'] ?? $item['name'] ?? ''));
    $url = trim((string)($item['url'] ?? ''));
    if ($label === '' || $url === '') continue;
    $enabled = !array_key_exists('enabled', $item) || site_settings_bool($item['enabled'], true);
    $out[] = ['label' => $label, 'url' => $url, 'enabled' => $enabled];
  }
  return $out;
}

function footer_clone_social_links(array $items, array $fallback): array
{
  $platforms = [];
  foreach ($fallback as $item) {
    $platforms[(string)$item['platform']] = $item;
  }
  foreach ($items as $item) {
    if (!is_array($item)) continue;
    $platform = strtolower(trim((string)($item['platform'] ?? '')));
    if ($platform === '' || !array_key_exists($platform, $platforms)) continue;
    $base = $platforms[$platform];
    $platforms[$platform] = [
      'platform' => $platform,
      'label' => trim((string)($item['label'] ?? $base['label'])) ?: $base['label'],
      'url' => trim((string)($item['url'] ?? '')),
      'iconUrl' => trim((string)($item['iconUrl'] ?? $base['iconUrl'] ?? '')),
      'enabled' => site_settings_bool($item['enabled'] ?? false, false),
    ];
  }
  return array_values($platforms);
}

function footer_merge_settings(array $input): array
{
  $defaults = footer_default_settings();
  $out = $defaults;

  $rules = [
    'aboutTitle' => 'text',
    'aboutDescription' => 'text',
    'citiesHeading' => 'text',
    'showAllEventsLink' => 'bool',
    'allEventsLabel' => 'text',
    'allEventsUrl' => 'text',
    'maxAutoCities' => ['num', 1, 24],
    'linksHeading' => 'text',
    'contactHeading' => 'text',
    'contactEmail' => 'text',
    'contactPhone' => 'text',
    'socialHeading' => 'text',
    'copyrightText' => 'text',
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

  if (array_key_exists('usefulLinks', $input) && is_array($input['usefulLinks'])) {
    $out['usefulLinks'] = footer_clone_links($input['usefulLinks'], footer_default_useful_links());
  }
  if (array_key_exists('socialLinks', $input) && is_array($input['socialLinks'])) {
    $out['socialLinks'] = footer_clone_social_links($input['socialLinks'], footer_default_social_links());
  }
  if (array_key_exists('cityLinks', $input) && is_array($input['cityLinks'])) {
    $out['cityLinks'] = footer_clone_city_links($input['cityLinks']);
  }

  return $out;
}

function load_footer_settings(PDO $pdo): array
{
  try {
    $stmt = $pdo->prepare('SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1');
    $stmt->execute([FOOTER_SETTING_KEY]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row && array_key_exists('setting_value', $row)) {
      $parsed = site_settings_decode_json($row['setting_value']);
      if (is_array($parsed)) {
        return footer_merge_settings($parsed);
      }
    }
  } catch (Throwable) {
    // table may not exist yet
  }
  return footer_default_settings();
}
