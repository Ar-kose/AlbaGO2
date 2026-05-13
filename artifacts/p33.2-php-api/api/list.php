<?php
/**
 * GET /api/assets
 * Bearer token required.
 * Query params: category, search, archived (0/1), page, perPage
 */

define('ALBA_INTERNAL', true);
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/helpers/security.php';
require_once __DIR__ . '/helpers/manifest.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

// ── Auth ─────────────────────────────────────────────────────
function getBearerToken(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/^Bearer\s+(.+)$/i', $header, $m)) {
        return trim($m[1]);
    }
    return null;
}

$token = getBearerToken();
if ($token === null || !hash_equals(ASSET_TOKEN, $token)) {
    http_response_code(401);
    echo json_encode(['error' => 'unauthorized']);
    exit;
}

// ── Method check ─────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Allow: GET');
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

// ── Parse query params ──────────────────────────────────────-
$category = $_GET['category'] ?? null;
$search   = $_GET['search'] ?? null;
$archived = isset($_GET['archived']) ? (bool) $_GET['archived'] : false;
$page     = max(1, (int) ($_GET['page'] ?? 1));
$perPage  = min(MAX_PER_PAGE, max(1, (int) ($_GET['perPage'] ?? DEFAULT_PER_PAGE)));

if ($category !== null && !validateCategory($category)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_category']);
    exit;
}

if ($search !== null && mb_strlen($search) > 100) {
    http_response_code(400);
    echo json_encode(['error' => 'search_too_long']);
    exit;
}

// ── Read and filter ─────────────────────────────────────────-
$manifest = readManifest();
$assets = $manifest['assets'] ?? [];

// Filter: archived
$assets = array_values(array_filter($assets, function (array $a) use ($archived): bool {
    $isArchived = (bool) ($a['archived'] ?? false);
    return $isArchived === $archived;
}));

// Filter: category
if ($category !== null) {
    $assets = array_values(array_filter($assets, function (array $a) use ($category): bool {
        return ($a['category'] ?? '') === $category;
    }));
}

// Filter: search (case-insensitive match on filename)
if ($search !== null && $search !== '') {
    $needle = mb_strtolower($search);
    $assets = array_values(array_filter($assets, function (array $a) use ($needle): bool {
        return mb_strpos(mb_strtolower($a['filename'] ?? ''), $needle) !== false;
    }));
}

// ── Sort by createdAt descending ─────────────────────────────
usort($assets, function (array $a, array $b): int {
    return ($b['createdAt'] ?? '') <=> ($a['createdAt'] ?? '');
});

// ── Paginate ─────────────────────────────────────────────────
$total = count($assets);
$offset = ($page - 1) * $perPage;
$items = array_slice($assets, $offset, $perPage);

// ── Response ─────────────────────────────────────────────────
echo json_encode([
    'items' => $items,
    'total' => $total,
    'page' => $page,
    'perPage' => $perPage,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
