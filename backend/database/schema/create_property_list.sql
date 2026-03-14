CREATE TABLE IF NOT EXISTS `property_list` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `dd` VARCHAR(120) NOT NULL,
    `property` VARCHAR(180) NOT NULL,
    `billing_period` VARCHAR(7) NOT NULL DEFAULT '',
    `unit_owner` VARCHAR(180) DEFAULT '',
    `classification` VARCHAR(120) DEFAULT '',
    `deposit` VARCHAR(80) DEFAULT '',
    `rent` VARCHAR(80) DEFAULT '',
    `per_property_status` VARCHAR(120) DEFAULT '',
    `real_property_tax` VARCHAR(80) DEFAULT '',
    `rpt_payment_status` VARCHAR(120) DEFAULT '',
    `penalty` VARCHAR(80) DEFAULT '',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_property_list_dd_property_period` (`dd`, `property`, `billing_period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
