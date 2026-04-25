# AUS Ticket Lanka API (PHP)

## Local URL

With XAMPP/Apache, map this folder to `/api` (or place it under your web root as `api/`).

- Health: `GET /api/`

## Database

Uses constants from `config.php`:

```php
define('host', 'localhost');
define('user', 'root');
define('pwd', '');
define('db', 'aus-booking');
```

## Endpoints (implemented)

- `GET /api/listings`
- `GET /api/listings/{slug}`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/me` (Bearer access token)
- `POST /api/listings/{id}/rating` (Bearer access token)
- `POST /api/listings/{id}/comments` (Bearer access token, creates pending comment)
- `POST /api/analytics/page-visit`
- `POST /api/analytics/booking-click`

