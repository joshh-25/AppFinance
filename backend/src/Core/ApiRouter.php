<?php
/*
 * Finance App File: backend/src/Core/ApiRouter.php
 * Purpose: API action dispatcher using module controllers.
 */
class ApiRouter
{
    public static function dispatch(string $action): void
    {
        if (AuthController::handlePublicActions($action)) {
            return;
        }

        if (!AuthController::enforceAuthenticatedRequest($action)) {
            return;
        }

        if (BillsController::handle($action)) {
            return;
        }

        if (PropertyController::handle($action)) {
            return;
        }

        if (AccountLookupController::handle($action)) {
            return;
        }

        if (ExpensesController::handle($action)) {
            return;
        }

        echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
}
