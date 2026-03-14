<?php
/*
 * Finance App File: backend/tools/benchmark_phase21.php
 * Purpose: Benchmark merged-record pagination and dashboard summary performance.
 */

declare(strict_types=1);

require_once __DIR__ . '/../src/Core/LegacyBootstrap.php';
require_once __DIR__ . '/../src/Modules/Bills/LegacyBills.php';

function read_cli_option(array $argv, string $name, string $default = ''): string
{
    $prefix = '--' . $name . '=';
    foreach ($argv as $argument) {
        if (strpos($argument, $prefix) === 0) {
            return substr($argument, strlen($prefix));
        }
    }

    return $default;
}

function format_benchmark_ms(array $samples): string
{
    if (!$samples) {
        return '0.00';
    }

    return number_format(array_sum($samples) / count($samples), 2, '.', '');
}

function format_benchmark_memory(int $bytes): string
{
    return number_format($bytes / 1024 / 1024, 2, '.', '');
}

function seed_phase21_benchmark_rows(PDO $pdo, int $targetRows, string $duePeriod): int
{
    $rowsToInsert = max(0, $targetRows);
    if ($rowsToInsert <= 0) {
        return 0;
    }

    $insertProperty = $pdo->prepare(
        "INSERT INTO `property_list` (
            `dd`,
            `property`,
            `billing_period`,
            `unit_owner`,
            `classification`,
            `deposit`,
            `rent`,
            `per_property_status`,
            `real_property_tax`,
            `rpt_payment_status`,
            `penalty`
        ) VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    $insertBilling = $pdo->prepare(
        "INSERT INTO `property_billing_records` (
            `property_list_id`,
            `dd`,
            `property`,
            `due_period`,
            `unit_owner`,
            `bill_type`,
            `is_hidden`,
            `classification`,
            `deposit`,
            `rent`,
            `internet_provider`,
            `internet_account_no`,
            `wifi_amount`,
            `wifi_due_date`,
            `wifi_payment_status`,
            `water_account_no`,
            `water_amount`,
            `water_due_date`,
            `water_payment_status`,
            `electricity_account_no`,
            `electricity_amount`,
            `electricity_due_date`,
            `electricity_payment_status`,
            `association_dues`,
            `association_due_date`,
            `association_payment_status`,
            `real_property_tax`,
            `rpt_payment_status`,
            `penalty`,
            `per_property_status`
        ) VALUES (
            ?, ?, ?, ?, ?, 'water', 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )"
    );

    $currentDate = $duePeriod . '-20';
    $inserted = 0;
    for ($index = 1; $index <= $rowsToInsert; $index++) {
        $dd = sprintf('BENCH-DD-%05d', $index);
        $property = sprintf('Benchmark Property %05d', $index);
        $unitOwner = sprintf('Benchmark Owner %05d', $index);
        $classification = $index % 3 === 0 ? 'Condo' : 'Residential';
        $deposit = number_format(15000 + ($index % 17) * 250, 2, '.', '');
        $rent = number_format(22000 + ($index % 23) * 320, 2, '.', '');
        $propertyStatus = $index % 9 === 0 ? 'Needs follow-up' : 'Active';
        $realPropertyTax = number_format(1200 + ($index % 7) * 55, 2, '.', '');
        $rptPaymentStatus = $index % 5 === 0 ? 'Paid' : 'Unpaid';
        $penalty = number_format(($index % 4) * 35, 2, '.', '');

        $insertProperty->execute([
            $dd,
            $property,
            $unitOwner,
            $classification,
            $deposit,
            $rent,
            $propertyStatus,
            $realPropertyTax,
            $rptPaymentStatus,
            $penalty,
        ]);
        $propertyListId = (int) $pdo->lastInsertId();

        $insertBilling->execute([
            $propertyListId,
            $dd,
            $property,
            $duePeriod,
            $unitOwner,
            $classification,
            $deposit,
            $rent,
            $index % 2 === 0 ? 'PLDT' : 'Globe',
            sprintf('WIFI-%05d', $index),
            number_format(1400 + ($index % 11) * 45, 2, '.', ''),
            $currentDate,
            $index % 4 === 0 ? 'Paid' : 'Unpaid',
            sprintf('WATER-%05d', $index),
            number_format(350 + ($index % 13) * 18, 2, '.', ''),
            $currentDate,
            $index % 3 === 0 ? 'Paid' : 'Unpaid',
            sprintf('ELEC-%05d', $index),
            number_format(2800 + ($index % 19) * 110, 2, '.', ''),
            $currentDate,
            $index % 6 === 0 ? 'Paid' : 'Unpaid',
            number_format(3200 + ($index % 5) * 120, 2, '.', ''),
            $currentDate,
            $index % 7 === 0 ? 'Paid' : 'Unpaid',
            $realPropertyTax,
            $rptPaymentStatus,
            $penalty,
            $propertyStatus,
        ]);

        $inserted += 1;
    }

    return $inserted;
}

