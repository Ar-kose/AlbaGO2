<?php
/**
 * P33.1 — Linux Hosting Discovery Diagnostic
 *
 * Kullanim: Bu dosyayi public_html/albago.tr/ icine yukleyin.
 * Sonra browser'dan https://albago.tr/p33-diagnostics.php adresini acin.
 * Cikan JSON ciktisini kopyalayip Claude Code'a iletin.
 *
 * Test bitince bu dosyayi SILIN.
 *
 * GU venlik: Bu dosya token, env, secret, kullanici bilgisi YAZDIRMAZ.
 */

header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex');

$result = [];

// ── PHP Version ──────────────────────────────────────────────
$result['phpVersion']       = PHP_VERSION;
$result['phpMajor']         = PHP_MAJOR_VERSION;
$result['phpMinor']         = PHP_MINOR_VERSION;

// ── Loaded Extensions ────────────────────────────────────────
$extensions = get_loaded_extensions();
sort($extensions, SORT_STRING | SORT_FLAG_CASE);
$result['extensions']       = $extensions;

// ── Critical Extensions (boolean) ────────────────────────────
$result['extFileinfo']      = extension_loaded('fileinfo');
$result['extJson']          = extension_loaded('json');
$result['extMbstring']      = extension_loaded('mbstring');
$result['extGd']            = extension_loaded('gd');
$result['extImagick']       = extension_loaded('imagick');
$result['extPdo']           = extension_loaded('pdo');
$result['extPdoMysql']      = extension_loaded('pdo_mysql');
$result['extMysqli']        = extension_loaded('mysqli');
$result['extCurl']          = extension_loaded('curl');
$result['extOpenssl']       = extension_loaded('openssl');

// ── Critical Functions ───────────────────────────────────────
$result['funcFinfoOpen']    = function_exists('finfo_open');
$result['funcGetimagesize'] = function_exists('getimagesize');
$result['funcHashEquals']   = function_exists('hash_equals');
$result['funcJsonEncode']   = function_exists('json_encode');

// ── Upload Configuration ─────────────────────────────────────
$result['fileUploads']      = ini_get('file_uploads');
$result['uploadMaxFilesize']= ini_get('upload_max_filesize');
$result['postMaxSize']      = ini_get('post_max_size');
$result['maxFileUploads']   = ini_get('max_file_uploads');
$result['maxExecutionTime'] = ini_get('max_execution_time');
$result['maxInputTime']     = ini_get('max_input_time');
$result['memoryLimit']      = ini_get('memory_limit');

// ── Upload Limits in Bytes (parsed) ──────────────────────────
$result['uploadMaxBytes']   = parseIniSize(ini_get('upload_max_filesize'));
$result['postMaxBytes']     = parseIniSize(ini_get('post_max_size'));

// ── Disk Space ───────────────────────────────────────────────
$cwd = __DIR__;
$result['documentRoot']     = $cwd;
$result['diskFreeBytes']    = disk_free_space($cwd);
$result['diskTotalBytes']   = disk_total_space($cwd);
$result['diskFreeMb']       = round(disk_free_space($cwd) / (1024 * 1024), 1);
$result['diskTotalMb']      = round(disk_total_space($cwd) / (1024 * 1024), 1);

// ── Directory Permissions ────────────────────────────────────
$result['cwdWritable']      = is_writable($cwd);

// Check/create assets directory writability
$assetsDir = $cwd . '/assets';
if (is_dir($assetsDir)) {
    $result['assetsDirExists']  = true;
    $result['assetsDirWritable'] = is_writable($assetsDir);
} else {
    // Try to create and check
    $created = @mkdir($assetsDir, 0755, true);
    $result['assetsDirExists']  = is_dir($assetsDir);
    $result['assetsDirWritable'] = is_writable($assetsDir);
    $result['assetsDirCreated']  = $created;
}

