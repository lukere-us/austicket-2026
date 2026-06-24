<?php

declare(strict_types=1);

function json_response($data, int $status = 200): void
{
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  exit;
}

function read_json_body(): array
{
  $raw = file_get_contents('php://input');
  if ($raw === false || trim($raw) === '') {
    return [];
  }

  $decoded = json_decode($raw, true);
  if (!is_array($decoded)) {
    json_response(['error' => 'invalid_json'], 400);
  }
  return $decoded;
}

function utf8_strlen(string $text): int
{
  if (function_exists('mb_strlen')) {
    return mb_strlen($text, 'UTF-8');
  }
  return strlen($text);
}

function get_bearer_token(): ?string
{
  $auth = $_SERVER['HTTP_AUTHORIZATION']
    ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
    ?? '';

  if ($auth === '' && function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    if (is_array($headers)) {
      $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
  }

  if (stripos($auth, 'Bearer ') === 0) {
    return trim(substr($auth, 7));
  }
  return null;
}

function cors(): void
{
  require_once __DIR__ . '/../config.php';

  $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
  if ($origin && in_array($origin, CORS_ALLOW_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
  }

  if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
  }
}

