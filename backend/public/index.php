<?php
/*
 * Finance App File: backend/public/index.php
 * Purpose: Frontend app shell entrypoint.
 */
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function is_truthy_env_flag($value)
{
    $normalized = strtolower(trim((string) $value));
    return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
}

function latest_mtime_for_path($path)
{
    if (!file_exists($path)) {
        return 0;
    }

    if (is_file($path)) {
        return (int) (filemtime($path) ?: 0);
    }

    if (!is_dir($path)) {
        return 0;
    }

    $latest = (int) (filemtime($path) ?: 0);
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::LEAVES_ONLY
    );

    foreach ($iterator as $entry) {
        if (!$entry instanceof SplFileInfo || !$entry->isFile()) {
            continue;
        }
        $mtime = (int) ($entry->getMTime() ?: 0);
        if ($mtime > $latest) {
            $latest = $mtime;
        }
    }

    return $latest;
}

function latest_frontend_source_mtime($projectRoot)
{
    $watchPaths = [
        $projectRoot . '/frontend/src',
        $projectRoot . '/frontend/public',
        $projectRoot . '/frontend/index.html',
        $projectRoot . '/frontend/package.json',
        $projectRoot . '/frontend/package-lock.json',
        $projectRoot . '/frontend/vite.config.js',
    ];

    $latest = 0;
    foreach ($watchPaths as $watchPath) {
        $candidate = latest_mtime_for_path($watchPath);
        if ($candidate > $latest) {
            $latest = $candidate;
        }
    }

    return $latest;
}

$basePath = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
if ($basePath === '') {
    $basePath = '/';
}

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
if (is_string($requestPath) && substr($requestPath, -10) === '/index.php') {
    $target = $basePath === '/' ? '/' : $basePath . '/';
    header('Location: ' . $target, true, 302);
    exit;
}

$projectRoot = realpath(__DIR__ . '/../../') ?: (__DIR__ . '/../../');
$manifestPath = $projectRoot . '/frontend/dist/.vite/manifest.json';
if (!file_exists($manifestPath)) {
    http_response_code(503);
    ?>
    <!doctype html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
        <title>Finance App</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 24px;">
        <h1>Frontend build not found</h1>
        <p>Run <code>npm run build</code> inside <code>frontend/</code> to generate <code>frontend/dist</code>.</p>
    </body>
    </html>
    <?php
    exit;
}

$skipBuildFreshnessCheck = is_truthy_env_flag(getenv('FINANCE_SKIP_FRONTEND_BUILD_CHECK'));
if (!$skipBuildFreshnessCheck) {
    $latestSourceMtime = latest_frontend_source_mtime($projectRoot);
    $manifestMtime = (int) (filemtime($manifestPath) ?: 0);

    if ($latestSourceMtime > 0 && $latestSourceMtime > $manifestMtime) {
        http_response_code(503);
        $sourceTime = date('Y-m-d H:i:s', $latestSourceMtime);
        $buildTime = $manifestMtime > 0 ? date('Y-m-d H:i:s', $manifestMtime) : 'unknown';
        ?>
        <!doctype html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
            <title>Finance App</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 24px;">
            <h1>Frontend build is stale</h1>
            <p>Detected newer frontend source files than the current build output.</p>
            <p>Source last modified: <code><?php echo htmlspecialchars($sourceTime, ENT_QUOTES, 'UTF-8'); ?></code></p>
            <p>Build manifest time: <code><?php echo htmlspecialchars($buildTime, ENT_QUOTES, 'UTF-8'); ?></code></p>
            <p>Run <code>npm run build</code> inside <code>frontend/</code> and refresh.</p>
        </body>
        </html>
        <?php
        exit;
    }
}

$manifest = json_decode(file_get_contents($manifestPath), true);
$entry = $manifest['index.html'] ?? null;
if (!$entry || !isset($entry['file'])) {
    http_response_code(500);
    echo 'Invalid Vite manifest.';
    exit;
}

$assetBase = ($basePath === '/' ? '' : $basePath) . '/frontend/dist/';
$manifestUrl = ($basePath === '/' ? '' : $basePath) . '/manifest.webmanifest';
$entryJs = $assetBase . ltrim($entry['file'], '/');
$entryCss = $entry['css'] ?? [];
?>
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="theme-color" content="#eab308">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="mobile-web-app-capable" content="yes">
    <link rel="manifest" href="<?php echo htmlspecialchars($manifestUrl); ?>">
    <title>Finance App</title>
<?php foreach ($entryCss as $cssFile): ?>
    <link rel="stylesheet" href="<?php echo htmlspecialchars($assetBase . ltrim($cssFile, '/')); ?>">
<?php endforeach; ?>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="<?php echo htmlspecialchars($entryJs); ?>"></script>
</body>
</html>
