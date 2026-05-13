<?php
/**
 * AlbaGo Asset Server — Configuration
 *
 * Bu dosya sadece include/require ile kullanilir.
 * Dogrudan web erisimi .htaccess ile engellenir.
 * ASSET_TOKEN sadece ortam degiskeninden (env) okunur — fallback yok.
 */

// Dogrudan web erisimini engelle (include edilmeden calistirilirsa dur)
if (PHP_SAPI !== 'cli' && !defined('ALBA_INTERNAL')) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'forbidden']);
    exit;
}

define('ASSET_SERVER_VERSION', '1.0.0');

// ── Token ───────────────────────────────────────────────────
// Iki yontem (sirasiyla denenir):
//   1. SetEnv ASSET_TOKEN ...  (.htaccess ile ortam degiskeni)
//   2. data/asset-secret.php   (private config dosyasi: <?php return 'token';)
// Ikisi de yoksa API 500 ile fail eder. Fallback token yok.

$_token = getenv('ASSET_TOKEN');

if (!$_token || $_token === '') {
    // Yontem 2: private config dosyasi
    $_secretFile = DATA_DIR . '/asset-secret.php';
    if (file_exists($_secretFile)) {
        $_token = include $_secretFile;
    }
}

if (!$_token || $_token === '' || !is_string($_token)) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'server_config_missing', 'detail' => 'ASSET_TOKEN not configured']);
    exit;
}

define('ASSET_TOKEN', $_token);
unset($_token, $_secretFile); // token'i bellekten temizle

// ── Upload limits ─────────────────────────────────────────---
define('MAX_FILE_BYTES', 10 * 1024 * 1024); // 10 MB

// ── Accepted MIME → extension map (SVG kabul edilmez) ─────---
define('ALLOWED_MIMES', [
    'image/webp'   => 'webp',
    'image/png'    => 'png',
    'image/jpeg'   => 'jpg',
]);

// ── Accepted file extensions (redundant guard) ─────────-------
define('ALLOWED_EXTENSIONS', ['webp', 'png', 'jpg', 'jpeg']);

// ── Allowed asset categories ─────────────────────────────-----
define('ALLOWED_CATEGORIES', [
    'covers',
    'backgrounds',
    'targets',
    'characters',
    'icons',
    'onboarding',
    'runtime-ui',
]);

// ── Paths (relative to this config file) ─────────────────-----
define('ASSETS_DIR', __DIR__ . '/assets');
define('DATA_DIR', __DIR__ . '/data');
define('MANIFEST_PATH', DATA_DIR . '/asset-manifest.json');
define('MANIFEST_BAK_PATH', DATA_DIR . '/asset-manifest.json.bak');
define('UPLOAD_LOG_PATH', DATA_DIR . '/upload-log.jsonl');

// ── Pagination defaults ─────────────────────────────────--️
define('DEFAULT_PER_PAGE', 50);
define('MAX_PER_PAGE', 100);

// ── Ensure data directory exists ─────────────────────────-----
if (!is_dir(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}
