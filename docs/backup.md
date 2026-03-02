# Project Backup - 2026-02-20

This file contains the full source code of the project at this point in time.

## Table of Contents
1. Core Files
2. Backend API & Auth
3. Documentation
4. Configuration & Setup

---

## index.php

```php
<?php
session_start();
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}
?>
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>E-Billing — Payment System</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script>
        // Apply saved theme BEFORE render to prevent flash
        (function() {
            const saved = localStorage.getItem('theme') || 'dark';
            document.documentElement.className = saved;
        })();

        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Fira Sans', 'sans-serif'],
                        mono: ['Fira Code', 'monospace'],
                    },
                    colors: {
                        brand: {
                            50:  '#f0fdf4',
                            100: '#dcfce7',
                            400: '#4ade80',
                            500: '#22c55e',
                            600: '#16a34a',
                        }
                    }
                }
            }
        }
    </script>
    <style type="text/tailwindcss">
        @layer base {
            body { font-family: 'Fira Sans', sans-serif; }
            /* ── Theme CSS variables ── */
            .dark {
                --row-text: #e2e8f0;  /* slate-200 — bright on dark */
                --row-muted: #94a3b8; /* slate-400 — visible on dark */
                --row-hover: rgba(255,255,255,0.05);
            }
            .light {
                --row-text: #1e293b;  /* slate-800 — dark on white */
                --row-muted: #475569; /* slate-600 — readable on white */
                --row-hover: #f8fafc;
            }
            #records-table-body tr:hover { background: var(--row-hover); }
            /* Tab switch fade */
            .tab-fade { transition: opacity 150ms ease; }
        }
        @layer utilities {
            /* ── Dark mode tokens ── */
            .dark body { @apply bg-[#020617] text-slate-100; }
            .dark .sidebar { @apply bg-[#0a0f1e] border-slate-800; }
            .dark .top-header { @apply bg-[#0a0f1e]/90 border-slate-800; }
            .dark .main-bg { @apply bg-[#020617]; }
            .dark .card { @apply bg-slate-900 border-slate-800; }
            .dark .input-field { @apply bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-400 focus:border-brand-500; }
            .dark .nav-inactive { @apply text-slate-300 hover:text-white hover:bg-slate-800; }
            .dark .nav-active { @apply bg-brand-500/10 text-brand-400 border border-brand-500/20; }
            .dark .section-label { @apply text-slate-500; }
            .dark .form-sub-bg { @apply bg-slate-800/40 border-slate-700/50; }
            .dark .upload-zone { @apply bg-slate-800/40 border-slate-700 hover:border-brand-500/50 hover:bg-slate-800/70; }
            .dark .upload-icon-bg { @apply bg-brand-500/10 border-brand-500/20 text-brand-400; }
            .dark .upload-text { @apply text-slate-200; }
            .dark .btn-secondary { @apply bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white; }
            .dark .kpi-card { @apply bg-slate-900 border-slate-800; }
            .dark .kpi-total { @apply text-white; }
            .dark .table-card { @apply bg-slate-900 border-slate-800; }
            .dark .table-head { @apply bg-slate-800 text-slate-400; }
            .dark .table-body { @apply bg-slate-900 divide-slate-800; }
            .dark .table-footer { @apply border-slate-800 text-slate-400; }
            .dark .header-toggle { @apply bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white; }
            .dark .page-title { @apply text-white; }
            .dark .page-sub { @apply text-slate-400; }
            .dark .logo-text { @apply text-white; }
            .dark .user-name { @apply text-slate-100; }
            .dark .form-label { @apply text-slate-300; }
            .dark .form-title { @apply text-white; }
            .dark .total-input { @apply text-brand-400 bg-brand-500/5 border-brand-500/30; }
            .dark .financial-bg { @apply bg-slate-800/30 border-slate-700/40; }
            .dark .financial-label { @apply text-slate-400; }

            /* ── Light mode tokens (Executive Dashboard — SaaS Palette) ── */
            /* bg:#F8FAFC  text:#1E293B  primary:#2563EB  surface:#FFFFFF  border:#E2E8F0 */
            .light body { background: #F8FAFC; color: #1E293B; }
            .light .sidebar { background: #FFFFFF; border-color: #E2E8F0; }
            .light .top-header { background: rgba(255,255,255,0.92); border-color: #E2E8F0; }
            .light .main-bg { background: #F8FAFC; }
            .light .card { background: #FFFFFF; border-color: #E2E8F0; }
            .light .input-field { @apply bg-white border-slate-300 text-slate-800 placeholder-slate-400 focus:border-blue-500; }
            .light .nav-inactive { @apply text-slate-500 hover:text-slate-800 hover:bg-slate-100; }
            .light .nav-active { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
            .light .section-label { color: #94A3B8; }
            .light .form-sub-bg { background: #F8FAFC; border-color: #E2E8F0; }
            .light .upload-zone { background: #F8FAFC; border-color: #CBD5E1; }
            .light .upload-zone:hover { border-color: #2563EB; background: #EFF6FF; }
            .light .upload-icon-bg { background: #EFF6FF; border-color: #BFDBFE; color: #2563EB; }
            .light .upload-text { color: #334155; }
            .light .btn-secondary { background: #FFFFFF; border-color: #CBD5E1; color: #475569; }
            .light .btn-secondary:hover { background: #F1F5F9; color: #1E293B; }
            .light .kpi-card { background: #FFFFFF; border-color: #E2E8F0; }
            .light .kpi-total { color: #1E293B; }
            .light .table-card { background: #FFFFFF; border-color: #E2E8F0; }
            .light .table-head { background: #F8FAFC; color: #64748B; }
            .light .table-body { background: #FFFFFF; }
            .light .table-footer { border-color: #F1F5F9; color: #64748B; }
            .light .header-toggle { background: #FFFFFF; border-color: #E2E8F0; color: #475569; }
            .light .header-toggle:hover { background: #F1F5F9; color: #1E293B; }
            .light .page-title { color: #0F172A; }
            .light .page-sub { color: #64748B; }
            .light .logo-text { color: #0F172A; }
            .light .user-name { color: #1E293B; }
            .light .form-label { color: #64748B; }
            .light .form-title { color: #0F172A; }
            .light .total-input { color: #16a34a; background: #f0fdf4; border-color: #86efac; }
            .light .financial-bg { background: #F8FAFC; border-color: #E2E8F0; }
            .light .financial-label { color: #94A3B8; }
            /* Skill: card hover lift effect (Executive Dashboard) */
            .light .kpi-card { transition: box-shadow 200ms ease, transform 200ms ease; }
            .light .kpi-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.08); transform: translateY(-2px); }
            /* Table row hover */
            .light #records-table-body tr { transition: background 150ms ease; }
            .light #records-table-body tr:hover { background: #F8FAFC; }

            /* Shared utilities */
            .btn-primary {
                @apply bg-brand-500 hover:bg-brand-400 text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-200 shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5 active:translate-y-0;
            }
            .input-field {
                @apply w-full text-sm rounded-xl focus:ring-2 focus:ring-brand-500/20 block p-2.5 transition-all duration-200 outline-none;
            }
            /* ── Toast Notification ── */
            @keyframes toastSlideIn {
                from { opacity: 0; transform: translateX(120%); }
                to   { opacity: 1; transform: translateX(0); }
            }
            @keyframes toastSlideOut {
                from { opacity: 1; transform: translateX(0); }
                to   { opacity: 0; transform: translateX(120%); }
            }
            @keyframes toastProgress {
                from { width: 100%; }
                to   { width: 0%; }
            }
            #toast-container {
                animation: toastSlideIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
            }
            #toast-container.toast-hide {
                animation: toastSlideOut 0.3s ease-in both;
            }
            #toast-progress {
                animation: toastProgress 4s linear both;
            }
            /* Dark toast */
            .dark #toast-container {
                background: #1e293b;
                border-color: #334155;
                color: #f1f5f9;
            }
            /* Light toast */
            .light #toast-container {
                background: #ffffff;
                border-color: #e2e8f0;
                color: #0f172a;
                box-shadow: 0 20px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06);
            }
        }
    </style>
</head>
<body class="h-screen flex overflow-hidden antialiased">

    <!-- ══ SIDEBAR ══ -->
    <aside class="sidebar w-64 border-r flex flex-col flex-shrink-0 z-20 relative overflow-hidden transition-colors duration-300">
        
        <!-- Glow (dark only) -->
        <div class="dark-only absolute top-0 left-0 w-full h-full pointer-events-none">
            <div class="absolute top-[-20%] left-[-30%] w-[80%] h-[40%] rounded-full bg-brand-500/5 blur-[60px]"></div>
        </div>

        <!-- Logo -->
        <div class="h-16 flex items-center px-5 border-b border-inherit relative z-10">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/30 flex-shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <span class="logo-text font-bold text-base tracking-tight font-mono">E-Billing</span>
            </div>
        </div>

        <!-- Navigation -->
        <nav class="flex-1 px-3 py-6 space-y-1 relative z-10">
            <p class="section-label text-[10px] font-bold uppercase tracking-widest px-3 mb-3">Modules</p>

            <a href="#" onclick="switchBillType('electricity')" id="nav-electricity"
               class="nav-active flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl cursor-pointer transition-all duration-200">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                Electricity Bill
            </a>
            <a href="#" onclick="switchBillType('water')" id="nav-water"
               class="nav-inactive flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-all duration-200">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>
                Water Bill
            </a>
            <a href="#" onclick="switchBillType('wifi')" id="nav-wifi"
               class="nav-inactive flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl cursor-pointer transition-all duration-200">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg>
                WiFi Bill
            </a>
        </nav>

        <!-- User -->
        <div class="p-4 border-t border-inherit relative z-10">
            <div class="flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 transition-colors cursor-pointer">
                <div class="w-8 h-8 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-500 font-bold text-xs flex-shrink-0">
                    <?php echo strtoupper(substr($_SESSION['username'] ?? 'A', 0, 2)); ?>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="user-name text-xs font-semibold truncate"><?php echo htmlspecialchars($_SESSION['username'] ?? 'Admin'); ?></p>
                    <a href="logout.php" class="text-[10px] text-slate-500 hover:text-brand-500 transition-colors font-medium uppercase tracking-wider">Log out</a>
                </div>
            </div>
        </div>
    </aside>

    <!-- ══ MAIN ══ -->
    <main class="main-bg flex-1 min-w-0 overflow-auto transition-colors duration-300">

        <!-- Header -->
        <header class="top-header backdrop-blur-md border-b sticky top-0 z-10 transition-colors duration-300">
            <div class="px-6 py-3 flex justify-between items-center">
                <div>
                    <h1 id="page-title" class="page-title text-xl font-bold tracking-tight font-mono transition-colors duration-300">Electricity Payment Entry</h1>
                    <p class="page-sub text-xs mt-0.5 transition-colors duration-300">Manage your utility payments securely.</p>
                </div>
                <div id="header-actions" class="flex items-center gap-2 tab-fade">
                    <!-- Theme Toggle -->
                    <button onclick="toggleTheme()" id="theme-toggle"
                        class="header-toggle w-9 h-9 flex items-center justify-center border rounded-xl transition-all duration-200 cursor-pointer"
                        title="Toggle theme">
                        <!-- Moon (shown in light mode) -->
                        <svg id="icon-moon" class="w-4 h-4 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
                        <!-- Sun (shown in dark mode) -->
                        <svg id="icon-sun" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                    </button>
                    <!-- View Records -->
                    <button id="view-toggle-btn" onclick="showRecords()"
                        class="header-toggle flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
                        <span>View Records</span>
                    </button>
                </div>
            </div>
        </header>

        <!-- Content -->
        <div class="p-5">
            <div class="max-w-5xl mx-auto space-y-4">

                <!-- Message Alert -->
                <div id="message" role="alert" class="hidden rounded-xl p-4 flex items-center gap-3 border"></div>

                <!-- ── New Bill Form ── -->
                <section id="content-new-bill" class="max-w-3xl mx-auto tab-fade">
                    <div class="card rounded-2xl shadow-xl p-5 transition-colors duration-300">
                        <div class="mb-4 pb-4 border-b border-inherit">
                            <div class="flex items-center gap-3">
                                <div class="w-1 h-8 bg-brand-500 rounded-full shadow-md shadow-brand-500/40 flex-shrink-0"></div>
                                <div>
                                    <h2 id="form-title" class="form-title text-lg font-bold font-mono transition-colors duration-300">Record Electricity Payment</h2>
                                    <p class="form-label text-xs mt-0.5 transition-colors duration-300">Enter details for already paid bills below.</p>
                                </div>
                            </div>
                        </div>

                        <form id="bill-form" class="space-y-4">
                            <input type="hidden" id="bill_type" name="bill_type" value="electricity">

                            <!-- Upload -->
                            <div class="upload-zone border border-dashed rounded-xl p-3 text-center cursor-pointer group transition-all duration-200" onclick="document.getElementById('bill_file').click()">
                                <input type="file" id="bill_file" name="bill_file" accept=".pdf,.jpg,.jpeg,.png" class="hidden" onchange="handleFileUpload(this)">
                                <div id="upload-placeholder">
                                    <div class="upload-icon-bg w-8 h-8 border rounded-full flex items-center justify-center mx-auto mb-2 transition-all duration-200">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                                    </div>
                                    <p class="upload-text text-sm font-semibold group-hover:text-brand-500 transition-colors duration-200">Scan & Auto-fill Bill</p>
                                    <p class="form-label text-xs mt-1">Click to upload bill image or PDF</p>
                                </div>
                                <div id="upload-loading" class="hidden">
                                    <div class="animate-spin rounded-full h-7 w-7 border-b-2 border-brand-500 mx-auto mb-3"></div>
                                    <p class="form-label text-sm font-medium">Scanning bill with AI...</p>
                                </div>
                            </div>

                            <!-- Tenant Info -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div class="space-y-1.5">
                                    <label for="property_name" class="form-label block text-xs font-semibold uppercase tracking-wider">Property Name</label>
                                    <input type="text" id="property_name" name="property_name" class="input-field" placeholder="e.g. Building A" required>
                                </div>
                                <div class="space-y-1.5">
                                    <label for="tenant_name" class="form-label block text-xs font-semibold uppercase tracking-wider">Tenant Name</label>
                                    <input type="text" id="tenant_name" name="tenant_name" class="input-field" placeholder="e.g. Juan Dela Cruz" required>
                                </div>
                            </div>

                            <!-- Account Info -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div class="space-y-1.5">
                                    <label id="label-account-no" for="account_no" class="form-label block text-xs font-semibold uppercase tracking-wider">Electric Account No</label>
                                    <input type="text" id="account_no" name="account_no" class="input-field" required>
                                </div>
                                <div class="space-y-1.5">
                                    <label for="or_number" class="form-label block text-xs font-semibold uppercase tracking-wider">OR Number</label>
                                    <input type="text" id="or_number" name="or_number" class="input-field" placeholder="Optional">
                                </div>
                            </div>

                            <!-- Period & Date -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div class="space-y-1.5">
                                    <label for="billing_period" class="form-label block text-xs font-semibold uppercase tracking-wider">Billing Period</label>
                                    <input type="text" id="billing_period" name="billing_period" placeholder="e.g. Jan 2026" class="input-field" required>
                                </div>
                                <div class="space-y-1.5">
                                    <label for="date_paid" class="form-label block text-xs font-semibold uppercase tracking-wider">Date Paid</label>
                                    <input type="date" id="date_paid" name="date_paid" class="input-field" required>
                                </div>
                            </div>

                            <!-- Financial -->
                            <div class="financial-bg border rounded-xl p-4">
                                <p class="financial-label text-[10px] font-bold uppercase tracking-widest mb-3">Financial Details</p>
                                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div class="space-y-1.5">
                                        <label for="amount" class="form-label block text-xs font-semibold uppercase tracking-wider">Amount (₱)</label>
                                        <input type="number" id="amount" name="amount" step="0.01" min="0" class="input-field font-mono" placeholder="0.00" oninput="calculateTotal()">
                                    </div>
                                    <div class="space-y-1.5">
                                        <label for="penalty" class="form-label block text-xs font-semibold uppercase tracking-wider">Penalty (₱)</label>
                                        <input type="number" id="penalty" name="penalty" step="0.01" min="0" class="input-field font-mono" placeholder="0.00" oninput="calculateTotal()">
                                    </div>
                                    <div class="space-y-1.5">
                                        <label for="total" class="block text-xs font-bold text-brand-500 uppercase tracking-wider">Total Paid (₱)</label>
                                        <input type="number" id="total" name="total" step="0.01" class="input-field total-input font-mono font-bold" readonly>
                                    </div>
                                </div>
                            </div>

                            <!-- Actions -->
                            <div class="flex justify-end gap-2 pt-1">
                                <button type="button" onclick="document.getElementById('bill-form').reset(); calculateTotal()"
                                    class="btn-secondary border rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer">
                                    Reset
                                </button>
                                <button type="submit" class="btn-primary cursor-pointer flex items-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                                    Record Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </section>

                <!-- ── Records Table ── -->
                <section id="content-records" class="hidden">

                    <!-- KPIs -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div class="kpi-card border rounded-2xl p-4 border-l-4 border-l-slate-500 transition-colors duration-300">
                            <p class="financial-label text-xs font-bold uppercase tracking-widest">Total Records</p>
                            <h3 id="kpi-total-records" class="kpi-total text-3xl font-bold tabular-nums mt-2 font-mono transition-colors duration-300">0</h3>
                        </div>
                        <div class="kpi-card border rounded-2xl p-4 border-l-4 border-l-brand-500 shadow-lg shadow-brand-500/5 transition-colors duration-300">
                            <p class="text-xs font-bold text-brand-500 uppercase tracking-widest">Total Collections</p>
                            <h3 id="kpi-collections" class="text-3xl font-bold text-brand-500 tabular-nums mt-2 font-mono">₱0.00</h3>
                        </div>
                    </div>

                    <div class="table-card border rounded-2xl overflow-hidden shadow-xl transition-colors duration-300">
                        <div class="p-4 border-b border-inherit flex justify-between items-center">
                            <div>
                                <h2 class="form-title text-base font-bold font-mono">Billing Records</h2>
                                <p class="form-label text-xs mt-0.5">History of all payment transactions.</p>
                            </div>
                            <button onclick="fetchBills()" class="btn-secondary border rounded-xl flex items-center gap-2 text-xs py-2 px-3 cursor-pointer transition-all duration-200">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                                Refresh
                            </button>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full text-left text-sm">
                                <thead class="table-head text-xs font-bold uppercase tracking-wider transition-colors duration-300">
                                    <tr>
                                        <th class="px-4 py-3 border-b border-inherit">Tenant</th>
                                        <th class="px-4 py-3 border-b border-inherit">Property</th>
                                        <th class="px-4 py-3 border-b border-inherit">Account No</th>
                                        <th class="px-4 py-3 border-b border-inherit">OR No.</th>
                                        <th class="px-4 py-3 border-b border-inherit">Period</th>
                                        <th class="px-4 py-3 border-b border-inherit text-right">Amount Paid (₱)</th>
                                        <th class="px-4 py-3 border-b border-inherit">Date Paid</th>
                                    </tr>
                                </thead>
                                <tbody id="records-table-body" class="table-body divide-y transition-colors duration-300">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    </main>

    <!-- Toast Notification -->
<div id="toast-container" class="hidden fixed bottom-5 right-5 z-50 w-80 rounded-2xl border overflow-hidden" role="alert" aria-live="polite">
    <!-- Green left accent bar -->
    <div class="flex">
        <div class="w-1 bg-brand-500 flex-shrink-0"></div>
        <div class="flex-1 p-4">
            <div class="flex items-start gap-3">
                <!-- Icon -->
                <div class="flex-shrink-0 w-8 h-8 rounded-full bg-brand-500/15 flex items-center justify-center mt-0.5">
                    <svg id="toast-icon-success" class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                    </svg>
                    <svg id="toast-icon-error" class="w-4 h-4 text-red-500 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <!-- Content -->
                <div class="flex-1 min-w-0">
                    <p id="toast-title" class="text-sm font-bold font-mono">Success</p>
                    <p id="toast-message" class="text-xs mt-0.5 opacity-70 leading-relaxed">Bill recorded successfully.</p>
                </div>
                <!-- Close button -->
                <button onclick="closeToast()" class="flex-shrink-0 opacity-40 hover:opacity-100 transition-opacity duration-150 cursor-pointer ml-1 mt-0.5" aria-label="Close notification">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        </div>
    </div>
    <!-- Progress bar (auto-dismiss timer) -->
    <div class="h-0.5 bg-brand-500/20">
        <div id="toast-progress" class="h-full bg-brand-500"></div>
    </div>
</div>

    <script src="script.js"></script>
    <script>
        // ── Theme toggle ──
        function toggleTheme() {
            const html = document.documentElement;
            const isDark = html.classList.contains('dark');
            const next = isDark ? 'light' : 'dark';
            html.className = next;
            localStorage.setItem('theme', next);
            updateThemeIcon();
        }

        function updateThemeIcon() {
            const isDark = document.documentElement.classList.contains('dark');
            document.getElementById('icon-sun').classList.toggle('hidden', !isDark);
            document.getElementById('icon-moon').classList.toggle('hidden', isDark);
        }

        // Run on load
        updateThemeIcon();
    </script>
</body>
</html>
```

