<?php
/**
 * AlbaGo Asset Server — Router
 *
 * Tum istekler .htaccess rewrite ile buraya yonlendirilir.
 * URI parse edilir, ilgili api/*.php dosyasina dispatch edilir.
 * /assets/* altindaki statik dosyalar .htaccess ile dogrudan serve edilir,
 * bu router'a ulasmaz.
 */

// CORS — admin localhost:3001 ve mobile icin
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Parse URI
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$uri = explode('?', $uri)[0]; // strip query string
$uri = rtrim($uri, '/');
$parts = explode('/', trim($uri, '/'));
// parts: ['api', 'assets', '{id}', 'archive']   or   ['api', 'health']   etc.

$route = $parts[1] ?? '';    // 'assets' or 'health'

// ── Dispatch ─────────────────────────────────────────────────
switch ($route) {
    case 'health':
        // GET /api/health
        require __DIR__ . '/api/health.php';
        break;

    case 'assets':
        $subRoute = $parts[3] ?? ''; // e.g. 'archive' or empty (list)
        $assetId  = $parts[2] ?? '';

        if ($subRoute === 'archive' && $assetId !== '') {
            // POST /api/assets/{id}/archive
            require __DIR__ . '/api/archive.php';
        } elseif ($assetId === '' || $assetId === 'list') {
            // GET /api/assets or GET /api/assets/list
            require __DIR__ . '/api/list.php';
        } elseif ($assetId === 'upload') {
            // POST /api/assets/upload
            require __DIR__ . '/api/upload.php';
        } else {
            http_response_code(404);
            header('Content-Type: application/json');
            echo json_encode(['error' => 'not_found']);
        }
        break;

    default:
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'not_found']);
        break;
}