$iterations = max(1, (int) read_cli_option($argv, 'iterations', '5'));
$page = max(1, (int) read_cli_option($argv, 'page', '1'));
$perPage = max(1, min(200, (int) read_cli_option($argv, 'per-page', '10')));
$search = trim(read_cli_option($argv, 'q', ''));
$duePeriod = trim(read_cli_option($argv, 'due-period', ''));
$seedRows = max(0, (int) read_cli_option($argv, 'seed-rows', '0'));

$originalGet = $_GET;
$_GET = [];
$_GET['page'] = (string) $page;
$_GET['per_page'] = (string) $perPage;
if ($search !== '') {
    $_GET['q'] = $search;
}
if ($duePeriod !== '') {
    $_GET['due_period'] = $duePeriod;
}

$pdo = get_db_connection();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

ensure_bill_type_column($pdo);
ensure_billing_visibility_column($pdo);
ensure_billing_property_list_column($pdo);
ensure_property_master_columns($pdo);
ensure_billing_due_period_column($pdo);
enforce_monthly_identity_health($pdo);

if ($seedRows > 0) {
    $pdo->beginTransaction();
}

$seededRowsInserted = 0;
try {
    if ($seedRows > 0) {
        $benchmarkDuePeriod = $duePeriod !== '' ? $duePeriod : date('Y-m');
        $seededRowsInserted = seed_phase21_benchmark_rows($pdo, $seedRows, $benchmarkDuePeriod);
    }

    $filters = build_bill_list_filters();
    $pagination = read_pagination_from_query($perPage, 200);
    $totalMatchingRows = count_monthly_record_rows($pdo, $filters);

    $mergedSamples = [];
    $mergedPeakMemory = memory_get_usage(true);
    for ($index = 0; $index < $iterations; $index++) {
        gc_collect_cycles();
        $start = microtime(true);
        $rows = fetch_monthly_record_rows($pdo, $filters, $pagination);
        $mergedSamples[] = (microtime(true) - $start) * 1000;
        $mergedPeakMemory = max($mergedPeakMemory, memory_get_peak_usage(true));
        unset($rows);
    }

    $dashboardSamples = [];
    $dashboardPeakMemory = memory_get_usage(true);
    for ($index = 0; $index < $iterations; $index++) {
        gc_collect_cycles();
        $start = microtime(true);
        $summary = build_dashboard_summary_payload($pdo);
        $dashboardSamples[] = (microtime(true) - $start) * 1000;
        $dashboardPeakMemory = max($dashboardPeakMemory, memory_get_peak_usage(true));
        unset($summary);
    }
} finally {
    if ($seedRows > 0 && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    $_GET = $originalGet;
}

echo "Phase 21 benchmark\n";
echo "iterations: {$iterations}\n";
echo "page: {$page}\n";
echo "per_page: {$perPage}\n";
echo "search: " . ($search !== '' ? $search : '(none)') . "\n";
echo "due_period: " . ($duePeriod !== '' ? $duePeriod : '(none)') . "\n";
echo "seed_rows_requested: {$seedRows}\n";
echo "seed_rows_inserted: {$seededRowsInserted}\n";
echo "seed_rows_rolled_back: " . ($seedRows > 0 ? 'true' : 'false') . "\n";
echo "matching_rows: {$totalMatchingRows}\n";
echo "merged_records_avg_ms: " . format_benchmark_ms($mergedSamples) . "\n";
echo "merged_records_peak_mb: " . format_benchmark_memory($mergedPeakMemory) . "\n";
echo "dashboard_summary_avg_ms: " . format_benchmark_ms($dashboardSamples) . "\n";
echo "dashboard_summary_peak_mb: " . format_benchmark_memory($dashboardPeakMemory) . "\n";