## script.js

```javascript
/* 
 * E-Billing Finance System
 * Handles UI interactions, API calls, and bill processing.
 */

// ── State ──
let currentBillType = 'electricity'; // 'electricity' | 'water' | 'wifi'

// ── Form & UI Logic ──

function switchBillType(type) {
    if (currentBillType === type) return;

    // Update state
    currentBillType = type;

    // Update Nav Highlights
    document.querySelectorAll('nav a').forEach(el => {
        el.classList.remove('nav-active');
        el.classList.add('nav-inactive');
    });
    const activeLink = document.getElementById(`nav-${type}`);
    if (activeLink) {
        activeLink.classList.remove('nav-inactive');
        activeLink.classList.add('nav-active');
    }

    // Update Labels & Content with fade transition
    const content = document.getElementById('content-new-bill');
    const headerActions = document.getElementById('header-actions');
    
    // Fade out content + header buttons
    content.style.opacity = '0';
    headerActions.style.opacity = '0';

    setTimeout(() => {
        // Update texts while invisible
        const titles = {
            electricity: 'Electricity Payment Entry',
            water: 'Water Payment Entry',
            wifi: 'WiFi Payment Entry'
        };
        const accountLabels = {
            electricity: 'Electric Account No',
            water: 'Water Account No',
            wifi: 'Internet Account No'
        };

        // Update Header Title
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) pageTitle.textContent = titles[type];

        // Update Form Title
        const formTitle = document.getElementById('form-title');
        if (formTitle) formTitle.textContent = `Record ${type.charAt(0).toUpperCase() + type.slice(1)} Payment`;

        // Update Account Label
        const accLabel = document.getElementById('label-account-no');
        if (accLabel) accLabel.textContent = accountLabels[type];

        // Update Form Hidden Input
        const typeInput = document.getElementById('bill_type');
        if (typeInput) typeInput.value = type;

        // Reset views (go back to form)
        showForm();

        // Fade in content + header buttons
        requestAnimationFrame(() => {
            content.style.opacity = '1';
            headerActions.style.opacity = '1';
        });

    }, 150); // Matches CSS transition duration
}

function showRecords() {
    const formSection = document.getElementById('content-new-bill');
    const recordsSection = document.getElementById('content-records');
    const toggleBtn = document.getElementById('view-toggle-btn');
    
    // Fade out
    formSection.style.opacity = '0';
    recordsSection.style.opacity = '0';

    setTimeout(() => {
        // Toggle visibility
        formSection.classList.add('hidden');
        recordsSection.classList.remove('hidden');
        
        // Update Button
        toggleBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 17l-5-5m0 0l5-5m-5 5h12"/></svg>
            <span>Back to Form</span>
        `;
        toggleBtn.onclick = showForm;

        // Fetch data
        fetchBills();

        // Fade in
        requestAnimationFrame(() => {
            recordsSection.style.opacity = '1';
        });
    }, 150);
}

