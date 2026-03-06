<?php
/*
 * Finance App File: backend\\tools\\import_half_bills.php
 * Purpose: Backend/setup source file for the Finance app.
 */
require __DIR__ . '/../db.php';

function v($row, $index) {
    return isset($row[$index]) ? trim((string)$row[$index], " \t\n\r\0\x0B\"") : '';
}

function hasVal($value) {
    return trim((string)$value) !== '' && strtoupper(trim((string)$value)) !== 'N/A' && trim((string)$value) !== '-';
}

$csvPath = __DIR__ . '/../Examples/Excel/BILLS FEBRUARY 2026.csv';
if (!file_exists($csvPath)) {
    fwrite(STDERR, "CSV not found: $csvPath\n");
    exit(1);
}

$rows = [];
$fh = fopen($csvPath, 'r');
if (!$fh) {
    fwrite(STDERR, "Failed to open CSV\n");
    exit(1);
}

$header = fgetcsv($fh);
while (($data = fgetcsv($fh)) !== false) {
    $dd = v($data, 0);
    $property = v($data, 1);
    $unitOwner = v($data, 2);
    if ($dd === '' && $property === '' && $unitOwner === '') {
        continue;
    }

    $rows[] = [
        'dd' => $dd,
        'property' => $property,
        'unit_owner' => $unitOwner,
        'classification' => v($data, 3),
        'deposit' => v($data, 4),
        'rent' => v($data, 5),
        'internet_provider' => v($data, 6),
        'internet_account_no' => v($data, 7),
        'wifi_amount' => v($data, 8),
        'wifi_due_date' => v($data, 9),
        'wifi_payment_status' => v($data, 10),
        'water_account_no' => v($data, 11),
        'water_amount' => v($data, 12),
        'water_due_date' => v($data, 13),
        'water_payment_status' => v($data, 14),
        'electricity_account_no' => v($data, 15),
        'electricity_amount' => v($data, 16),
        'electricity_due_date' => v($data, 17),
        'electricity_payment_status' => v($data, 18),
        'association_dues' => v($data, 19),
        'association_due_date' => v($data, 20),
        'association_payment_status' => v($data, 21),
        'real_property_tax' => v($data, 22),
        'rpt_payment_status' => v($data, 23),
        'penalty' => v($data, 24),
        'per_property_status' => v($data, 25)
    ];
}
fclose($fh);

$total = count($rows);
$half = (int)floor($total / 2);
$targetRows = array_slice($rows, 0, $half);

$pdo = get_db_connection();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->beginTransaction();

$upsertProperty = $pdo->prepare(
    "INSERT INTO property_list (
        dd, property, unit_owner, classification, deposit, rent
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        unit_owner = VALUES(unit_owner),
        classification = VALUES(classification),
        deposit = VALUES(deposit),
        rent = VALUES(rent)"
);

$selectPropertyId = $pdo->prepare(
    "SELECT id FROM property_list
     WHERE LOWER(TRIM(dd)) = LOWER(TRIM(?))
       AND LOWER(TRIM(COALESCE(property, ''))) = LOWER(TRIM(?))
     LIMIT 1"
);

$insertBill = $pdo->prepare(
    "INSERT INTO property_billing_records (
        property_list_id, dd, property, unit_owner, bill_type, classification, deposit, rent,
        internet_provider, internet_account_no, wifi_amount, wifi_due_date, wifi_payment_status,
        water_account_no, water_amount, water_due_date, water_payment_status,
        electricity_account_no, electricity_amount, electricity_due_date, electricity_payment_status,
        association_dues, association_due_date, association_payment_status,
        real_property_tax, rpt_payment_status, penalty, per_property_status
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?
    )"
);

$propertyInserted = 0;
$billInserted = 0;

foreach ($targetRows as $r) {
    $upsertProperty->execute([
        $r['dd'],
        $r['property'],
        $r['unit_owner'],
        $r['classification'],
        $r['deposit'],
        $r['rent']
    ]);
    $propertyInserted++;

    $propertyListId = (int)$pdo->lastInsertId();
    if ($propertyListId <= 0) {
        $selectPropertyId->execute([$r['dd'], $r['property']]);
        $propertyListId = (int)($selectPropertyId->fetchColumn() ?: 0);
    }

    $types = [];
    if (hasVal($r['water_account_no']) || hasVal($r['water_amount']) || hasVal($r['water_due_date']) || hasVal($r['water_payment_status'])) {
        $types[] = 'water';
    }
    if (hasVal($r['internet_provider']) || hasVal($r['internet_account_no']) || hasVal($r['wifi_amount']) || hasVal($r['wifi_due_date']) || hasVal($r['wifi_payment_status'])) {
        $types[] = 'internet';
    }
    if (hasVal($r['electricity_account_no']) || hasVal($r['electricity_amount']) || hasVal($r['electricity_due_date']) || hasVal($r['electricity_payment_status'])) {
        $types[] = 'electricity';
    }
    if (hasVal($r['association_dues']) || hasVal($r['association_due_date']) || hasVal($r['association_payment_status'])) {
        $types[] = 'association_dues';
    }

    if (count($types) === 0) {
        $types[] = 'water';
    }

    foreach ($types as $type) {
        $insertBill->execute([
            $propertyListId,
            $r['dd'],
            $r['property'],
            $r['unit_owner'],
            $type,
            $r['classification'],
            $r['deposit'],
            $r['rent'],
            $type === 'internet' ? $r['internet_provider'] : '',
            $type === 'internet' ? $r['internet_account_no'] : '',
            $type === 'internet' ? $r['wifi_amount'] : '',
            $type === 'internet' ? $r['wifi_due_date'] : '',
            $type === 'internet' ? $r['wifi_payment_status'] : '',
            $type === 'water' ? $r['water_account_no'] : '',
            $type === 'water' ? $r['water_amount'] : '',
            $type === 'water' ? $r['water_due_date'] : '',
            $type === 'water' ? $r['water_payment_status'] : '',
            $type === 'electricity' ? $r['electricity_account_no'] : '',
            $type === 'electricity' ? $r['electricity_amount'] : '',
            $type === 'electricity' ? $r['electricity_due_date'] : '',
            $type === 'electricity' ? $r['electricity_payment_status'] : '',
            $type === 'association_dues' ? $r['association_dues'] : '',
            $type === 'association_dues' ? $r['association_due_date'] : '',
            $type === 'association_dues' ? $r['association_payment_status'] : '',
            $r['real_property_tax'],
            $r['rpt_payment_status'],
            $r['penalty'],
            $r['per_property_status']
        ]);
        $billInserted++;
    }
}

$pdo->commit();

echo "Total parsed rows: {$total}\n";
echo "Imported half rows: {$half}\n";
echo "Upserted property_list: {$propertyInserted}\n";
echo "Inserted property_billing_records: {$billInserted}\n";
?>


