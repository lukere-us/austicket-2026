<?php

declare(strict_types=1);

function is_blog_visible_row(array $row): bool
{
  return ($row['status'] ?? '') === 'published';
}

function blog_visible_where(string $alias = 'b'): string
{
  $p = $alias !== '' ? $alias . '.' : '';
  return "{$p}status = 'published'";
}

function blog_row_to_card(array $row): array
{
  return [
    'id' => (int)($row['id'] ?? 0),
    'title' => (string)($row['title'] ?? ''),
    'slug' => (string)($row['slug'] ?? ''),
    'excerpt' => (string)($row['excerpt'] ?? ''),
    'cover_image' => $row['cover_image'] ?? null,
    'author_name' => (string)($row['author_name'] ?? ''),
    'tags' => blog_parse_tags((string)($row['tags'] ?? '')),
    'created_at' => $row['created_at'] ?? null,
    'is_featured' => (int)($row['is_featured'] ?? 0),
  ];
}

function blog_parse_tags(string $raw): array
{
  if (trim($raw) === '') return [];
  $parts = preg_split('/\s*,\s*/', $raw) ?: [];
  $out = [];
  foreach ($parts as $part) {
    $tag = trim((string)$part);
    if ($tag !== '') $out[] = $tag;
  }
  return $out;
}

function fetch_published_blogs(PDO $pdo, int $limit = 12, ?int $excludeId = null): array
{
  $where = blog_visible_where('b');
  $params = [];
  if ($excludeId) {
    $where .= ' AND b.id <> :exclude_id';
    $params[':exclude_id'] = $excludeId;
  }
  $sql = "
    SELECT b.id, b.title, b.slug, b.excerpt, b.cover_image, b.author_name, b.tags, b.created_at, b.is_featured
    FROM blogs b
    WHERE {$where}
    ORDER BY b.is_featured DESC, b.created_at DESC, b.id DESC
    LIMIT " . max(1, min(50, $limit));
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $rows = $stmt->fetchAll();
  return array_map('blog_row_to_card', $rows ?: []);
}

function fetch_home_blogs(PDO $pdo, int $sidebarLimit = 4): array
{
  $items = fetch_published_blogs($pdo, max(2, $sidebarLimit + 1));
  $featured = null;
  $rest = [];

  foreach ($items as $item) {
    if ($featured === null && (int)($item['is_featured'] ?? 0) === 1) {
      $featured = $item;
      continue;
    }
    $rest[] = $item;
  }

  if ($featured === null && count($items) > 0) {
    $featured = $items[0];
    $rest = array_slice($items, 1);
  } else {
    $rest = array_values(array_filter($rest, static fn ($item) => $featured === null || $item['id'] !== $featured['id']));
  }

  return [
    'featured' => $featured,
    'items' => array_slice($rest, 0, max(1, $sidebarLimit - 1)),
  ];
}

function fetch_blog_by_slug(PDO $pdo, string $slug): ?array
{
  $stmt = $pdo->prepare('SELECT * FROM blogs WHERE slug = :slug LIMIT 1');
  $stmt->execute([':slug' => $slug]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$row || !is_blog_visible_row($row)) return null;

  $card = blog_row_to_card($row);
  $card['body_html'] = (string)($row['body_html'] ?? '');
  return $card;
}