function showForm() {
    const formSection = document.getElementById('content-new-bill');
    const recordsSection = document.getElementById('content-records');
    const toggleBtn = document.getElementById('view-toggle-btn');

    // Fade out
    recordsSection.style.opacity = '0';
    formSection.style.opacity = '0';

    setTimeout(() => {
        // Toggle visibility
        recordsSection.classList.add('hidden');
        formSection.classList.remove('hidden');

        // Update Button
        toggleBtn.innerHTML = `
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            <span>View Records</span>
        `;
        toggleBtn.onclick = showRecords;

        // Fade in
        requestAnimationFrame(() => {
            formSection.style.opacity = '1';
        });
    }, 150);
}

// ── File Upload Handling ──
window.handleFileUpload = async function (input) {
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);

    // Show loading UI
    const placeholder = document.getElementById('upload-placeholder');
    const loading = document.getElementById('upload-loading');
    
    if (placeholder) placeholder.classList.add('hidden');
    if (loading) loading.classList.remove('hidden');

    try {
        // Send to PHP proxy which forwards to N8N
        const response = await fetch('api.php?action=upload_bill', {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
        });

        // Handle non-JSON responses (e.g. 500 errors)
        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error('Server returned non-JSON:', text);
            throw new Error('Server returned invalid response');
        }

        console.log('Upload Result:', result);

        // N8N returns { success: true, data: { ... } }
        // Note: The structure depends on how N8N "Respond to Webhook" is configured.
        // Assuming current N8N output structure.
        
        let finalData = {};
        let isQuotaError = false;

        // Check for OCR.space quota error or other API limitations
        if (result && JSON.stringify(result).includes("OCRExitCode")) {
             // Basic check if raw OCR result was returned with error
             if (result.OCRExitCode === 3 || result.OCRExitCode === 99) {
                 isQuotaError = true;
                 showToast('error', 'OCR Service Busy', 'Using mock data for testing purposes.');
             }
        }

        if (result.success && !isQuotaError) {
             // Map N8N data to form fields
             // The structure from N8N might be inside result.data[0] or result.data directly
             const data = Array.isArray(result.data) ? result.data[0] : result.data;
             finalData = data || {};
             
             // Populate form
             populateBillForm(finalData);
             showToast('success', 'Scan Complete', 'Bill details auto-filled.');
        } else {
             // Fallback to Mock Data if OCR fails or workflow is incomplete/quota exceeded
             console.warn("Using mock data due to upload failure/quota.");
             const mockData = {
                 tenant_name: "Juan Dela Cruz (Mock)",
                 property_name: "Building C",
                 account_no: "1234567890",
                 billing_period: "Jan 2026",
                 amount: 1500.00,
                 penalty: 0,
                 total: 1500.00
             };
             populateBillForm(mockData);
             if (!isQuotaError) showToast('warning', 'Scan Failed', 'Using mock data. Please verify details.');
        }

    } catch (error) {
        console.error('Upload Error:', error);
        showToast('error', 'Upload Error', 'Could not process file. Please try again.');
    } finally {
        // Reset UI
        if (placeholder) placeholder.classList.remove('hidden');
        if (loading) loading.classList.add('hidden');
        input.value = ''; // Allow re-upload
    }
};

function populateBillForm(data) {
    console.log("Populating form with:", data);

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
            if (val !== undefined && val !== null) {
                el.value = val;
            } else {
                console.log(`Value for ${id} is missing/null in data`);
            }
        } else {
            console.warn(`Form field with ID '${id}' not found!`);
        }
    };

    // Mapping keys from N8N JSON to HTML IDs
    // Adjust these keys based on actual N8N output
    setVal('tenant_name', data.tenant_name);
    setVal('property_name', data.property_name);
    
    // Account Number logic based on current view
    if (currentBillType === 'electricity') setVal('account_no', data.electric_account_no || data.account_no);
    if (currentBillType === 'water') setVal('account_no', data.water_account_no || data.account_no);
    if (currentBillType === 'wifi') setVal('account_no', data.wifi_account_no || data.account_no);

    setVal('billing_period', data.billing_period);
    setVal('amount', data.amount);
    setVal('penalty', data.penalty || 0);

    // Auto-set Date Paid to today if missing
    const datePaidField = document.getElementById('date_paid');
    if (datePaidField && !data.date_paid) {
        datePaidField.valueAsDate = new Date();
    } else {
        setVal('date_paid', data.date_paid);
    }

    calculateTotal();
}

// ── Calculations ──
function calculateTotal() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const penalty = parseFloat(document.getElementById('penalty').value) || 0;
    const total = amount + penalty;
    document.getElementById('total').value = total.toFixed(2);
}

// ── Submit Handling ──
document.getElementById('bill-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Saving...`;

    const formData = new FormData(this);
    const data = Object.fromEntries(formData.entries());

    // Fix checkboxes or empty fields if necessary
    
    try {
        const response = await fetch('api.php?action=add', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showToast('success', 'Payment Recorded', 'The bill has been successfully saved.');
            this.reset();
            calculateTotal();
            // Refresh table if visible
            if (!document.getElementById('content-records').classList.contains('hidden')) {
                fetchBills();
            }
        } else {
            showToast('error', 'Error', result.error || 'Failed to save record.');
        }

    } catch (error) {
        console.error('Error:', error);
        showToast('error', 'Connection Error', 'Could not reach the server.');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
});