// Check/create data directory writability
$dataDir = $cwd . '/data';
if (is_dir($dataDir)) {
    $result['dataDirExists']    = true;
    $result['dataDirWritable']   = is_writable($dataDir);
} else {
    $created = @mkdir($dataDir, 0755, true);
    $result['dataDirExists']    = is_dir($dataDir);
    $result['dataDirWritable']   = is_writable($dataDir);
    $result['dataDirCreated']    = $created;
}

// ── Web Server ───────────────────────────────────────────────
$result['serverSoftware']    = $_SERVER['SERVER_SOFTWARE'] ?? 'unknown';
$result['serverProtocol']    = $_SERVER['SERVER_PROTOCOL'] ?? 'unknown';
$result['httpsActive']       = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
$result['httpHost']          = $_SERVER['HTTP_HOST'] ?? 'unknown';
$result['requestScheme']     = $_SERVER['REQUEST_SCHEME'] ?? ($result['httpsActive'] ? 'https' : 'http');

// ── Timezone ─────────────────────────────────────────────────
$result['timezone']          = date_default_timezone_get();
$result['serverTime']        = date('c');

// ── PASS/FAIL Summary ────────────────────────────────────────
$checks = [];

// ZORUNLU
$checks['php_version_8plus']        = PHP_MAJOR_VERSION >= 8;
$checks['file_uploads_on']          = strtolower(ini_get('file_uploads')) === 'on' || ini_get('file_uploads') === '1';
$checks['upload_max_10mb']          = parseIniSize(ini_get('upload_max_filesize')) >= 10 * 1024 * 1024;
$checks['post_max_11mb']            = parseIniSize(ini_get('post_max_size')) >= 11 * 1024 * 1024;
$checks['ext_fileinfo']             = extension_loaded('fileinfo');
$checks['ext_json']                  = extension_loaded('json');
$checks['disk_free_500mb']          = disk_free_space($cwd) >= 500 * 1024 * 1024;
$checks['cwd_writable']             = is_writable($cwd);
$checks['func_finfo_open']          = function_exists('finfo_open');
$checks['func_getimagesize']         = function_exists('getimagesize');
$checks['func_hash_equals']          = function_exists('hash_equals');

// OPSIYONEL
$checks['ext_gd']                    = extension_loaded('gd');
$checks['ext_imagick']               = extension_loaded('imagick');
$checks['ext_pdo_mysql']             = extension_loaded('pdo_mysql') || extension_loaded('mysqli');
$checks['ext_curl']                  = extension_loaded('curl');
$checks['ext_openssl']               = extension_loaded('openssl');
$checks['https_active']              = $result['httpsActive'];

$result['checks'] = $checks;

// Zorunlu kriterlerin hepsi PASS mi?
$mandatory = [
    'php_version_8plus',
    'file_uploads_on',
    'upload_max_10mb',
    'post_max_11mb',
    'ext_fileinfo',
    'ext_json',
    'disk_free_500mb',
    'cwd_writable',
    'func_finfo_open',
    'func_getimagesize',
    'func_hash_equals',
];

$allMandatoryPass = true;
foreach ($mandatory as $key) {
    if (!$checks[$key]) {
        $allMandatoryPass = false;
        break;
    }
}
$result['allMandatoryPass'] = $allMandatoryPass;
$result['failedMandatory']  = array_keys(array_filter($checks, function($v, $k) use ($mandatory) {
    return in_array($k, $mandatory) && !$v;
}, ARRAY_FILTER_USE_BOTH));

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

// ── Helpers ───────────────────────────────────────────────────

function parseIniSize(string $val): int {
    $val = trim($val);
    if ($val === '' || $val === '-1') return PHP_INT_MAX;
    $unit = strtoupper(substr($val, -1));
    $num = (int) $val;
    return match ($unit) {
        'G' => $num * 1024 * 1024 * 1024,
        'M' => $num * 1024 * 1024,
        'K' => $num * 1024,
        default => (int) $val,
    };
}
