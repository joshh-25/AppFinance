<?php
require __DIR__ . '/../db.php';
$pdo = get_db_connection();
$columns = ['electricity_account_no', 'water_account_no', 'wifi_account_no'];

foreach ($columns as $col) {
    $sql = "SELECT COUNT(*) FROM (SELECT LOWER(TRIM(`$col`)) AS v, COUNT(*) AS c FROM property_account_directory WHERE `$col` IS NOT NULL AND TRIM(`$col`) <> '' GROUP BY LOWER(TRIM(`$col`)) HAVING COUNT(*) > 1) AS t";
    $dup = (int) $pdo->query($sql)->fetchColumn();
    echo $col . " duplicates=" . $dup . PHP_EOL;

    if ($dup > 0) {
        $sql2 = "SELECT LOWER(TRIM(`$col`)) AS v, COUNT(*) AS c FROM property_account_directory WHERE `$col` IS NOT NULL AND TRIM(`$col`) <> '' GROUP BY LOWER(TRIM(`$col`)) HAVING COUNT(*) > 1 ORDER BY c DESC, v ASC LIMIT 5";
        $rows = $pdo->query($sql2)->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $r) {
            echo '  ' . $r['v'] . ' | ' . $r['c'] . PHP_EOL;
        }
    }
}