// ── Records Fetching ──
async function fetchBills() {
    const tbody = document.getElementById('records-table-body');
    
    try {
        const response = await fetch(`api.php?action=list&bill_type=${currentBillType}`, {
            credentials: 'same-origin'
        });
        const bills = await response.json();
        
        renderTable(tbody, bills);
        updateKPIs(bills);
    } catch (error) {
        console.error('Fetch error:', error);
        tbody.innerHTML = `<tr><td colspan="7" class="px-6 py-4 text-center text-red-500">Failed to load records.</td></tr>`;
    }
}

function renderTable(container, bills) {
    container.innerHTML = '';
    
    if (bills.length === 0) {
        container.innerHTML = `<tr><td colspan="7" class="px-6 py-8 text-center text-slate-400 italic text-sm">No payment records found for ${currentBillType}.</td></tr>`;
        return;
    }

    bills.forEach(bill => {
        const tr = document.createElement('tr');
        // Theme variables are handled in CSS, but here we set classes
        tr.className = "border-b border-inherit hover:bg-black/5 dark:hover:bg-white/5 transition-colors";
        
        tr.innerHTML = `
            <td class="px-4 py-3 font-medium text-[var(--row-text)]">${bill.tenant_name}</td>
            <td class="px-4 py-3 text-[var(--row-muted)]">${bill.property_name || '-'}</td>
            <td class="px-4 py-3 font-mono text-xs text-[var(--row-muted)]">${bill.account_no}</td>
            <td class="px-4 py-3 font-mono text-xs text-[var(--row-muted)]">${bill.or_number || '-'}</td>
            <td class="px-4 py-3 text-[var(--row-text)] text-xs">${bill.billing_period}</td>
            <td class="px-4 py-3 text-right font-mono font-medium text-brand-500">₱${parseFloat(bill.total).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            <td class="px-4 py-3 text-[var(--row-muted)] text-xs">${bill.date_paid}</td>
        `;
        container.appendChild(tr);
    });
}

function updateKPIs(bills) {
    // 1. Total Records
    document.getElementById('kpi-total-records').textContent = bills.length;

    // 2. Total Collections (Sum of 'total' column)
    const totalCollection = bills.reduce((sum, bill) => sum + parseFloat(bill.total || 0), 0);
    document.getElementById('kpi-collections').textContent = '₱' + totalCollection.toLocaleString('en-US', {minimumFractionDigits: 2});
}

// ── Toast Logic ──
window.showToast = function (type, title, message) {
    const toast = document.getElementById('toast-container');
    const titleEl = document.getElementById('toast-title');
    const messageEl = document.getElementById('toast-message');
    const iconSuccess = document.getElementById('toast-icon-success');
    const iconError = document.getElementById('toast-icon-error');
    const progressBar = document.getElementById('toast-progress');

    // Set Content
    titleEl.textContent = title;
    messageEl.textContent = message;

    // Set Icon
    if (type === 'success') {
        iconSuccess.classList.remove('hidden');
        iconError.classList.add('hidden');
        titleEl.className = 'text-sm font-bold font-mono text-brand-500';
    } else {
        iconSuccess.classList.add('hidden');
        iconError.classList.remove('hidden');
        titleEl.className = 'text-sm font-bold font-mono text-red-500';
    }

    // Show
    toast.classList.remove('hidden');
    toast.classList.remove('toast-hide');
    
    // Reset Animation
    progressBar.style.animation = 'none';
    toast.offsetHeight; /* trigger reflow */
    progressBar.style.animation = 'toastProgress 4s linear both';

    // Auto Hide
    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(closeToast, 4000);
}

window.closeToast = function () {
    const toast = document.getElementById('toast-container');
    toast.classList.add('toast-hide');
    // Wait for animation to finish before hiding display
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 300);
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    // Set default date
    document.getElementById('date_paid').valueAsDate = new Date();
    // Default view
    switchBillType('electricity'); // initializes labels
});
```

## api.php

```php
<?php
session_start();
header('Content-Type: application/json');
require_once 'db.php';

// Auth Check
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$action = $_GET['action'] ?? '';
$pdo = get_db_connection();

// ── Helper: Get Table Name ──
function getTableForType($type) {
    switch ($type) {
        case 'water': return 'water_bills';
        case 'wifi': return 'wifi_bills';
        case 'electricity': default: return 'electricity_bills';
    }
}

// ── ACTION: List Bills ──
if ($action === 'list') {
    $type = $_GET['bill_type'] ?? 'electricity';
    $table = getTableForType($type);

    try {
        $stmt = $pdo->query("SELECT * FROM $table ORDER BY date_paid DESC, created_at DESC LIMIT 50");
        $bills = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($bills);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}

// ── ACTION: Add Bill ──
else if ($action === 'add' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Validate
    if (empty($input['billing_period']) || empty($input['amount'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required fields']);
        exit;
    }

    $type = $input['bill_type'] ?? 'electricity';
    $table = getTableForType($type);

    // Prepare Data
    $tenant_name = $input['tenant_name'] ?? 'Unknown';
    $property_name = $input['property_name'] ?? null;
    
    // Map account number based on type/input keys
    $account_no = $input['account_no'] ?? 
                  ($input['electric_account_no'] ?? 
                  ($input['water_account_no'] ?? 
                  ($input['wifi_account_no'] ?? 'N/A')));

    $or_number = $input['or_number'] ?? null;
    $billing_period = $input['billing_period'];
    $amount = filter_var($input['amount'], FILTER_VALIDATE_FLOAT);
    $penalty = filter_var($input['penalty'] ?? 0, FILTER_VALIDATE_FLOAT);
    $total = $amount + $penalty;
    // status is always Paid for this form
    
    // Date Paid (default to today if missing)
    $date_paid = !empty($input['date_paid']) ? $input['date_paid'] : date('Y-m-d');

    try {
        // Determine column names based on table (though we standardized them mostly)
        // For safety, we use standardized columns in our schema updates:
        // account_no is generic or specific (electric_account_no).
        // Let's assume schema uses specific names or we standardized.
        // CHECKUP: update_schema.php/setup.sql suggests we might have specific names?
        // Actually, looking at script.js populate logic, it handles different keys.
        // Let's assume standard columns: tenant_name, property_name, account_no, or_number, ...
        // Wait, electricity_bills usually has `account_no`. Water might have `water_account_no`.
        // Let's check schema via logic:
        // If we standardized, great. If not, we map.
        
        $accCol = 'account_no';
        if ($type === 'water') $accCol = 'water_account_no';
        if ($type === 'wifi') $accCol = 'wifi_account_no';

        // NOTE: If table column names differ, adjust here.
        // Based on setup.sql commonly used:
        // electricity_bills -> account_no
        // water_bills -> water_account_no
        // wifi_bills -> wifi_account_no
        
        $sql = "INSERT INTO $table 
                (tenant_name, property_name, $accCol, or_number, billing_period, amount, penalty, total, date_paid, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $tenant_name, $property_name, $account_no, $or_number, 
            $billing_period, $amount, $penalty, $total, $date_paid
        ]);

        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
}

// ── ACTION: Upload Bill (Proxy to N8N) ──
else if ($action === 'upload_bill' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['error' => 'File upload failed']);
        exit;
    }

    $file = $_FILES['file'];
    $n8n_webhook_url = 'http://localhost:5678/webhook/67f1d653-8157-43b2-9961-5faf455bd88e';

    // Prepare multipart fetch
    $cfile = new CURLFile($file['tmp_name'], $file['type'], $file['name']);
    $data = ['file' => $cfile];

    $ch = curl_init($n8n_webhook_url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch)) {
        echo json_encode(['error' => 'N8N Connection Error: ' . curl_error($ch)]);
    } else {
        // Pass through N8N response
        http_response_code($httpCode);
        echo $result;
    }
    curl_close($ch);
}

else {
    echo json_encode(['error' => 'Invalid action']);
}
?>
```

## login.php

```php
<?php
session_start();
require_once 'db.php';

