<?php
/*
 * Finance App File: logout.php
 * Purpose: Backend/setup source file for the Finance app.
 */
session_start();
session_unset();
session_destroy();
header("Location: login.php");
exit;
?>
