-- Finance migration: create persisted Bills Review queue storage

CREATE TABLE IF NOT EXISTS `bill_review_queue` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `client_row_id` VARCHAR(120) NOT NULL,
    `sort_order` INT NOT NULL DEFAULT 0,
    `source_file_name` VARCHAR(255) NOT NULL DEFAULT '',
    `bill_type` VARCHAR(32) NOT NULL DEFAULT '',
    `status` VARCHAR(32) NOT NULL DEFAULT 'needs_review',
    `scan_error` TEXT NULL,
    `save_error` TEXT NULL,
    `row_data_json` LONGTEXT NULL,
    `diagnostics_json` LONGTEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_bill_review_queue_user_row` (`user_id`, `client_row_id`),
    KEY `idx_bill_review_queue_user_sort` (`user_id`, `sort_order`),
    KEY `idx_bill_review_queue_user_status` (`user_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
