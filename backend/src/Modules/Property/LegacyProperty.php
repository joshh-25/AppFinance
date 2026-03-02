<?php
/*
 * Finance App File: api/property.php
 * Purpose: Property master (property_list) CRUD handlers.
 */

function handle_property_actions($action)
{
    if ($action === 'property_record_create' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (!is_array($data)) {
            echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
            return true;
        }

        $normalized = normalize_property_record_payload($data);
        if ($normalized['dd'] === '' && $normalized['property'] === '') {
            echo json_encode(['success' => false, 'message' => 'DD or Property Name is required.']);
            return true;
        }
        try {
            $pdo = get_db_connection();
            ensure_property_master_columns($pdo);
            ensure_billing_property_list_column($pdo);
            $pdo->beginTransaction();

            $existing = find_property_list_by_identity($pdo, $normalized['dd'], $normalized['property'], $normalized['billing_period']);
            if ($existing) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                echo json_encode(['success' => false, 'message' => 'Property already exists in Property List.']);
                return true;
            }

            $stmt = $pdo->prepare(
                "INSERT INTO `property_list` (
                    `dd`, `property`, `billing_period`, `unit_owner`, `classification`, `deposit`, `rent`,
                    `per_property_status`, `real_property_tax`, `rpt_payment_status`, `penalty`
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $stmt->execute([
                $normalized['dd'],
                $normalized['property'],
                $normalized['billing_period'],
                $normalized['unit_owner'],
                $normalized['classification'],
                $normalized['deposit'],
                $normalized['rent'],
                $normalized['per_property_status'],
                $normalized['real_property_tax'],
                $normalized['rpt_payment_status'],
                $normalized['penalty'],
            ]);

            $newId = (int) $pdo->lastInsertId();
            $created = find_property_list_by_id($pdo, $newId);

            $syncStmt = $pdo->prepare(
                "UPDATE `property_billing_records`
                 SET `property_list_id` = ?, `dd` = ?, `property` = ?, `unit_owner` = ?, `classification` = ?, `deposit` = ?, `rent` = ?,
                     `per_property_status` = ?, `real_property_tax` = ?, `rpt_payment_status` = ?, `penalty` = ?
                 WHERE LOWER(TRIM(`dd`)) = LOWER(TRIM(?))
                   AND LOWER(TRIM(COALESCE(`property`, ''))) = LOWER(TRIM(?))"
            );
            $syncStmt->execute([
                $newId,
                $normalized['dd'],
                $normalized['property'],
                $normalized['unit_owner'],
                $normalized['classification'],
                $normalized['deposit'],
                $normalized['rent'],
                $normalized['per_property_status'],
                $normalized['real_property_tax'],
                $normalized['rpt_payment_status'],
                $normalized['penalty'],
                $normalized['dd'],
                $normalized['property'],
            ]);

            hide_duplicate_active_bills($pdo);
            $pdo->commit();
            audit_log_event('property_list_create', [
                'property_list_id' => $newId,
                'dd' => (string) ($created['dd'] ?? $normalized['dd']),
                'property' => (string) ($created['property'] ?? $normalized['property']),
            ]);

            echo json_encode([
                'success' => true,
                'message' => 'Property saved to Property List successfully.',
                'data' => [
                    'id' => $newId,
                    'property_list_id' => $newId,
                    'dd' => $created['dd'] ?? $normalized['dd'],
                    'property' => $created['property'] ?? $normalized['property'],
                    'billing_period' => $created['billing_period'] ?? $normalized['billing_period'],
                    'unit_owner' => $created['unit_owner'] ?? $normalized['unit_owner'],
                    'classification' => $created['classification'] ?? $normalized['classification'],
                    'deposit' => $created['deposit'] ?? $normalized['deposit'],
                    'rent' => $created['rent'] ?? $normalized['rent'],
                    'per_property_status' => $created['per_property_status'] ?? $normalized['per_property_status'],
                    'real_property_tax' => $created['real_property_tax'] ?? $normalized['real_property_tax'],
                    'rpt_payment_status' => $created['rpt_payment_status'] ?? $normalized['rpt_payment_status'],
                    'penalty' => $created['penalty'] ?? $normalized['penalty'],
                ],
            ]);
        } catch (Throwable $e) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            db_error_response($e);
        }

        return true;
    }

    if ($action === 'property_record_list') {
        try {
            $pdo = get_db_connection();
            ensure_property_master_columns($pdo);
            $stmt = $pdo->query(
                "SELECT
                    `id`,
                    `id` AS `property_list_id`,
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
                    `penalty`,
                    `updated_at`
                 FROM `property_list`
                 ORDER BY `dd` ASC, `property` ASC, `billing_period` DESC, `id` DESC"
            );
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode(['success' => true, 'data' => $rows]);
        } catch (Throwable $e) {
            db_error_response($e);
        }

        return true;
    }

    if ($action === 'property_record_update' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (!is_array($data)) {
            echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
            return true;
        }

        $id = (int) ($data['id'] ?? 0);
        if ($id <= 0) {
            echo json_encode(['success' => false, 'message' => 'A valid record id is required.']);
            return true;
        }

        $normalized = normalize_property_record_payload($data);
        if ($normalized['dd'] === '' && $normalized['property'] === '') {
            echo json_encode(['success' => false, 'message' => 'DD or Property Name is required.']);
            return true;
        }
        try {
            $pdo = get_db_connection();
            ensure_property_master_columns($pdo);
            ensure_billing_property_list_column($pdo);
            ensure_billing_visibility_column($pdo);
            $pdo->beginTransaction();

            $current = find_property_list_by_id($pdo, $id);
            if (!$current) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                echo json_encode(['success' => false, 'message' => 'Property not found.']);
                return true;
            }

            $conflictStmt = $pdo->prepare(
                "SELECT `id`
                 FROM `property_list`
                 WHERE `id` <> ?
                   AND LOWER(TRIM(`dd`)) = LOWER(TRIM(?))
                   AND LOWER(TRIM(COALESCE(`property`, ''))) = LOWER(TRIM(?))
                   AND TRIM(COALESCE(`billing_period`, '')) = TRIM(?)
                 LIMIT 1"
            );
            $conflictStmt->execute([$id, $normalized['dd'], $normalized['property'], $normalized['billing_period']]);
            if ($conflictStmt->fetch(PDO::FETCH_ASSOC)) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                echo json_encode(['success' => false, 'message' => 'Another property already uses this DD/Property pair.']);
                return true;
            }

            $updateStmt = $pdo->prepare(
                "UPDATE `property_list`
                 SET `dd` = ?, `property` = ?, `billing_period` = ?, `unit_owner` = ?, `classification` = ?, `deposit` = ?, `rent` = ?,
                     `per_property_status` = ?, `real_property_tax` = ?, `rpt_payment_status` = ?, `penalty` = ?
                 WHERE `id` = ?"
            );
            $updateStmt->execute([
                $normalized['dd'],
                $normalized['property'],
                $normalized['billing_period'],
                $normalized['unit_owner'],
                $normalized['classification'],
                $normalized['deposit'],
                $normalized['rent'],
                $normalized['per_property_status'],
                $normalized['real_property_tax'],
                $normalized['rpt_payment_status'],
                $normalized['penalty'],
                $id,
            ]);

            $syncBillsStmt = $pdo->prepare(
                "UPDATE `property_billing_records`
                 SET `property_list_id` = ?, `dd` = ?, `property` = ?, `unit_owner` = ?, `classification` = ?, `deposit` = ?, `rent` = ?,
                     `per_property_status` = ?, `real_property_tax` = ?, `rpt_payment_status` = ?, `penalty` = ?
                 WHERE `property_list_id` = ?
                    OR (
                        `property_list_id` IS NULL
                        AND LOWER(TRIM(`dd`)) = LOWER(TRIM(?))
                        AND LOWER(TRIM(COALESCE(`property`, ''))) = LOWER(TRIM(?))
                    )"
            );
            $syncBillsStmt->execute([
                $id,
                $normalized['dd'],
                $normalized['property'],
                $normalized['unit_owner'],
                $normalized['classification'],
                $normalized['deposit'],
                $normalized['rent'],
                $normalized['per_property_status'],
                $normalized['real_property_tax'],
                $normalized['rpt_payment_status'],
                $normalized['penalty'],
                $id,
                $current['dd'] ?? '',
                $current['property'] ?? '',
            ]);
            $syncedBillRows = (int) $syncBillsStmt->rowCount();

            hide_duplicate_active_bills($pdo);
            $pdo->commit();
            audit_log_event('property_list_update', [
                'property_list_id' => $id,
                'dd' => (string) $normalized['dd'],
                'property' => (string) $normalized['property'],
                'synced_bill_rows' => $syncedBillRows,
            ]);

            echo json_encode([
                'success' => true,
                'message' => "Property updated successfully. Synced {$syncedBillRows} linked bill row(s).",
            ]);
        } catch (Throwable $e) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            db_error_response($e);
        }

        return true;
    }

    if ($action === 'property_record_delete' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);

        if (!is_array($data)) {
            echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
            return true;
        }

        $id = (int) ($data['id'] ?? 0);
        if ($id <= 0) {
            echo json_encode(['success' => false, 'message' => 'A valid record id is required.']);
            return true;
        }

        try {
            $pdo = get_db_connection();
            ensure_property_master_columns($pdo);
            ensure_billing_property_list_column($pdo);
            $pdo->beginTransaction();

            $current = find_property_list_by_id($pdo, $id);
            if (!$current) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                echo json_encode(['success' => false, 'message' => 'Property not found.']);
                return true;
            }

            $unlinkBillsStmt = $pdo->prepare(
                "UPDATE `property_billing_records`
                 SET `property_list_id` = NULL
                 WHERE `property_list_id` = ?"
            );
            $unlinkBillsStmt->execute([$id]);
            $unlinkedBillRows = (int) $unlinkBillsStmt->rowCount();

            $deleteStmt = $pdo->prepare("DELETE FROM `property_list` WHERE `id` = ?");
            $deleteStmt->execute([$id]);

            $pdo->commit();
            audit_log_event('property_list_delete', [
                'property_list_id' => $id,
                'dd' => (string) ($current['dd'] ?? ''),
                'property' => (string) ($current['property'] ?? ''),
                'unlinked_bill_rows' => $unlinkedBillRows,
            ]);
            echo json_encode([
                'success' => true,
                'message' => "Property deleted from Property List. Unlinked {$unlinkedBillRows} bill row(s).",
            ]);
        } catch (Throwable $e) {
            if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            db_error_response($e);
        }

        return true;
    }

    return false;
}