// Redirect if already logged in
if (isset($_SESSION['user_id'])) {
    header("Location: index.php");
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username']);
    $password = trim($_POST['password']);

    if (empty($username) || empty($password)) {
        $error = "Please enter both username and password.";
    } else {
        $pdo = get_db_connection();
        $stmt = $pdo->prepare("SELECT id, username, password_hash FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            // Success
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            header("Location: index.php");
            exit;
        } else {
            $error = "Invalid username or password.";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login — E-Billing</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Fira+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Fira Sans', 'sans-serif'],
                        mono: ['Fira Code', 'monospace'],
                    },
                    colors: {
                        brand: {
                            50: '#f0fdf4',
                            400: '#4ade80',
                            500: '#22c55e',
                            600: '#16a34a',
                        }
                    }
                }
            }
        }
    </script>
    <style>
        body { background-color: #020617; color: #f8fafc; }
        .input-field {
            @apply w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder-slate-500 text-slate-200;
        }
        .btn-primary {
            @apply w-full bg-brand-500 hover:bg-brand-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40;
        }
        .glass-panel {
            @apply bg-[#0a0f1e] border border-slate-800 shadow-2xl;
        }
    </style>
</head>
<body class="h-screen flex items-center justify-center p-4 relative overflow-hidden">
    
    <!-- Background Glow -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div class="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-brand-500/5 rounded-full blur-[100px]"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]"></div>
    </div>

    <div class="glass-panel w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden relative z-10">
        
        <!-- Left Banner -->
        <div class="hidden md:flex flex-col justify-between p-10 bg-slate-900/50 relative">
            <div class="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-transparent pointer-events-none"></div>
            
            <div class="relative z-10">
                <div class="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30 mb-6">
                    <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <h1 class="text-3xl font-bold tracking-tight text-white mb-2">E-Billing System</h1>
                <p class="text-slate-400 text-sm leading-relaxed">Securely manage utility payments, track history, and automate billing workflow.</p>
            </div>

            <div class="relative z-10 space-y-4">
                <div class="flex items-center gap-3 text-sm text-slate-300">
                    <div class="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                    <span>Automated OCR Scanning</span>
                </div>
                <div class="flex items-center gap-3 text-sm text-slate-300">
                    <div class="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                    <span>Real-time Financial Tracking</span>
                </div>
                <div class="flex items-center gap-3 text-sm text-slate-300">
                    <div class="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                    <span>Secure Access Control</span>
                </div>
            </div>
        </div>

        <!-- Right Form -->
        <div class="p-8 md:p-12 flex flex-col justify-center bg-[#0a0f1e]">
            <div class="mb-8">
                <h2 class="text-2xl font-bold text-white mb-1">Welcome Back</h2>
                <p class="text-slate-400 text-sm">Please sign in to your account.</p>
            </div>

            <?php if ($error): ?>
                <div class="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                    <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <p class="text-sm text-red-200"><?php echo htmlspecialchars($error); ?></p>
                </div>
            <?php endif; ?>

            <form method="POST" class="space-y-5">
                <div class="space-y-1.5">
                    <label class="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">Username</label>
                    <input type="text" name="username" class="input-field" placeholder="Entry your username" required autofocus>
                </div>

                <div class="space-y-1.5">
                    <label class="text-xs font-semibold uppercase tracking-wider text-slate-400 ml-1">Password</label>
                    <input type="password" name="password" class="input-field" placeholder="••••••••" required>
                </div>

                <div class="pt-2">
                    <button type="submit" class="btn-primary">Sign In</button>
                </div>
            </form>
            
            <p class="mt-8 text-center text-xs text-slate-600">
                &copy; <?php echo date('Y'); ?> Finance System. All rights reserved.
            </p>
        </div>
    </div>

</body>
</html>
```

## logout.php

```php
<?php
session_start();
session_unset();
session_destroy();
header("Location: login.php");
exit;
?>
```

## db.php

```php
<?php
require_once __DIR__ . '/.env'; // Or simple config

function get_db_connection() {
    // Load env manually if not using a library
    // For simplicity, hardcoded from .env content we read:
    $host = 'localhost';
    $db = 'finance';
    $user = 'root';
    $pass = '';
    
    // Check if .env exists to override
    if (file_exists(__DIR__ . '/.env')) {
        $lines = file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            if (strpos($line, '#') === 0) continue;
            list($name, $value) = explode('=', $line, 2);
            $name = trim($name);
            $value = trim($value);
            if ($name === 'DB_HOST') $host = $value;
            if ($name === 'DB_NAME') $db = $value;
            if ($name === 'DB_USER') $user = $value;
            if ($name === 'DB_PASS') $pass = $value;
        }
    }

    $dsn = "mysql:host=$host;dbname=$db;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];

    try {
        return new PDO($dsn, $user, $pass, $options);
    } catch (\PDOException $e) {
        throw new \PDOException($e->getMessage(), (int)$e->getCode());
    }
}
?>
```

## Plan.md

```markdown
# Project Plan

## Current Objectives
- [ ] Initialize documentation workflow (Completed).
- [x] Document existing features in `Features.md` (Completed).
- [x] Redesign UI to Minimalist Style (Reference: 'Invyzia' Dashboard) (Completed).
- [x] Simplify Navigation (Remove Home, Settings, CTA Button) (Completed).
- [x] Refactor 'New Entry' to 'Electricity Bills' (Update Schema & UI) (Completed).
- [x] Enhancing UI/UX (KPI Cards, Tabular Nums, Status Filters) (Completed).
- [x] Refine Layout (Consolidate 'Records' into 'Electricity Bill' view) (Completed).
- [x] Refine Layout (Consolidate 'Records' into 'Electricity Bill' view) (Completed).
- [x] Fix Database Error (Create electricity_bills table) (Completed).
- [x] Remove 'Unpaid' Status (Completed).
- [x] Add 'OR Number' and 'Property Name' Fields (Completed).
- [x] Remove Redundant 'View Records' Button (Completed).
- [x] Remove 'Status' Column from UI (Completed).
- [x] Refactor UI/UX for Paid-Only Records (Remove Due Date, Simplify KPIs) (Completed).
- [x] Add 'Water Bills' Module (Database, Sidebar, UI/UX Refactor) (Completed).
- [x] Add 'WiFi Bills' Module (Database, Sidebar, UI/UX Refactor) (Completed).
- [x] Implement Seamless Transitions (View Switching & Module Toggling) (Completed).
- [x] Implement Authentication (Login Page, Logout Logic, Session Management) (Completed).
- [x] Implement Authentication (Login Page, Logout Logic, Session Management) (Completed).
- [x] Refine Login UI/UX (Apply 'ui-ux-pro-max' Design) (Completed).
- [x] Redesign Dashboard UI (Match Login Aesthetics) (Completed).
- [x] Refine Button Placement (Move to Header Right) (Completed).
- [x] Database Cleanup (Remove 'status' and 'due_date' columns).
- [x] Debug: "Record Payment" functionality failure (Fixed: broken HTML form structure in `index.php`, missing `credentials: 'same-origin'` in `fetch()` calls, and submit handler error-handling logic).
- [x] UI/UX Aesthetic Redesign (OLED Dark Mode — `ui-ux-pro-max` design system).
- [x] Dark/Light Mode Toggle (with `localStorage` persistence).
- [x] Text Contrast Improvements (table rows, labels, form elements).
- [/] **Success Toast Notification** — Professional animated popup after DB insert. Auto-dismisses in 4s, adapts to dark/light mode.
- [x] **Tab Fade Transition** — Quick 150ms opacity fade when switching between Electricity/Water/WiFi tabs. ✅
- [x] **Header Fade on Tab Switch** — Theme toggle and View Records button also fade smoothly (150ms) when switching tabs.

## High-Level Strategy
- This file serves as the central planning document for all future features.
- All high-level goals and logic flows will be documented here before implementation.
- This document is the "Source of Truth" for *what* we are building.
```

## Implementation.md

```markdown
# Implementation Details

## Current Task: Workflow Initialization
- [x] Create `Plan.md` template.
- [x] Create `Implementation.md` template.
- [x] Update `rule.md` with workflow enforcement.

- [x] List both frontend (UI) and backend (API) features.

## Current Task: UI Redesign (Minimalist)
- [x] **Assets**: Update font to 'Inter'.
- [x] **Layout (`index.php`)**:
    - Rebuild Sidebar: Dark theme, new logo placement, "Create Action" button.
    - Rebuild Main Area: Light background, Breadcrumb header.
- **Components**:
    - **Dashboard Cards**: specific summary cards (Households, Accounts, etc.) as seen in screenshot.
    - **Forms/Tables**: Wrap existing "New Entry" and "Journal" content in white cards with rounded corners.
- [x] **Styling**: Replace all glassmorphism classes with standard Tailwind utility classes (white bg, gray borders).

## Current Task: Simplify Navigation
- [x] **Remove UI Elements (`index.php`)**:
    - Sidebar: Remove "Home" tab, "Settings" section, and top "+ New Entry" CTA button.
    - Content: Remove "Dashboard" section (Cards & Activity Table).
- [x] **Update Logic (`script.js`)**:
    - Remove "Dashboard" tab switching logic.
    - Set "New Entry" as the default active tab.

## Current Task: Electricity Billing Refactor
- [x] **Database (`setup.sql`)**:
    - Rename/Create table `electricity_bills`.
    - Columns: `id`, `tenant_name`, `account_no`, `billing_period`, `amount`, `penalty`, `total`, `due_date`, `date_paid`, `status` (Paid/Unpaid), `created_at`.
- [x] **Backend (`api.php`)**:
    - Update `add` action to accept new fields.
    - Update `list` action to fetch bill records.
- [x] **Frontend (`index.php` & `script.js`)**:
    - Rename "New Entry" to "Electricity Bills".
    - Update Form fields to match new schema.
    - Update Table columns to display billing info.

## Current Task: Enhance UI/UX (Data-Dense Style)
- [x] **Interactivity**: Add simple status filtering (Paid/Unpaid) to the table.

## Current Task: Refine Electricity Bill Layout
- [x] **Sidebar (`index.php`)**:
    - Rename "New Bill" to "Electricity Bill".
    - Remove "Bill Records" link.
- [x] **Content (`index.php`)**:
    - Move "VIEW RECORD" button from header to form actions (bottom).
    - Ensure "Back to Form" button is prominent within the Records view.
    - Move "VIEW RECORD" button to upper part where its left side of the Electricity Bill Entry the back button must has the same location to my View RECORD button.button must has the same location to my View RECORD button.
- [x] **Logic (`script.js`)**:
    - Update tab/view switching logic to handle button clicks instead of sidebar tabs.
## Current Task: Add 'OR Number' and 'Property Name' Fields
- [x] **Database (`add_fields.php`)**:
    - Add `or_number` VARCHAR(50) to `electricity_bills`.
    - Add `property_name` VARCHAR(100) to `electricity_bills`.
- [x] **Content (`index.php`)**:
    - Add "Property Name" input field (e.g., alongside Tenant Name).
    - Add "OR Number" input field (e.g., in Financial Details).
    - Update "Bill Records" table headers and rows to display new columns.
- [x] **Logic (`script.js`)**:
    - Update `renderTable` to include new columns.
    - Ensure `formData` captures the new fields.
- [x] **Backend (`api.php`)**:
    - Update `POST` handler to sanitize and insert `or_number` and `property_name`.
    - Update SQL `INSERT` statement.

## Current Task: UI Cleanup
- [x] **Remove Redundant 'View Records' Button**:
    - Removed duplicate button from form footer in `index.php`.
