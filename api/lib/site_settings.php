<?php

declare(strict_types=1);

/**
 * Decode site_settings.setting_value from PDO (string JSON or already-decoded array).
 */
function site_settings_decode_json(mixed $raw): ?array
{
  if (is_array($raw)) {
    return $raw;
  }
  if (!is_string($raw)) {
    return null;
  }
  $trimmed = trim($raw);
  if ($trimmed === '' || $trimmed === 'null') {
    return null;
  }
  $decoded = json_decode($trimmed, true);
  return is_array($decoded) ? $decoded : null;
}

function site_settings_bool(mixed $raw, bool $fallback): bool
{
  if (is_bool($raw)) {
    return $raw;
  }
  if ($raw === 1 || $raw === '1' || $raw === 'true' || $raw === 'on' || $raw === 'yes') {
    return true;
  }
  if ($raw === 0 || $raw === '0' || $raw === 'false' || $raw === 'off' || $raw === 'no') {
    return false;
  }
  return $fallback;
}

function site_settings_clamp_number(mixed $value, float $min, float $max): ?float
{
  if ($value === null || $value === '') {
    return null;
  }
  if (!is_numeric($value)) {
    return null;
  }
  $n = (float)$value;
  if (!is_finite($n)) {
    return null;
  }
  return min($max, max($min, $n));
}
