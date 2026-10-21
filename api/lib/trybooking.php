<?php

declare(strict_types=1);

const TRYBOOKING_API_ORIGIN = 'https://api.trybooking.com';
const TRYBOOKING_CACHE_TTL_SECONDS = 60;
const TRYBOOKING_TIMEOUT_SECONDS = 8;

/**
 * Numeric TryBooking event ID from a booking URL: trybooking.com /events/landing/{id}, /events/{id}/…,
 * ?eid={id}, or our own /onlineticket?eventid={id}. Short links (trybooking.com/ABCDE) are not resolved here.
 */
function trybooking_event_id_from_url(?string $raw): ?int
{
  $url = trim((string)$raw);
  if ($url === '') return null;
  $parts = parse_url($url);
  if (!is_array($parts) || empty($parts['host'])) return null;

  $host = strtolower((string)$parts['host']);
  $path = (string)($parts['path'] ?? '');
  parse_str((string)($parts['query'] ?? ''), $query);

  if (preg_match('#/onlineticket(\.php)?/?$#i', $path)) {
    $id = trim((string)($query['eventid'] ?? $query['eventId'] ?? ''));
    return ctype_digit($id) ? (int)$id : null;
  }
  if (!preg_match('/(^|\.)trybooking\./', $host)) return null;

  $eid = trim((string)($query['eid'] ?? $query['eventId'] ?? $query['eventid'] ?? ''));
  if ($eid !== '' && ctype_digit($eid)) return (int)$eid;

  if (preg_match('#/events/(?:landing/)?(\d+)#i', $path, $m)) return (int)$m[1];
  return null;
}

/**
 * Keys of the listing organizer (Partners slider entry) when both are set, otherwise Site settings > General.
 *
 * @return array{region: string, apiKey: string, secretKey: string}|null
 */
function trybooking_credentials_for_partner(PDO $pdo, ?string $partnerId): ?array
{
  $id = trim((string)$partnerId);
  if ($id !== '') {
    $partners = load_partners_settings($pdo);
    foreach ($partners['logos'] ?? [] as $logo) {
      if (!is_array($logo) || trim((string)($logo['id'] ?? '')) !== $id) continue;
      if (($logo['trybookingApiKey'] ?? '') !== '' && ($logo['trybookingSecretKey'] ?? '') !== '') {
        return [
          'region' => (string)($logo['trybookingRegion'] ?? 'au'),
          'apiKey' => (string)$logo['trybookingApiKey'],
          'secretKey' => (string)$logo['trybookingSecretKey'],
        ];
      }
      break;
    }
  }
  return load_trybooking_credentials($pdo);
}

function trybooking_cache_path(string $key): string
{
  $dir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'austicket-trybooking';
  if (!is_dir($dir)) @mkdir($dir, 0700, true);
  return $dir . DIRECTORY_SEPARATOR . hash('sha256', $key) . '.json';
}

/**
 * GET /event/{id} from the Reporting API. Results (including failures, stored as null) are cached briefly
 * so a busy listing page does not hit TryBooking on every request.
 */
function trybooking_fetch_event(array $creds, int $eventId): ?array
{
  $cacheFile = trybooking_cache_path($creds['region'] . '|' . $creds['apiKey'] . '|event|' . $eventId);
  if (is_file($cacheFile) && (time() - (int)filemtime($cacheFile)) < TRYBOOKING_CACHE_TTL_SECONDS) {
    $cached = json_decode((string)file_get_contents($cacheFile), true);
    if (is_array($cached) && array_key_exists('event', $cached)) {
      return is_array($cached['event']) ? $cached['event'] : null;
    }
  }

  $url = TRYBOOKING_API_ORIGIN . '/' . rawurlencode($creds['region']) . '/reporting/v1/event/' . $eventId;
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
    CURLOPT_USERPWD => $creds['apiKey'] . ':' . $creds['secretKey'],
    CURLOPT_HTTPHEADER => ['Accept: application/json'],
    CURLOPT_CONNECTTIMEOUT => 4,
    CURLOPT_TIMEOUT => TRYBOOKING_TIMEOUT_SECONDS,
  ]);
  $body = curl_exec($ch);
  $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  curl_close($ch);

  $event = null;
  if ($body !== false && $status === 200) {
    $decoded = json_decode((string)$body, true);
    $event = is_array($decoded) ? $decoded : null;
  }
  @file_put_contents($cacheFile, json_encode(['event' => $event]), LOCK_EX);
  return $event;
}

/**
 * Seat totals across all sessions of an event. "sold" counts every seat no longer available
 * (booked, reserved or blocked), which is what TryBooking's sessionAvailability reflects.
 *
 * @return array{capacity: int, available: int, sold: int}|null
 */
function trybooking_event_seat_totals(array $event): ?array
{
  $capacity = 0;
  $available = 0;
  foreach ($event['sessionList'] ?? [] as $session) {
    if (!is_array($session)) continue;
    $capacity += max(0, (int)($session['sessionCapacity'] ?? 0));
    $available += max(0, (int)($session['sessionAvailability'] ?? 0));
  }
  if ($capacity <= 0) return null;
  $available = min($available, $capacity);
  return ['capacity' => $capacity, 'available' => $available, 'sold' => $capacity - $available];
}
