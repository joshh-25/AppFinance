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
            ['property_record_list', 'viewer'],
            ['add', 'editor'],
            ['bill_update', 'editor'],
            ['upload_bill', 'editor'],
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
            ['viewer', 'add', false],
            ['editor', 'add', true],
            ['editor', 'property_record_delete', false],
            ['admin', 'property_record_delete', true],
            ['admin', 'upload_bill', true],
        ];
    }
}
