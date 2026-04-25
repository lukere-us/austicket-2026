<?php

declare(strict_types=1);

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/http.php';

function base64url_encode(string $data): string
{
  return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string
{
  $remainder = strlen($data) % 4;
  if ($remainder) {
    $data .= str_repeat('=', 4 - $remainder);
  }
  return base64_decode(strtr($data, '-_', '+/')) ?: '';
}

function jwt_sign(array $payload): string
{
  $header = ['alg' => 'HS256', 'typ' => 'JWT'];

  $segments = [
    base64url_encode(json_encode($header, JSON_UNESCAPED_SLASHES)),
    base64url_encode(json_encode($payload, JSON_UNESCAPED_SLASHES)),
  ];

  $signing_input = implode('.', $segments);
  $signature = hash_hmac('sha256', $signing_input, JWT_SECRET, true);
  $segments[] = base64url_encode($signature);

  return implode('.', $segments);
}

function jwt_verify(string $jwt): array
{
  $parts = explode('.', $jwt);
  if (count($parts) !== 3) {
    json_response(['error' => 'invalid_token'], 401);
  }

  [$h64, $p64, $s64] = $parts;
  $header = json_decode(base64url_decode($h64), true) ?: null;
  $payload = json_decode(base64url_decode($p64), true) ?: null;
  $sig = base64url_decode($s64);

  if (!is_array($header) || !is_array($payload) || ($header['alg'] ?? '') !== 'HS256') {
    json_response(['error' => 'invalid_token'], 401);
  }

  $expected = hash_hmac('sha256', $h64 . '.' . $p64, JWT_SECRET, true);
  if (!hash_equals($expected, $sig)) {
    json_response(['error' => 'invalid_token'], 401);
  }

  $now = time();
  if (isset($payload['exp']) && is_int($payload['exp']) && $payload['exp'] < $now) {
    json_response(['error' => 'token_expired'], 401);
  }
  if (($payload['iss'] ?? null) !== JWT_ISSUER) {
    json_response(['error' => 'invalid_token'], 401);
  }

  return $payload;
}

function require_user(): array
{
  $token = get_bearer_token();
  if (!$token) {
    json_response(['error' => 'missing_token'], 401);
  }
  $payload = jwt_verify($token);
  if (($payload['typ'] ?? '') !== 'access' || !isset($payload['sub'])) {
    json_response(['error' => 'invalid_token'], 401);
  }
  return $payload;
}

