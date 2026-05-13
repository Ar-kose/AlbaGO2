<?php
/**
 * POST /api/assets/upload
 * Bearer token required.
 * Accepts multipart/form-data: file (required), category (required).
 * Returns uploaded asset metadata as JSON.
 */

define('ALBA_INTERNAL', true);
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/helpers/security.php';
require_once __DIR__ . '/helpers/manifest.php';
require_once __DIR__ . '/helpers/image.php';

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

// ── File check ───────────────────────────────────────────────
if (empty($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'file_required']);
    exit;
}

$file = $_FILES['file'];

// Check PHP upload errors
if ($file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    $errorMsg = match ($file['error']) {
        UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'file_too_large',
        UPLOAD_ERR_NO_FILE => 'file_required',
        default => 'upload_failed',
    };
    echo json_encode(['error' => $errorMsg]);
    exit;
}

// Size check (double guard — PHP limit + app limit)
if ($file['size'] > MAX_FILE_BYTES) {
    http_response_code(400);
    echo json_encode(['error' => 'file_too_large']);
    exit;
}

// ── Category check ─────────────────────────────────────────--
$category = $_POST['category'] ?? '';
if ($category === '' || !validateCategory($category)) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_category']);
    exit;
}

// ── MIME + extension validation ─────────────────────────────-
$validatedExt = validateUploadedFile($file['tmp_name'], $file['name']);
if ($validatedExt === null) {
    http_response_code(400);
    echo json_encode(['error' => 'invalid_file_type']);
    exit;
}

// ── Generate system-controlled filename ─────────────────────-
$id = bin2hex(random_bytes(8)); // 16-char hex ID
$originalName = sanitiseFilename($file['name']);
$stem = pathinfo($originalName, PATHINFO_FILENAME);
if ($stem === '' || $stem === '.') {
    $stem = 'asset';
}

// Ensure category directory exists
$categoryDir = ASSETS_DIR . '/' . $category;
if (!is_dir($categoryDir)) {
    if (!mkdir($categoryDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['error' => 'storage_error']);
        exit;
    }
}

// Versioned filename — never overwrite
$version = 1;
$finalPath = $categoryDir . '/' . $stem . '.' . $validatedExt;
while (file_exists($finalPath)) {
    $version++;
    $finalPath = $categoryDir . '/' . $stem . '_v' . $version . '.' . $validatedExt;
}

$filename = basename($finalPath);

// ── Move uploaded file to final location ─────────────────────
if (!move_uploaded_file($file['tmp_name'], $finalPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'storage_error']);
    exit;
}

// ── Compute SHA256 ─────────────────────────────────────────--
$sha256 = hash_file('sha256', $finalPath);

// ── Get image dimensions ─────────────────────────────────────
$dimensions = getImageDimensions($finalPath);
$width = $dimensions['width'] ?? null;
$height = $dimensions['height'] ?? null;

// ── Build asset record ─────────────────────────────────────--
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'albago.tr';
$publicUrl = $scheme . '://' . $host . '/assets/' . $category . '/' . $filename;

$asset = [
    'id' => $id,
    'filename' => $filename,
    'url' => $publicUrl,
    'category' => $category,
    'mimeType' => $file['type'] ?? 'application/octet-stream', // informational only
    'bytes' => $file['size'],
    'sha256' => $sha256,
    'width' => $width,
    'height' => $height,
    'version' => $version,
    'archived' => false,
    'createdAt' => date('c'),
];

// ── Persist to manifest ─────────────────────────────────────-
if (!addAssetToManifest($asset)) {
    // File is saved but manifest update failed — log critical error
    error_log('AlbaAsset: CRITICAL — manifest write failed for asset ' . $id);
    http_response_code(500);
    echo json_encode(['error' => 'manifest_write_failed', 'id' => $id]);
    exit;
}

// ── Log ─────────────────────────────────────────────────────-
appendUploadLog('upload', [
    'assetId' => $id,
    'filename' => $filename,
    'category' => $category,
    'bytes' => $file['size'],
    'mime' => $file['type'] ?? 'unknown',
]);

// ── Response ─────────────────────────────────────────────────
http_response_code(201);
echo json_encode($asset, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