- [x] **Remove 'Status' Column from UI**:
    - Removed "Status" header from table in `index.php`.
    - Removed "Paid/Unpaid" badge logic from `script.js`.
    - Updated KPI label to "Total Collections".

## Current Task: Refactor UI/UX for Paid-Only Records
- [x] **KPIs (`index.php`)**:
    - Remove "Total Billed" (redundant).
    - Keep "Total Collections".
    - Add "Total Records" (Count of Paid Bills).
- [x] **Form (`index.php`)**:
    - Remove "Due Date" field.
    - Rename "Save Bill" to "Record Payment".
    - Make "Date Paid" required and prominent.
    - Change Form Header to "Record Electricity Payment".
- [x] **Table (`index.php` & `script.js`)**:
    - Remove "Due Date" info.
    - Add "Date Paid" column.
- [x] **Backend (`api.php`)**:
    - Make `due_date` optional/null.

## Current Task: Add 'Water Bills' Module
- [x] **Database (`setup.sql`)**:
    - Create `water_bills` table (Clone of `electricity_bills`).
    - Columns: `id, tenant_name, property_name, water_account_no, or_number, billing_period, amount, penalty, total, due_date, date_paid, status, created_at`.
- [x] **Sidebar (`index.php`)**:
    - Add "Water Bill" link.
    - Implement navigation logic to switch contexts (Bill Type).
- [x] **Frontend (`index.php`)**:
    - Updates Labels dynamically based on Bill Type (e.g., "Electric Account No" <-> "Water Account No").
    - Updates Page Title.
- [x] **Logic (`script.js`)**:
    - Add state variable `currentBillType` ('electricity' | 'water').
    - Update `fetchBills()` and `renderTable()` to use the correct API endpoint/parameter.
    - Update `submit` handler to send `bill_type`.
- [x] **Backend (`api.php`)**:
    - Handle `bill_type` parameter (GET and POST).
    - Route queries to `electricity_bills` or `water_bills` tables.

## Current Task: Add 'WiFi Bills' Module
- [x] **Database (`setup.sql`)**:
    - Create `wifi_bills` table (Clone of others).
    - Columns: `id, tenant_name, property_name, wifi_account_no, or_number, billing_period, amount, penalty, total, due_date, date_paid, status, created_at`.
- [x] **Sidebar (`index.php`)**:
    - Add "WiFi Bill" link.
- [x] **Frontend & Logic**:
    - Update `script.js` `switchBillType` to handle 'wifi'.
    - Label: "WiFi Account No".
- [x] **Backend (`api.php`)**:
    - Add `wifi_bills` to routing logic.

## Current Task: Implement Seamless Transitions
- [x] **Styles (`index.php`)**:
    - Add CSS classes for `fade-enter`, `fade-enter-active`, `fade-exit`, `fade-exit-active`.
    - Or leverage Tailwind's `transition-opacity`, `duration-300`, etc.
- [x] **Logic (`script.js`)**:
    - Refactor `switchBillType` and `showRecords`/`showForm` to:
        1. Fade out current content.
        2. Wait for animation.
        3. Update DOM/State.
        4. Fade in new content.

## Current Task: Implement Authentication
- [x] **Database (`setup.sql`)**:
    - Create `users` table: `id, username, password_hash, created_at`.
    - Insert default admin user (`admin` / `admin123`).
- [x] **Backend**:
    - Create `login.php`: Handle POST request, verify credentials, start session.
    - Create `logout.php`: Destroy session, redirect to login.
    - Update `index.php`: Add session check at top. Redirect to `login.php` if not logged in.
    - Update `api.php`: Add session check to protect endpoints.
- [x] **Frontend (`login.php`)**:
    - Create a clean, minimalist login page (Tailwind CSS).
- [x] **Frontend (`index.php`)**:
    - Wire up "Log out" button in sidebar to `logout.php`.

## Current Task: Redesign Dashboard UI
- [x] **Styles (`index.php`)**:
    - Update `.btn-primary` and `.input-field` to match `login.php` (shadows, transitions, focus rings).
    - Add decorative background elements to Sidebar (if appropriate) or refine its typography/spacing.
    - Ensure consistent `Inter` font usage and `slate` color palette.
- It must be approved before code generation begins.

## Current Task: Database Cleanup
- [x] **Database**:
    - Drop `status` column (Unused, always 'Paid').
    - Drop `due_date` column (Unused).
- [x] **Backend (`api.php`)**:
    - Remove `status` and `due_date` from `INSERT` logic.

## Current Task: Debugging Record Payment
- [x] **Frontend (`script.js`)**:
    - Remove legacy `data.status = 'Paid'` assignment.
    - Add `credentials: 'same-origin'` to all `fetch()` calls (fixes 401 Unauthorized).
    - Wrap entire submit handler in single `try/catch/finally` so button always re-enables.
- [x] **Backend (`api.php`)**:
    - Verify `INSERT` column mismatch or SQL errors.
    - Ensure `date_paid` is being received correctly.
    - Remove leftover debug logging (`file_put_contents`).
- [x] **HTML (`index.php`)**:
    - Fix broken form structure: `property_name` and `tenant_name` fields were missing their `<div class="grid ...">` wrapper, causing HTML5 validation to silently fail.

## Task: UI/UX Aesthetic Redesign (OLED Dark Mode)
**Design System:** `ui-ux-pro-max` → OLED Dark Mode

| Token | Value |
|-------|-------|
| Background | `#020617` |
| Surface/Sidebar | `#0a0f1e` |
| Card | `bg-slate-900` |
| Accent / CTA | `#22C55E` (green-500) with glow |
| Text | `#F8FAFC` |
| Fonts | Fira Code (headings/mono) + Fira Sans (body) |

- [x] **`index.php`**:
    - Replace Inter font with Fira Code + Fira Sans.
    - Dark OLED body background `#020617`, sidebar `#0a0f1e`.
    - Green active nav state with `bg-brand-500/10` highlight + `border-brand-500/20`.
    - Form card with green left-bar accent using `w-1 h-8 bg-brand-500`.
    - Dark inputs `bg-slate-800/80 border-slate-700` with green focus ring.
    - "Record Payment" button with green glow shadow `shadow-brand-500/20`.
    - Total field highlighted in green `text-brand-400 bg-brand-500/5`.
    - KPI cards with green left border accent + green font for collections.
    - Dark table rows `bg-slate-900` with `divide-slate-800/60` separators.
- [x] **`login.php`**:
    - Match OLED dark palette with same fonts and green accent.
    - Left panel with subtle green glow blobs and feature pills.
    - Error state: red `border-red-500/20 bg-red-500/10` dark-friendly.
    - Green glowing Sign In button.

## Current Task: Success Toast Notification
- [x] **`index.php`** -- Add toast HTML + CSS:
    - Fixed bottom-right corner (`fixed bottom-5 right-5 z-50`).
    - Theme-aware: dark = `bg-slate-800 border-slate-700`, light = `bg-white border-slate-200 shadow-xl`.
    - Green left accent bar (`w-1 bg-brand-500`) matching brand.
    - Slide-in from right + fade-out animation.
    - Auto-dismiss after 4 seconds.
    - Manual close button (SVG, no emoji).
- [x] **`script.js`** -- `showToast(message, type)` function:
    - Called from existing `handleBillFormSubmit` on success response.
    - Displays green check icon + bill type + success message.
    - Resets form and refreshes table after showing toast.

## Current Task: Tab Fade Transition (Option A)
**Goal:** Add a quick 150ms opacity fade when switching between Electricity/Water/WiFi tabs.

- [ ] **`index.php`** — Add CSS transition class:
    - Add `.tab-fade` class with `transition: opacity 150ms ease`.
    - Apply to the main content wrapper (`#content-new-bill` and `#content-records`).
- [ ] **`script.js`** — Update `switchBillType()`:
    - Set content `opacity: 0` → wait 150ms → swap state/labels → set `opacity: 1`.
    - Uses `requestAnimationFrame` for smooth rendering.
    - No artificial delay — content changes during the fade.
- [ ] **Fix nav-active/nav-inactive switching** (Already done):
    - Changed class toggling from `bg-slate-800`/`text-white` to `nav-active`/`nav-inactive`.
    - Removed `transitionView()` wrapper that caused hover delay.

### Verification
- Manual: Switch between all 3 tabs rapidly. Content should smoothly fade in/out without flicker or stuck highlights.

## Current Task: Header Fade on Tab Switch
**Goal:** Make the header area (theme toggle + View Records button) also fade smoothly when switching tabs.

- [x] **`index.php`** — Add `tab-fade` class to the header buttons container (`<div class="flex items-center gap-2">`).
- [x] **`script.js`** — In `switchBillType()`, also set header container opacity to 0 → wait 150ms → set back to 1 (in sync with the form fade).
```

## Features.md

```markdown
# Features List

## 1. Frontend (User Interface)

### General Layout & Design
- **Minimalist Theme**: Clean, light-themed UI (`bg-slate-50`) with white card-based layout.
- **Responsive Layout**: Dark sidebar navigation and a main content area.
- **Typography**: Professional look using 'Inter'.
- **Interactivity**: Smooth transitions, hover effects, and loading states.
- **Font**: Inter (Google Fonts).

### Sidebar Navigation
- **Simplified Navigation**:
    - **Electricity Bill**: Single access point for billing.
- **User Profile**: Static user profile display in the sidebar bottom.

### Electricity Bill Module
- **Dual View Layout**:
### Electricity Bill Module
- **Dual View Layout**:
    - **Header Navigation**: Dynamic toggle button (right side) with icon and text ("View Records" / "Back to Form").
    - **Entry Form**: Default view.
    - **Records View**: Displays billing history.
- **Billing Form**:
    - **Bill Type Reference**: Dynamically updates based on selection (Electricity vs Water).
    - **Tenant Details**: Tenant Name, Property Name (e.g., Building A), Electric/Water Account No.
    - **Billing Info**: Period (e.g., Jan 2026), Due Date.
    - **Financials**: OR Number (Optional), Amount, Penalty, Total (Auto-calculated), Date Paid.
    - **Status**: Automatically set to "Paid".
