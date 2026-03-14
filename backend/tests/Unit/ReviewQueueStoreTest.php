<?php
/*
 * Finance App File: backend/tests/Unit/ReviewQueueStoreTest.php
 * Purpose: Unit tests for persisted Bills Review queue normalization.
 */
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

if (!defined('API_BILL_TYPES')) {
    define('API_BILL_TYPES', ['water', 'internet', 'electricity', 'association_dues']);
}

require_once __DIR__ . '/../../src/Modules/Bills/ReviewQueueStore.php';
require_once __DIR__ . '/../../src/Modules/Bills/LegacyBills.php';

final class ReviewQueueStoreTest extends TestCase
{
    public function testNormalizeReviewQueueStatusFallsBackToNeedsReview(): void
    {
        $this->assertSame('ready', normalize_review_queue_status('ready'));
        $this->assertSame('needs_review', normalize_review_queue_status(''));
        $this->assertSame('needs_review', normalize_review_queue_status('unexpected'));
    }

    public function testNormalizeReviewQueueRowPayloadKeepsExpectedFields(): void
    {
        $row = normalize_review_queue_row_payload([
            'id' => 'row-123',
            'source_file_name' => 'water.pdf',
            'bill_type' => 'wifi',
            'status' => 'save_failed',
            'scan_error' => 'Needs check',
            'save_error' => 'Unable to save',
            'data' => ['water_amount' => '1200.00'],
            'diagnostics' => ['retry_count' => 2, 'request_id' => 'req-1'],
        ], 4);

        $this->assertNotNull($row);
        $this->assertSame('row-123', $row['client_row_id']);
        $this->assertSame(4, $row['sort_order']);
        $this->assertSame('internet', $row['bill_type']);
        $this->assertSame('save_failed', $row['status']);
        $this->assertIsString($row['row_data_json']);
        $this->assertIsString($row['diagnostics_json']);
    }

    public function testMapReviewQueueRowDecodesJsonColumns(): void
    {
        $row = map_review_queue_row([
            'client_row_id' => 'row-5',
            'source_file_name' => 'broken.pdf',
            'bill_type' => '',
            'status' => 'scan_failed',
            'scan_error' => 'OCR failed',
            'save_error' => '',
            'row_data_json' => json_encode(['due_period' => '2026-03']),
            'diagnostics_json' => json_encode([
                'title' => 'Retry scan',
                'message' => 'OCR returned empty response.',
                'retry_count' => 1,
            ]),
        ]);

        $this->assertSame('row-5', $row['id']);
        $this->assertSame('scan_failed', $row['status']);
        $this->assertSame('2026-03', $row['data']['due_period']);
        $this->assertSame('Retry scan', $row['diagnostics']['title']);
        $this->assertSame(1, $row['diagnostics']['retry_count']);
    }
}
