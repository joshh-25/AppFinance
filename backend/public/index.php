<?php
/*
 * Finance App File: backend/public/index.php
 * Purpose: Frontend app shell entrypoint.
 */
session_start();

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
