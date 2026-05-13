<?php
/**
 * POST /api/assets/{id}/archive
 * Bearer token required.
 * Soft-delete: sets archived=true, never removes the file.
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
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    echo json_encode(['error' => 'method_not_allowed']);
    exit;
}

// ── Extract asset ID from URI ────────────────────────────────
// Expected URI: /api/assets/{id}/archive
$uri = $_SERVER['REQUEST_URI'] ?? '';
$uri = explode('?', $uri)[0]; // strip query string
$uri = rtrim($uri, '/');
$parts = explode('/', trim($uri, '/'));

// URI: api / assets / {id} / archive
// Index:  0      1       2        3
$assetId = $parts[2] ?? '';

if ($assetId === '' || !isValidId($assetId)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_asset_id']);
    exit;
}

// ── Find and archive ─────────────────────────────────────────
$existing = findAssetById($assetId);
if ($existing === null) {
    http_response_code(404);
    echo json_encode(['error' => 'asset_not_found']);
    exit;
}

if ($existing['archived'] ?? false) {
    // Already archived — idempotent
    http_response_code(200);
    echo json_encode(['archived' => true, 'id' => $assetId]);
    exit;
}

$updated = archiveAssetInManifest($assetId);
if ($updated === null) {
    http_response_code(500);
    echo json_encode(['error' => 'archive_failed']);
    exit;
}

// ── Log ─────────────────────────────────────────────────────-
appendUploadLog('archive', [
    'assetId' => $assetId,
    'filename' => $updated['filename'] ?? 'unknown',
]);

// ── Response ─────────────────────────────────────────────────
http_response_code(200);
echo json_encode(['archived' => true, 'id' => $assetId], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
