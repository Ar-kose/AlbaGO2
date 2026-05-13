<?php
/**
 * Manifest + upload-log helpers.
 * - asset-manifest.json: read/write with flock(LOCK_EX), .bak backup, corruption recovery
 * - upload-log.jsonl: append-only, one JSON line per event
 *
 * Dogrudan web erisimi yok — sadece include/require ile kullanilir.
 */

if (PHP_SAPI !== 'cli' && !defined('ALBA_INTERNAL')) {
    http_response_code(403);
    exit;
}

// ── Manifest ─────────────────────────────────────────────────

/**
 * Read the full asset manifest.
 * - File yoksa bos manifest dondurur.
 * - JSON bozuksa backup'tan recovery dener.
 * - Backup da bozuksa bos manifest dondurur.
 */
function readManifest(): array
{
    if (!file_exists(MANIFEST_PATH)) {
        return emptyManifest();
    }

    $json = file_get_contents(MANIFEST_PATH);
    if ($json === false) {
        return recoverFromBackup();
    }

    $data = json_decode($json, true);
    if (!is_array($data) || !isset($data['assets']) || !is_array($data['assets'])) {
        return recoverFromBackup();
    }

    return $data;
}

/**
 * Write the full asset manifest with:
 * - flock(LOCK_EX) exclusive lock
 * - .bak backup before write
 * - atomic write via temp file + rename
 */
function writeManifest(array $manifest): bool
{
    // Ensure data directory exists
    if (!is_dir(DATA_DIR)) {
        if (!mkdir(DATA_DIR, 0755, true)) {
            error_log('AlbaAsset: Cannot create data directory');
            return false;
        }
    }

    // Take .bak backup of current manifest (if exists)
    if (file_exists(MANIFEST_PATH)) {
        copy(MANIFEST_PATH, MANIFEST_BAK_PATH);
    }

    // Update metadata
    $manifest['version'] = ($manifest['version'] ?? 0) + 1;
    $manifest['updatedAt'] = date('c');

    $json = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        error_log('AlbaAsset: json_encode failed');
        return false;
    }

    // Atomic write: temp file → flock → write → rename
    $tmpPath = MANIFEST_PATH . '.tmp.' . bin2hex(random_bytes(4));

    $fp = fopen($tmpPath, 'w');
    if ($fp === false) {
        error_log('AlbaAsset: Cannot open temp manifest for write');
        return false;
    }

    // Exclusive lock
    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        @unlink($tmpPath);
        error_log('AlbaAsset: Cannot acquire lock on manifest');
        return false;
    }

    $written = fwrite($fp, $json);
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    if ($written === false || $written !== strlen($json)) {
        @unlink($tmpPath);
        error_log('AlbaAsset: Manifest write incomplete');
        return false;
    }

    // Atomic rename
    if (!rename($tmpPath, MANIFEST_PATH)) {
        @unlink($tmpPath);
        error_log('AlbaAsset: Manifest rename failed');
        return false;
    }

    return true;
}

/**
 * Find an asset by ID in the manifest. Returns null if not found.
 */
function findAssetById(string $id): ?array
{
    $manifest = readManifest();
    foreach ($manifest['assets'] as $asset) {
        if (($asset['id'] ?? '') === $id) {
            return $asset;
        }
    }
    return null;
}

/**
 * Add an asset to the manifest and persist.
 * Returns true on success.
 */
function addAssetToManifest(array $asset): bool
{
    $manifest = readManifest();
    $manifest['assets'][] = $asset;
    return writeManifest($manifest);
}

/**
 * Set archived=true on an asset (soft-delete, never hard-delete).
 * Returns the updated asset or null if not found.
 */
function archiveAssetInManifest(string $id): ?array
{
    $manifest = readManifest();
    $updated = null;
    foreach ($manifest['assets'] as &$asset) {
        if (($asset['id'] ?? '') === $id) {
            $asset['archived'] = true;
            $updated = $asset;
            break;
        }
    }
    unset($asset);

    if ($updated === null) {
        return null;
    }

    if (!writeManifest($manifest)) {
        return null;
    }

    return $updated;
}

/**
 * Return an empty manifest structure.
 */
function emptyManifest(): array
{
    return [
        'version' => 0,
        'updatedAt' => date('c'),
        'assets' => [],
    ];
}

/**
 * Try to recover manifest from .bak backup.
 * If backup also corrupt, return empty manifest.
 */
function recoverFromBackup(): array
{
    if (!file_exists(MANIFEST_BAK_PATH)) {
        error_log('AlbaAsset: Manifest corrupt, no backup — starting fresh');
        return emptyManifest();
    }

    $json = file_get_contents(MANIFEST_BAK_PATH);
    if ($json === false) {
        error_log('AlbaAsset: Cannot read backup — starting fresh');
        return emptyManifest();
    }

    $data = json_decode($json, true);
    if (!is_array($data) || !isset($data['assets']) || !is_array($data['assets'])) {
        error_log('AlbaAsset: Backup also corrupt — starting fresh');
        return emptyManifest();
    }

    error_log('AlbaAsset: Recovered manifest from backup');
    // Restore backup as primary
    copy(MANIFEST_BAK_PATH, MANIFEST_PATH);
    return $data;
}

// ── Upload Log ───────────────────────────────────────────────

/**
 * Append an event to upload-log.jsonl.
 * One JSON object per line, append-only, no read-modify-write.
 */
function appendUploadLog(string $event, array $data): bool
{
    if (!is_dir(DATA_DIR)) {
        if (!mkdir(DATA_DIR, 0755, true)) {
            return false;
        }
    }

    $entry = [
        'ts' => date('c'),
        'event' => $event,
    ] + $data;

    $line = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($line === false) {
        return false;
    }

    $fp = fopen(UPLOAD_LOG_PATH, 'a');
    if ($fp === false) {
        return false;
    }

    if (!flock($fp, LOCK_EX)) {
        fclose($fp);
        return false;
    }

    $written = fwrite($fp, $line . "\n");
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    return $written !== false;
}