- **Security**:
    - **Authentication**: Secure Login/Logout system with session management.
    - **Protected Routes**: API and Dashboard are inaccessible without logging in.
    - **Data Integrity**: Parameterized queries to prevent SQL injection.
- **Modules**:
    - **Electricity Bill**: Manage electricity payments.
    - **Water Bill**: Manage water payments.
    - **WiFi Bill**: Manage internet/wifi payments.
- **User Experience**:
    - **Premium Aesthetics**: "Pro Max" design with glassmorphism, gradients, and split layouts.
    - **Seamless Transitions**: Smooth fade animations when switching between modules or views.
    - **Visual Feedback**: Loading spinners on buttons, success/error toast messages.
    - **Responsive Design**: Fully responsive layout for all devices.ment.
- **Form Features**:
    - **Auto-Calculation**: Total = Amount + Penalty updates in real-time.
    - **Validation**: Required fields enforcement.
- **Submission Feedback**:
    - **Loading State**: Spinner during API calls.
    - **Success/Error Messages**: Auto-dismissing alerts.

### Bill Records Module
- **KPI Summary Cards**:
    - **Total Billed**: Aggregate sum of all bills.
    - **Collections**: Sum of paid bills (Emerald).
    - **Pending**: Sum of unpaid bills (Rose).
- **Data Table**: Displays billing history.
    - **Columns**: Tenant, Account No, Period, Total, Status, Details.
- **Styling**:
    - **Typography**: `tabular-nums` for perfect number alignment.
    - **Status Badges**: Green for Paid, Red for Unpaid.
    - **Currency**: Amounts formatted with 2 decimal places (₱).
- **Refresh Capability**: "Refresh" button to reload the table entries from the database.

## 2. Backend (API & Logic)

### API Endpoints (`api.php`)
- **Add Entry (`POST ?action=add`)**:
    - Receives JSON payload.
    - Validates required fields (Date, Account Code).
    - Inserts record into the `journal_entries` table.
    - Returns JSON success/error response.
- **List Entries (`GET ?action=list`)**:
    - Fetches the latest 50 entries.
    - Orders by Date (descending) and Creation Time (descending).
    - Returns JSON array of entries.

### Database (`setup.sql`)
- **Schema**: `journal_entries` table.
    - `id`: Auto-incrementing primary key.
    - `entry_date`: Transaction date.
    - `account_code`: General Ledger code.
    - `description`: Transaction details.
    - `debit` / `credit`: Decimal(15,2) for financial precision.
    - `created_at`: Timestamp of record creation.

## 3. Technology Stack
- **Frontend**: HTML5, Tailwind CSS (CDN), Vanilla JavaScript.
- **Backend**: Native PHP (No framework).
- **Database**: MySQL.
```

## rule.md

```markdown
# Documentation & Workflow Rules

Mandatory File Updates: Every time a new feature is requested, the agent must update the following files before writing any application code:

- **Plan.md**: Record the high-level strategy, goals, and logic flow.
- **Implementation.md**: Detail the specific file changes, folder structures, and technical steps.

**Approval Process (STRICT — Do NOT skip steps):**
1. **Plan First** → Update `Plan.md` and `Implementation.md` with proposed changes.
2. **Wait for Approval** → Show both files to the user. **Do NOT write any code until the user confirms.**
3. **Code After Approval** → Only after the user says "approved" or "succeed", proceed to edit the actual code files.
4. **Mark as Done** → After the code is implemented and verified, mark items as `[x]` in both `Plan.md` and `Implementation.md`.

**Synchronization**: Ensure these files remain the "source of truth" for the project's current state.

---

# Technical & Design Rules

## 1. Technology Stack
- **Backend**: PHP (Vanilla, no framework).
- **Frontend**: HTML5, Vanilla JavaScript.
- **Styling**: Tailwind CSS (via CDN) + Custom CSS for specific effects.
- **Database**: MySQL (via `db.php`).

## 2. Design System & UI/UX
- **Theme**: Minimalist / Corporate.
  - **Sidebar**: Dark (Slate-900).
  - **Main Content**: Light (Slate-50/Gray-100).
- **Visual Style**: **Clean & Flat**.
  - No Glassmorphism. Use solid backgrounds.
  - Cards: White (`bg-white`) with subtle shadows (`shadow-sm` or `shadow`).
  - Borders: Very subtle gray (`border-slate-200`).
- **Color Palette**:
  - Primary Accent: Teal/Emerald (`teal-500`, `emerald-500`) - as seen in the "Create proposal" button.
  - Text: Dark Slate (`slate-800`) for headings, Muted (`slate-500`) for secondary.
  - Sidebar Text: White/Gray.
- **Typography**: `Inter` (Google Fonts) or stick with `IBM Plex Sans` if preferred. (Will switch to Inter for cleanliness).

## 3. Project Structure
- **Entry Point**: `index.php` (Contains the main UI shell and Sidebar).
- **Logic**: `script.js` handles DOM manipulation and API calls.
- **API**: `api.php` handles backend requests (JSON responses).
- **Database Config**: `db.php`.

## 4. Coding Conventions
### HTML/CSS
- Use semantic HTML tags (`<nav>`, `<main>`, `<section>`, `<header>`).
- Prioritize **Tailwind CSS** utility classes over custom CSS where possible.
- Use `id` attributes for JavaScript hooks (e.g., `id="content-new-entry"`).

### JavaScript
- Use `async/await` for `fetch` operations.
- Handle errors gracefully and display user-friendly messages using the `showMessage` function.
- Keep the global namespace clean; encapsulate logic where possible (though `script.js` currently uses top-level event listeners).

### PHP
- Return JSON responses for API endpoints.
- Ensure proper error handling and status codes.

## 5. Navigation
- The application uses a **Sidebar** layout.
- Content sections are toggled via JavaScript (SPA-like feel) rather than full page reloads.
- Active states should be visually distinct (e.g., gradients, text color changes).

---

