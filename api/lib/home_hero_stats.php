<?php

declare(strict_types=1);

require_once __DIR__ . '/home_hero_settings.php';

function home_hero_count_booking_clicks(PDO $pdo): int
{
  try {
    $stmt = $pdo->query('SELECT COUNT(*) FROM booking_clicks');
    return (int)$stmt->fetchColumn();
  } catch (Throwable) {
    return 0;
  }
}

function home_hero_count_visible_listings_for_country(PDO $pdo, string $countryName): int
{
  $where = listing_visible_where();
  $where[] = listing_country_exists_sql(':country_name');
  $sql = 'SELECT COUNT(*) FROM listings l WHERE ' . implode(' AND ', $where);
  $stmt = $pdo->prepare($sql);
  $stmt->execute([':country_name' => $countryName]);
  return (int)$stmt->fetchColumn();
}

function home_hero_count_registered_users(PDO $pdo): int
{
  try {
    $stmt = $pdo->query('SELECT COUNT(*) FROM users');
    return (int)$stmt->fetchColumn();
  } catch (Throwable) {
    return 0;
  }
}

function build_home_hero_counters(PDO $pdo, ?array $settings = null): array
{
  $settings = $settings ?? load_home_hero_settings($pdo);

  $ticketsLive = home_hero_count_booking_clicks($pdo);
  $ausLive = home_hero_count_visible_listings_for_country($pdo, 'Australia');
  $nzLive = home_hero_count_visible_listings_for_country($pdo, 'New Zealand');
  $customersLive = home_hero_count_registered_users($pdo);

  $ticketsBase = max(0, (int)($settings['counterTicketsBase'] ?? 0));
  $ausBase = max(0, (int)($settings['counterAusBase'] ?? 0));
  $nzBase = max(0, (int)($settings['counterNzBase'] ?? 0));
  $customersBase = max(0, (int)($settings['counterCustomersBase'] ?? 0));

  return [
  [
    'id' => 'tickets',
    'prefix' => '01',
    'label' => trim((string)($settings['counterTicketsLabel'] ?? 'Ticket Booked with us')) ?: 'Ticket Booked with us',
    'value' => $ticketsBase + $ticketsLive,
  ],
  [
    'id' => 'aus',
    'prefix' => '02',
    'label' => trim((string)($settings['counterAusLabel'] ?? 'Listed event in AUS')) ?: 'Listed event in AUS',
    'value' => $ausBase + $ausLive,
  ],
  [
    'id' => 'nz',
    'prefix' => '03',
    'label' => trim((string)($settings['counterNzLabel'] ?? 'Listed event In NZ')) ?: 'Listed event In NZ',
    'value' => $nzBase + $nzLive,
  ],
  [
    'id' => 'customers',
    'prefix' => '04',
    'label' => trim((string)($settings['counterCustomersLabel'] ?? 'Happy Customers')) ?: 'Happy Customers',
    'value' => $customersBase + $customersLive,
  ],
  ];
}
