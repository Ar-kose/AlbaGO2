<?php
/**
 * GET /api/health
 * Public endpoint — no auth required.
 * Returns server status, PHP version, disk space, asset count.
 */

define('ALBA_INTERNAL', true);
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

$manifestOk = true;
$assetCount = 0;

if (file_exists(MANIFEST_PATH)) {
    $json = file_get_contents(MANIFEST_PATH);
    if ($json !== false) {
        $data = json_decode($json, true);
        if (is_array($data) && isset($data['assets']) && is_array($data['assets'])) {
            $assetCount = count($data['assets']);
        } else {
            $manifestOk = false;
        }
    } else {
        $manifestOk = false;
    }
}

$response = [
    'status' => 'ok',
    'phpVersion' => PHP_VERSION,
    'extensions' => array_values(array_filter(
        ['gd', 'imagick', 'fileinfo', 'json', 'mbstring', 'curl', 'openssl', 'pdo_mysql', 'mysqli'],
        function (string $ext): bool { return extension_loaded($ext); }
    )),
    'diskFreeMb' => round(disk_free_space(__DIR__) / (1024 * 1024), 1),
    'assetCount' => $assetCount,
    'manifestOk' => $manifestOk,
    'maxUploadMb' => (int) (MAX_FILE_BYTES / (1024 * 1024)),
];

// 503 if manifest is corrupt (server is alive but data is broken)
$statusCode = $manifestOk ? 200 : 503;
http_response_code($statusCode);

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
