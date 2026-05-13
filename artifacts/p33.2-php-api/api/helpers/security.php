<?php
/**
 * Security helpers — MIME validation, extension check, path traversal guard.
 * Dogrudan web erisimi yok — sadece include/require ile kullanilir.
 * SVG kabul edilmez.
 */

if (PHP_SAPI !== 'cli' && !defined('ALBA_INTERNAL')) {
    http_response_code(403);
    exit;
}

/**
 * Validate uploaded file using magic bytes (finfo_file), not client MIME.
 * Returns the validated extension (e.g. 'png', 'webp', 'jpg') or null on failure.
 */
function validateUploadedFile(string $tmpPath, string $originalName): ?string
{
    // 1. Check file size before processing
    $size = filesize($tmpPath);
    if ($size === false || $size > MAX_FILE_BYTES) {
        return null;
    }

    // 2. MIME magic byte check via finfo
    if (!function_exists('finfo_open')) {
        return null;
    }
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    if ($finfo === false) {
        return null;
    }
    $detectedMime = finfo_file($finfo, $tmpPath);
    finfo_close($finfo);

    if (!array_key_exists($detectedMime, ALLOWED_MIMES)) {
        return null; // MIME not in whitelist
    }

    // 3. Extension whitelist check (derived from original filename)
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    if (!in_array($ext, ALLOWED_EXTENSIONS, true)) {
        return null;
    }

    // 4. Cross-check: MIME-implied extension must match filename extension
    $mimeExt = ALLOWED_MIMES[$detectedMime];
    if ($ext === 'jpg') {
        $ext = 'jpg'; // jpg and jpeg both map to jpg in our system
    }
    // Normalise: jpg ↔ jpeg equivalence
    $normalizedExt = ($ext === 'jpeg') ? 'jpg' : $ext;
    $normalizedMimeExt = ($mimeExt === 'jpeg') ? 'jpg' : $mimeExt;
    if ($normalizedExt !== $normalizedMimeExt) {
        return null; // mismatch — e.g. PNG renamed to .jpg
    }

    return $normalizedExt;
}

/**
 * Sanitise a filename for safe storage.
 * - Strip null bytes
 * - Apply basename() to prevent path traversal
 * - Remove anything that isn't alphanumeric, dash, underscore, or dot
 */
function sanitiseFilename(string $name): string
{
    // Strip null bytes
    $name = str_replace("\0", '', $name);

    // Basename: strips directory components
    $name = basename($name);

    // Guard against double extensions (e.g. evil.php.png → stem + last extension only)
    $parts = explode('.', $name);
    if (count($parts) > 2) {
        $ext = array_pop($parts);
        $name = implode('_', $parts) . '.' . $ext;
    }

    // Remove non-safe characters
    $name = preg_replace('/[^a-zA-Z0-9._-]/', '-', $name);

    // Collapse multiple dashes/underscores/dots
    $name = preg_replace('/[-_.]{2,}/', '-', $name);

    // Trim dashes, underscores, dots from edges
    $name = trim($name, '-_.');

    // Enforce max filename length (excluding extension)
    $ext = pathinfo($name, PATHINFO_EXTENSION);
    $stem = pathinfo($name, PATHINFO_FILENAME);
    if (mb_strlen($stem) > 120) {
        $stem = mb_substr($stem, 0, 120);
        $name = $stem . '.' . $ext;
    }

    // Fallback for empty names
    if ($name === '' || $name === '.') {
        $name = 'asset';
    }

    return $name;
}

/**
 * Verify that a category value is in the allowed list.
 */
function validateCategory(string $category): bool
{
    return in_array($category, ALLOWED_CATEGORIES, true);
}

/**
 * Verify that an ID string is safe (alphanumeric only, no path separators).
 */
function isValidId(string $id): bool
{
    return (bool) preg_match('/^[a-zA-Z0-9_-]{1,64}$/', $id);
}

/**
 * Check for path traversal patterns in a string.
 */
function containsPathTraversal(string $value): bool
{
    $patterns = ['../', '..\\', "\0", '/..', '\\..'];
    foreach ($patterns as $pattern) {
        if (strpos($value, $pattern) !== false) {
            return true;
        }
    }
    return false;
}
