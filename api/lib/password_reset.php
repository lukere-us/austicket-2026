<?php

declare(strict_types=1);

function ensure_password_reset_tokens_table(PDO $pdo): void
{
  static $ready = false;
  if ($ready) return;

  $pdo->exec("
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME NULL DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_password_reset_token_hash (token_hash),
      KEY idx_password_reset_user (user_id),
      KEY idx_password_reset_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  ");
  $ready = true;
}

function password_reset_ttl_seconds(): int
{
  $minutes = defined('PASSWORD_RESET_TTL_MINUTES') ? (int)PASSWORD_RESET_TTL_MINUTES : 60;
  if ($minutes < 5) $minutes = 5;
  if ($minutes > 1440) $minutes = 1440;
  return $minutes * 60;
}

function password_reset_public_base_url(): string
{
  $base = defined('APP_PUBLIC_URL') ? trim((string)APP_PUBLIC_URL) : 'http://localhost:3000';
  return rtrim($base, '/');
}

/**
 * Create a one-time reset token for a user. Returns the raw token (not hashed).
 */
function create_password_reset_token(PDO $pdo, int $userId): string
{
  ensure_password_reset_tokens_table($pdo);

  // Invalidate previous unused tokens for this user
  $stmt = $pdo->prepare("
    UPDATE password_reset_tokens
    SET used_at = UTC_TIMESTAMP()
    WHERE user_id = :uid AND used_at IS NULL
  ");
  $stmt->execute([':uid' => $userId]);

  $raw = bin2hex(random_bytes(32));
  $hash = hash('sha256', $raw);
  $expiresAt = gmdate('Y-m-d H:i:s', time() + password_reset_ttl_seconds());

  $stmt = $pdo->prepare("
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (:uid, :th, :exp)
  ");
  $stmt->execute([
    ':uid' => $userId,
    ':th' => $hash,
    ':exp' => $expiresAt,
  ]);

  return $raw;
}

/**
 * @return array{user_id:int, token_id:int}|null
 */
function find_valid_password_reset_token(PDO $pdo, string $rawToken): ?array
{
  $rawToken = trim($rawToken);
  if ($rawToken === '' || strlen($rawToken) < 20) {
    return null;
  }

  ensure_password_reset_tokens_table($pdo);
  $hash = hash('sha256', $rawToken);

  $stmt = $pdo->prepare("
    SELECT id, user_id, expires_at, used_at
    FROM password_reset_tokens
    WHERE token_hash = :th
    LIMIT 1
  ");
  $stmt->execute([':th' => $hash]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$row) return null;
  if (!empty($row['used_at'])) return null;

  $expiresAt = strtotime((string)$row['expires_at'] . ' UTC');
  if ($expiresAt === false || $expiresAt < time()) return null;

  return [
    'token_id' => (int)$row['id'],
    'user_id' => (int)$row['user_id'],
  ];
}

function consume_password_reset_token(PDO $pdo, int $tokenId): void
{
  $stmt = $pdo->prepare("
    UPDATE password_reset_tokens
    SET used_at = UTC_TIMESTAMP()
    WHERE id = :id AND used_at IS NULL
  ");
  $stmt->execute([':id' => $tokenId]);
}

function revoke_user_refresh_tokens(PDO $pdo, int $userId): void
{
  $stmt = $pdo->prepare("
    UPDATE refresh_tokens
    SET revoked_at = UTC_TIMESTAMP()
    WHERE user_id = :uid AND revoked_at IS NULL
  ");
  $stmt->execute([':uid' => $userId]);
}
