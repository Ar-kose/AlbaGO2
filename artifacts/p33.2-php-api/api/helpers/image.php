<?php
/**
 * Image helpers — getimagesize wrapper, dimension validation.
 * Dogrudan web erisimi yok — sadece include/require ile kullanilir.
 */

if (PHP_SAPI !== 'cli' && !defined('ALBA_INTERNAL')) {
    http_response_code(403);
    exit;
}

/**
 * Read image dimensions from a validated file.
 * Returns ['width' => int, 'height' => int] or null on failure.
 */
function getImageDimensions(string $tmpPath): ?array
{
    if (!function_exists('getimagesize')) {
        return null;
    }

    $info = @getimagesize($tmpPath);
    if ($info === false) {
        return null;
    }

    $width  = (int) ($info[0] ?? 0);
    $height = (int) ($info[1] ?? 0);

    if ($width <= 0 || $height <= 0) {
        return null;
    }

    // Sanity: reject unreasonably large dimensions
    if ($width > 8000 || $height > 8000) {
        return null;
    }

    return ['width' => $width, 'height' => $height];
}
