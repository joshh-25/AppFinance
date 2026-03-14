-- Finance migration: add users.role for RBAC

SET @col_exists := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'role'
);
SET @ddl := IF(
    @col_exists = 0,
    "ALTER TABLE `users` ADD COLUMN `role` VARCHAR(20) NOT NULL DEFAULT 'admin' AFTER `password_hash`",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE `users`
SET `role` = 'admin'
WHERE TRIM(COALESCE(`role`, '')) = '';

SET @idx_exists := (
    SELECT COUNT(*)
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND INDEX_NAME = 'idx_users_role'
);
SET @ddl := IF(
    @idx_exists = 0,
    "ALTER TABLE `users` ADD INDEX `idx_users_role` (`role`)",
    "SELECT 1"
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
