<?php

declare(strict_types=1);

function is_cms_page_visible_row(array $row): bool
{
  return ($row['status'] ?? '') === 'published';
}

function cms_page_row_to_public(array $row): array
{
  $parentId = $row['parent_id'] ?? null;
  return [
    'id' => (int)($row['id'] ?? 0),
    'title' => (string)($row['title'] ?? ''),
    'slug' => (string)($row['slug'] ?? ''),
    'banner_image' => $row['banner_image'] ?? null,
    'parent_id' => $parentId !== null && $parentId !== '' ? (int)$parentId : null,
    'body_html' => (string)($row['body_html'] ?? ''),
    'embed_html' => (string)($row['embed_html'] ?? ''),
    'created_at' => $row['created_at'] ?? null,
    'updated_at' => $row['updated_at'] ?? null,
  ];
}

function fetch_cms_page_by_slug(PDO $pdo, string $slug): ?array
{
  $stmt = $pdo->prepare('SELECT * FROM cms_pages WHERE slug = :slug LIMIT 1');
  $stmt->execute([':slug' => $slug]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$row || !is_cms_page_visible_row($row)) {
    return null;
  }
  return cms_page_row_to_public($row);
}

/**
 * Ancestors + current page for breadcrumb (published parents only).
 * @return list<array{title: string, slug: string}>
 */
function fetch_cms_page_breadcrumb(PDO $pdo, array $page): array
{
  $crumbs = [[
    'title' => (string)($page['title'] ?? ''),
    'slug' => (string)($page['slug'] ?? ''),
  ]];

  $parentId = isset($page['parent_id']) ? (int)$page['parent_id'] : 0;
  $guard = 0;
  while ($parentId > 0 && $guard < 20) {
    $guard++;
    $stmt = $pdo->prepare(
      'SELECT id, title, slug, parent_id, status FROM cms_pages WHERE id = :id LIMIT 1'
    );
    $stmt->execute([':id' => $parentId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || !is_cms_page_visible_row($row)) {
      break;
    }
    array_unshift($crumbs, [
      'title' => (string)($row['title'] ?? ''),
      'slug' => (string)($row['slug'] ?? ''),
    ]);
    $parentId = isset($row['parent_id']) && $row['parent_id'] !== null && $row['parent_id'] !== ''
      ? (int)$row['parent_id']
      : 0;
  }

  return $crumbs;
}

function fetch_published_cms_pages(PDO $pdo, int $limit = 50): array
{
  $sql = "
    SELECT id, title, slug, banner_image, parent_id, created_at, updated_at
    FROM cms_pages
    WHERE status = 'published'
    ORDER BY title ASC, id ASC
    LIMIT " . max(1, min(100, $limit));
  $stmt = $pdo->query($sql);
  $rows = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
  return array_map(static function (array $row): array {
    $parentId = $row['parent_id'] ?? null;
    return [
      'id' => (int)($row['id'] ?? 0),
      'title' => (string)($row['title'] ?? ''),
      'slug' => (string)($row['slug'] ?? ''),
      'banner_image' => $row['banner_image'] ?? null,
      'parent_id' => $parentId !== null && $parentId !== '' ? (int)$parentId : null,
      'created_at' => $row['created_at'] ?? null,
      'updated_at' => $row['updated_at'] ?? null,
    ];
  }, $rows ?: []);
}