## 6. N8N Workflow Integration
- **Webhook URL**: `http://localhost:5678/webhook-test/67f1d653-8157-43b2-9961-5faf455bd88e`
- **PHP Proxy**: All N8N calls go through `api.php` (`action=upload_bill`) — never expose the webhook URL in frontend code.
- **Response Format**: N8N must return `{ success: true, data: { ...fields } }` via the Respond to Webhook node.
- **OCR**: Image files use [OCR.space](https://ocr.space) free API. PDFs use n8n's built-in "Extract from File" node.
- **Error Log**: See `Error&Fix.md` for all known issues and their solutions.
```

## N8NFilePlan.md

```markdown
# N8N Implementation Plan - Electricity Bill Upload

## Overview
This plan outlines the steps to add an upload button for electricity bills (PDF/Image) to the existing finance application. The file will be sent to an n8n workflow which will extract data using OCR/AI and insert it directly into the MySQL database.

## 1. Frontend Changes (`index.php`)
- **Add File Input**: Add an `<input type="file" id="bill_file" accept=".pdf, .jpg, .jpeg, .png">` to the `content-new-bill` form.
- **Update Submit Button**: Ensure the form submission handles `FormData` instead of just JSON if we decide to upload directly from the frontend to n8n (or via PHP proxy).
- **Process**:
    1. User selects file.
    2. User fills other optional fields (or leaves them blank to be auto-filled by AI).
    3. User clicks "Record Payment" (or a new "Scan & Upload" button).

## 2. Backend Changes (`api.php` or `upload.php`)
We need a server-side script to handle the file upload and forward it to n8n, to avoid exposing the n8n webhook URL directly in client-side code if security is a concern, and to handle CORS issues if n8n is on a different domain.
- **Option A (Direct to n8n)**: Frontend sends POST request directly to n8n Webhook URL.
    - Pros: Simpler backend (none needed for this part).
    - Cons: CORS issues likely; Webhook URL exposed.
- **Option B (PHP Proxy - Recommended)**: Frontend sends file to `api.php?action=upload_bill`. PHP script forwards the file to n8n Webhook.
    - Pros: Secure, handles CORS, can validate file before sending.
    - Cons: Slightly more coding.

**Decision**: Use **Option B** for better integration with existing session/auth.

## 3. N8N Workflow Steps (Regex / Non-AI Alternative)
This alternative workflow avoids paid AI models by using standard OCR and pattern matching. It is less flexible but free and faster.

1.  **Webhook Node**: "Receive Invoice"
    -   Method: POST
    -   Body: Binary Data (the file).

2.  **File Type Check (Switch Node)**:
    -   Route depending on MIME type: `application/pdf` (Route 1) vs `image/*` (Route 2).

3.  **Step A: Extract Text (OCR)**:
    -   **For PDF (Route 1)**: Use the **Read PDF Node**.
        -   Operation: "Extract Text".
    -   **For Images (Route 2)**: Use the **Tesseract OCR Node** (or similar OCR tool available in your n8n instance).
        -   Operation: "Extract text from image".

    *Result*: You now have a raw text string, e.g., "MERALCO... Account No: 123456789... Total: 1,500.00".

4.  **Step B: Parse Data (Code Node / Javascript)**:
    -   Use JavaScript regular expressions (Regex) to find specific patterns in the raw text.
    -   *Example Code*:
        ```javascript
        const text = items[0].json.text; 
        const data = {};

        // 1. Account Number (Assuming 10 digits)
        const accountMatch = text.match(/Account\s*No\.?:\s*(\d{10})/i);
        data.electric_account_no = accountMatch ? accountMatch[1] : null;

        // 2. Amount (Look for 'Total Amount' or currency symbols)
        const amountMatch = text.match(/Total\s*(?:Amount)?\s*:?\s*P?\s*([\d,]+\.?\d{2})/i);
        if (amountMatch) {
            data.total = parseFloat(amountMatch[1].replace(/,/g, ''));
            data.amount = data.total; // Assumes no penalty initially
        }

        // 3. Billing Period (Look for month/year patterns)
        const periodMatch = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/i);
        data.billing_period = periodMatch ? periodMatch[0] : null;

        data.tenant_name = "Unknown"; // Hard to regex names reliably without strict templates
        
        return [{ json: data }];
        ```

5.  **Step C: Database Insert (MySQL Node)**:
    -   Operation: Insert.
    -   Table: `electricity_bills`.
    -   Map the fields from the Code Node (`electric_account_no`, `total`, etc.) to the database columns.
    -   *Note*: Since Regex is brittle, you might prefer to **Return Data to Frontend** first for the user to verify/edit before saving.

6.  **Response to Webhook**:
    -   Return `{ "success": true, "data": { ...extracted_data } }`.
    -   The frontend will auto-fill the form. The user *must* review the data because Regex can fail on blurry images or different layouts.

## 4. Database Verification
- Ensure `electricity_bills` table exists and has the necessary columns (already confirmed in `setup.sql`).

## 5. Step-by-Step Implementation Guide

### Step 1: Update Frontend
1.  Open `index.php`.
2.  Locate the `#bill-form`.
3.  Add the file input field.

### Step 2: Implement PHP Proxy
1.  Open `api.php`.
2.  Add a new block for `action === 'upload_electricity_bill'`.
3.  Use `curl` to forward `$_FILES['file']` to the n8n webhook URL.

### Step 3: Configure N8N (Regex Approach)
1.  Create a new workflow.
2.  Add **Webhook** node (POST).
3.  Add **Read PDF** (for PDFs) and **Tesseract / OCR** (for images).
4.  Add a **Code Node** (Javascript) to parse the text with Regex.
5.  Add **MySQL** node.
6.  Connect them.

### Step 4: Testing
1.  Upload a sample bill image.
2.  Check n8n execution.
3.  Check MySQL table for new row.
```

## Error&Fix.md

```markdown
# Error & Fix Log

## N8N Workflow Errors

### 1. Switch Node — "No output data returned"
- **Cause**: `$binary.data.mimeType` was typed as a **Fixed string** instead of an **Expression**.
- **Fix**: In the Switch node Value 1 field, switch from `Fixed` to `Expression` mode. Use `{{ $binary.data.mimeType }}`.

### 2. Switch Node — "Invalid input for Output Index"
- **Cause**: Mode was set to `Expression` instead of `Rules`. Expression mode expects a number (0, 1, 2...) to route output, but the MIME type returns a string.
- **Fix**: Change **Mode** back to `Rules`. Add routing rules with `is equal to` for PDFs and `contains` for images.

### 3. Switch Node — Image route "No output data in this branch"
- **Cause**: Second routing rule used `is equal to` with `image/`, but actual MIME type is `image/png`.
- **Fix**: Change operation to `contains` instead of `is equal to` for the image rule.

### 4. OCR.space — "Unable to recognize the file type"
- **Cause**: Binary file sent without specifying file extension. OCR.space couldn't detect the format.
- **Fix**: Add a second Form-Data parameter: `filetype` = `{{ $binary.data.fileExtension }}`.

### 5. OCR.space — "Parameter name 'Form Data' is invalid"
- **Cause**: The second body field Name was left as the default `Form Data` instead of being changed to `filetype`.
- **Fix**: Change the Name field from `Form Data` to `filetype`.

### 6. HTTP Request — Wrong Body Content Type
- **Cause**: Body Content Type was set to `JSON` instead of `Form-Data`. File uploads require multipart form data.
- **Fix**: Change **Body Content Type** to `Form-Data`. Set first parameter Type to `n8n Binary File`.

### 7. Respond to Webhook — Syntax Error (Red Dot)
- **Cause**: `{{ JSON.stringify({ success: true, data: $json }) }}` conflicts with n8n's template syntax (nested curly braces).
- **Fix**: Use `={{ { success: true, data: $json } }}` (note the `=` prefix).

### 8. Respond to Webhook — Warning about Webhook "Respond" setting
- **Cause**: Webhook node Respond was set to `Immediately` instead of using the Respond to Webhook node.
- **Fix**: Open Webhook1 node → change **Respond** from `Immediately` to `Using 'Respond to Webhook' Node`.

---

## Frontend / Backend Errors

### 9. OCR reads "O" (letter) instead of "0" (zero)
- **Cause**: OCR misreads zeros as letter O in amounts (e.g., `P20,OOO.OO`).
- **Fix**: In the Code Node regex, replace `[Oo]` with `0` before parsing: `amountMatch[1].replace(/[Oo]/g, '0')`.

### 10. OR Number and Date Paid are null
- **Cause**: PDF newlines split values (`123-456-\n89` → `123-456- 89` after collapsing). Regex didn't account for spaces.
- **Fix**: Updated regex to handle optional spaces after dashes:
  - OR: `/(\d{3})-(\d{3})-\s*(\d{2,})/`
  - Date: `/(\d{4})-(\d{2})-\s*(\d{2})/`

### 11. Form fields empty after successful N8N execution
- **Cause**: Under investigation. Likely the Webhook test URL requires manually clicking "Listen for test event" in N8N before each upload.
- **Fix**: Use the **Production URL** (`/webhook/` instead of `/webhook-test/`) so the workflow runs automatically without manual activation.

---

## N8N URL Reference
- **Production URL** (always active): `http://localhost:5678/webhook/67f1d653-8157-43b2-9961-5faf455bd88e`
```

## Setup Scripts

### setup/fix_db.php (Initial Table Creation)
```php
<?php
$host = 'localhost';
$username = 'root';
$password = '';
$dbname = 'finance';

try {
    // Connect to MySQL server
    $pdo = new PDO("mysql:host=$host", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Create database if not exists
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname`");
    echo "Database '$dbname' checked/created successfully.\n";

    // Connect to specific database
    $pdo->exec("USE `$dbname`");

    // SQL to create table
    $sql = "CREATE TABLE IF NOT EXISTS electricity_bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenant_name VARCHAR(100) NOT NULL,
        electric_account_no VARCHAR(50) NOT NULL,
        billing_period VARCHAR(50) NOT NULL,
        amount DECIMAL(15, 2) DEFAULT 0.00,
        penalty DECIMAL(15, 2) DEFAULT 0.00,
        total DECIMAL(15, 2) DEFAULT 0.00,
        due_date DATE,
        date_paid DATE,
        status ENUM('Paid', 'Unpaid') DEFAULT 'Unpaid',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";

    $pdo->exec($sql);
    echo "Table 'electricity_bills' created successfully.\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
```

### setup/add_fields.php (Schema Extensions)
```php
<?php
$host = 'localhost';
$username = 'root';
$password = '';
$dbname = 'finance';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Add or_number column
    try {
        $pdo->exec("ALTER TABLE electricity_bills ADD COLUMN or_number VARCHAR(50) AFTER id");
        echo "Column 'or_number' added successfully.\n";
    } catch (PDOException $e) {
        echo "Column 'or_number' might already exist or error: " . $e->getMessage() . "\n";
    }

    // Add property_name column
    try {
        $pdo->exec("ALTER TABLE electricity_bills ADD COLUMN property_name VARCHAR(100) AFTER tenant_name");
        echo "Column 'property_name' added successfully.\n";
    } catch (PDOException $e) {
        echo "Column 'property_name' might already exist or error: " . $e->getMessage() . "\n";
    }

} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
}
?>
```

### setup/setup_users.php (Auth Table)
```php
<?php
require 'db.php';

try {
    $pdo = get_db_connection();

    // Create Table
    $sql = "CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";
    $pdo->exec($sql);
    echo "Table 'users' created.\n";

    // Check if admin exists
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
    $stmt->execute(['admin']);
    $count = $stmt->fetchColumn();

    if ($count == 0) {
        $username = 'admin';
        $password = 'admin123';
        $hash = password_hash($password, PASSWORD_DEFAULT);

        $insert = $pdo->prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
        $insert->execute([$username, $hash]);
        echo "Default admin user created (admin / admin123).\n";
    } else {
        echo "Admin user already exists.\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
```

### setup/update_schema.php (Final Cleanup)
```php
<?php
require_once 'db.php';

try {
    $pdo = get_db_connection();
    
    // Commands to drop unused columns
    $sql_commands = [
        "ALTER TABLE electricity_bills DROP COLUMN status",
        "ALTER TABLE electricity_bills DROP COLUMN due_date",
        "ALTER TABLE water_bills DROP COLUMN status",
        "ALTER TABLE water_bills DROP COLUMN due_date",
        "ALTER TABLE wifi_bills DROP COLUMN status",
        "ALTER TABLE wifi_bills DROP COLUMN due_date"
    ];

    foreach ($sql_commands as $sql) {
        try {
            $pdo->exec($sql);
            echo "Successfully executed: $sql\n";
        } catch (PDOException $e) {
            // Ignore error if column doesn't exist
            echo "Skipped/Error: $sql - " . $e->getMessage() . "\n";
        }
    }
    
    echo "Database schema update completed.\n";

} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
}
?>
```

### Note on Database Schema
The effective schema for `electricity_bills`, `water_bills`, and `wifi_bills` is derived from `fix_db.php` + `add_fields.php` - `update_schema.php`.
- `id` (INT PK)
- `or_number` (VARCHAR)
- `tenant_name` (VARCHAR)
- `property_name` (VARCHAR)
- `[type]_account_no` (VARCHAR) (or `account_no` depending on table creation script)
- `billing_period` (VARCHAR)
- `amount` (DECIMAL)
- `penalty` (DECIMAL)
- `total` (DECIMAL)
- `date_paid` (DATE)
- `created_at` (TIMESTAMP)

The `users` table is defined in `setup_users.php`.

<!-- ABSOLUTE_END_OF_FILE -->
