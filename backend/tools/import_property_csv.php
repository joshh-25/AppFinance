<?php
/*
 * CSV importer for property rows.
 *
 * Expected CSV headers (case-insensitive):
 * DD, Property, Unit Owner, Classification, Deposit, Rent
 *
 * Usage:
 * php backend/tools/import_property_csv.php --file="C:\path\units.csv" --table=property_list --skip-header=1
 */

require_once __DIR__ . '/../db.php';

function usage(): void
{
    echo "Usage:\n";
    echo "  php backend/tools/import_property_csv.php --file=\"C:\\path\\units.csv\" [--table=property_list|property_billing_records|both] [--skip-header=1|0] [--truncate=1|0]\n";
    exit(1);
}

function normalizeHeader(string $value): string
{
    return strtolower(trim(preg_replace('/\s+/', ' ', $value)));
}

function parseArgs(array $argv): array
{
    $args = [
        'file' => '',
        'table' => 'property_list',
        'skip-header' => '1',
        'truncate' => '0',
    ];

    foreach ($argv as $item) {
        if (strpos($item, '--') !== 0) {
            continue;
        }
        $parts = explode('=', substr($item, 2), 2);
        $key = $parts[0] ?? '';
        $value = $parts[1] ?? '1';
        if ($key !== '') {
            $args[$key] = $value;
        }
    }

    return $args;
}

function toValue(string $value): string
{
    $value = trim($value);
    if ($value === '') {
        return 'N/A';
    }
    return $value;
}

$args = parseArgs($argv);
$file = $args['file'] ?? '';
$table = strtolower(trim((string)($args['table'] ?? 'property_list')));
$skipHeader = ((string)($args['skip-header'] ?? '1')) === '1';
$truncate = ((string)($args['truncate'] ?? '0')) === '1';

if ($file === '' || !file_exists($file)) {
    echo "CSV file not found.\n";
    usage();
}

if (!in_array($table, ['property_list', 'property_billing_records', 'both'], true)) {
    echo "Invalid --table value.\n";
    usage();
}

$pdo = get_db_connection();
$handle = fopen($file, 'r');
if ($handle === false) {
    echo "Unable to open CSV file.\n";
    exit(1);
}

$headers = [];
$mapped = [
    'dd' => -1,
    'property' => -1,
    'unit owner' => -1,
    'classification' => -1,
    'deposit' => -1,
    'rent' => -1,
];

$rowIndex = 0;
$insertedPropertyList = 0;
$insertedBillingRecords = 0;
$skippedRows = 0;

try {
    $pdo->beginTransaction();

    if ($truncate) {
        if ($table === 'property_list' || $table === 'both') {
            $pdo->exec("TRUNCATE TABLE property_list");
        }
        if ($table === 'property_billing_records' || $table === 'both') {
            $pdo->exec("TRUNCATE TABLE property_billing_records");
        }
    }

    $upsertPropertyListStmt = $pdo->prepare(
        "INSERT INTO property_list (dd, property, unit_owner, classification, deposit, rent)
         VALUES (:dd, :property, :unit_owner, :classification, :deposit, :rent)
         ON DUPLICATE KEY UPDATE
            unit_owner = VALUES(unit_owner),
            classification = VALUES(classification),
            deposit = VALUES(deposit),
            rent = VALUES(rent)"
    );

    $selectPropertyListIdStmt = $pdo->prepare(
        "SELECT id FROM property_list
         WHERE LOWER(TRIM(dd)) = LOWER(TRIM(:dd))
           AND LOWER(TRIM(COALESCE(property, ''))) = LOWER(TRIM(:property))
         LIMIT 1"
    );

    $insertBillingStmt = $pdo->prepare(
        "INSERT INTO property_billing_records (property_list_id, dd, property, unit_owner, classification, deposit, rent)
         VALUES (:property_list_id, :dd, :property, :unit_owner, :classification, :deposit, :rent)"
    );

    while (($row = fgetcsv($handle)) !== false) {
        $rowIndex++;

        if ($rowIndex === 1 && $skipHeader) {
            $headers = array_map(
                static function ($h) {
                    return normalizeHeader((string)$h);
                },
                $row
            );

            foreach ($headers as $idx => $name) {
                if (array_key_exists($name, $mapped)) {
                    $mapped[$name] = $idx;
                }
            }
            continue;
        }

        if ($skipHeader && in_array(-1, $mapped, true)) {
            throw new RuntimeException("Missing one or more required headers. Required: DD, Property, Unit Owner, Classification, Deposit, Rent");
        }

        $dd = '';
        $property = '';
        $unitOwner = '';
        $classification = '';
        $deposit = '';
        $rent = '';

        if ($skipHeader) {
            $dd = toValue((string)($row[$mapped['dd']] ?? ''));
            $property = toValue((string)($row[$mapped['property']] ?? ''));
            $unitOwner = toValue((string)($row[$mapped['unit owner']] ?? ''));
            $classification = toValue((string)($row[$mapped['classification']] ?? ''));
            $deposit = toValue((string)($row[$mapped['deposit']] ?? ''));
            $rent = toValue((string)($row[$mapped['rent']] ?? ''));
        } else {
            $dd = toValue((string)($row[0] ?? ''));
            $property = toValue((string)($row[1] ?? ''));
            $unitOwner = toValue((string)($row[2] ?? ''));
            $classification = toValue((string)($row[3] ?? ''));
            $deposit = toValue((string)($row[4] ?? ''));
            $rent = toValue((string)($row[5] ?? ''));
        }

        if ($dd === 'N/A' && $property === 'N/A' && $unitOwner === 'N/A') {
            $skippedRows++;
            continue;
        }

        $params = [
            ':property_list_id' => 0,
            ':dd' => $dd,
            ':property' => $property,
            ':unit_owner' => $unitOwner,
            ':classification' => $classification,
            ':deposit' => $deposit,
            ':rent' => $rent,
        ];

        $upsertPropertyListStmt->execute($params);
        $insertedPropertyList++;
        $propertyListId = (int) $pdo->lastInsertId();
        if ($propertyListId <= 0) {
            $selectPropertyListIdStmt->execute([
                ':dd' => $dd,
                ':property' => $property,
            ]);
            $propertyListId = (int) ($selectPropertyListIdStmt->fetchColumn() ?: 0);
        }

        if ($table === 'property_list') {
            continue;
        }

        $params[':property_list_id'] = $propertyListId;

        if ($table === 'property_billing_records' || $table === 'both') {
            $insertBillingStmt->execute($params);
            $insertedBillingRecords++;
        }
    }

    fclose($handle);
    $pdo->commit();

    echo "Import complete.\n";
    echo "Upserted into property_list: {$insertedPropertyList}\n";
    echo "Inserted into property_billing_records: {$insertedBillingRecords}\n";
    echo "Skipped rows: {$skippedRows}\n";
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (is_resource($handle)) {
        fclose($handle);
    }
    echo "Import failed: " . $e->getMessage() . "\n";
    exit(1);
}
