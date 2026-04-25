<?php

declare(strict_types=1);

define('host', 'localhost');
define('user', 'root');
define('pwd', '');
define('db', 'aus-booking');

// Change this in production
define('JWT_SECRET', 'change-me-in-production');
define('JWT_ISSUER', 'aus-ticket-lanka');
define('JWT_ACCESS_TTL_SECONDS', 900); // 15 min
define('JWT_REFRESH_TTL_SECONDS', 60 * 60 * 24 * 30); // 30 days

// CORS (local dev)
define('CORS_ALLOW_ORIGINS', [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
]);

