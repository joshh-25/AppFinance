<?php
/*
 * Finance App File: backend\\tests\\AuthRbacTest.php
 * Purpose: Unit tests for RBAC role normalization and permission matrix.
 */
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once __DIR__ . '/../../src/Modules/Auth/LegacyAuth.php';

final class AuthRbacTest extends TestCase
{
    public function testNormalizeUserRoleSupportsKnownRoles(): void
    {
        $this->assertSame('admin', normalize_user_role('admin'));
        $this->assertSame('editor', normalize_user_role('editor'));
        $this->assertSame('viewer', normalize_user_role('viewer'));
    }

    public function testNormalizeUserRoleFallsBackToDefault(): void
    {
        $this->assertSame('admin', normalize_user_role(''));
        $this->assertSame('viewer', normalize_user_role('unknown-role', 'viewer'));
    }

    /**
     * @dataProvider requiredRoleProvider
     */
    public function testRequiredRoleMatrix(string $action, string $expectedRole): void
    {
        $this->assertSame($expectedRole, get_required_role_for_action($action));
    }

    public static function requiredRoleProvider(): array
    {
        return [
            ['list', 'viewer'],
            ['list_merged', 'viewer'],
            ['dashboard_summary', 'viewer'],
            ['review_queue_list', 'viewer'],
            ['review_queue_summary', 'viewer'],
            ['property_record_list', 'viewer'],
            ['expense_list', 'viewer'],
            ['account_lookup_search', 'viewer'],
            ['review_queue_replace', 'editor'],
            ['add', 'editor'],
            ['bill_update', 'editor'],
            ['upload_bill', 'editor'],
            ['expense_create', 'admin'],
            ['expense_update', 'admin'],
            ['expense_delete', 'admin'],
            ['account_lookup_import', 'admin'],
            ['property_record_create', 'admin'],
            ['property_record_update', 'admin'],
            ['property_record_delete', 'admin'],
        ];
    }

    /**
     * @dataProvider roleAccessProvider
     */
    public function testRoleActionAccess(string $role, string $action, bool $expected): void
    {
        $this->assertSame($expected, can_role_access_action($role, $action));
    }

    public static function roleAccessProvider(): array
    {
        return [
            ['viewer', 'list', true],
            ['viewer', 'dashboard_summary', true],
            ['viewer', 'review_queue_list', true],
            ['viewer', 'expense_list', true],
            ['viewer', 'account_lookup_search', true],
            ['viewer', 'add', false],
            ['viewer', 'review_queue_replace', false],
            ['editor', 'add', true],
            ['editor', 'review_queue_replace', true],
            ['editor', 'account_lookup_import', false],
            ['editor', 'expense_create', false],
            ['editor', 'property_record_delete', false],
            ['admin', 'property_record_delete', true],
            ['admin', 'account_lookup_import', true],
            ['admin', 'upload_bill', true],
            ['admin', 'expense_delete', true],
        ];
    }
}
