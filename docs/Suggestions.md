 Project Improvement Suggestions

> Based on project review rating: **78 / 100**
> Goal: Reach **90+**

---

## 🔴 High Priority (Critical Gaps)

### 1. Complete iOS On-Device QA
- [ ] Test login → session → page load on iPhone (Safari)
- [ ] Upload a bill photo and verify auto-population
- [ ] Test Save/Update for Water, WiFi, Electricity, Association modules
- [ ] Verify records sync between iOS and PC

**Why:** iOS compatibility code was written but never verified on a real device.

---

### 2. Run SQL Migrations Live
- [ ] Start XAMPP MySQL
- [ ] Run `php setup\run_migrations.php`
- [ ] Confirm `schema_migrations` table is populated
- [ ] Verify all `property_billing_records` columns exist

**Why:** Migration system is in place but was blocked by MySQL being unreachable. This is an open risk.

---

### 3. Add React Error Boundary
- [ ] Create `frontend/src/components/ErrorBoundary.jsx`
- [ ] Wrap app root in `App.jsx` with the error boundary
- [ ] Show a friendly fallback UI on runtime crash

**Why:** Any unhandled React crash produces a blank white screen with no guidance.

---

## 🟡 Medium Priority

### 4. Clean Up Root `script.js`
- [ ] Audit whether `script.js` (22KB) is still used anywhere
- [ ] Delete it if unused, or document its role if still active

**Why:** Legacy file outside the React app creates confusion.

---

### 5. Add Integration Tests
- [ ] Test: Create a water bill → verify it appears in Records
- [ ] Test: Edit a March record → verify February is unchanged
- [ ] Add to `frontend/` Vitest suite

**Why:** Current tests are smoke-only. The most critical business logic (month-scoped edits) has no automated safety net.

---

### 6. Update `Features.md`
- [ ] Replace references to "HTML5, Tailwind CSS, Vanilla JavaScript"
- [ ] Reflect current stack: React, Vite, PHP, MySQL

**Why:** Misleads any future developer onboarding to the project.

---

## 🟢 Nice to Have (Future Enhancements)

### 7. Dashboard / KPI Summary Page
- [ ] Add a home dashboard route (`/dashboard`)
- [ ] Show: Total Billed This Month, Pending Collections, Recent Activity
- [ ] Link from sidebar as default landing page

**Why:** Users currently land directly on a bill form. A summary view makes the app feel complete as a finance tool.

---

### 8. Role-Based Access Control
- [ ] Add `role` column to users table (`admin`, `readonly`)
- [ ] Restrict add/edit/delete actions based on role
- [ ] Show role badge in sidebar user panel

**Why:** Makes the app usable in a real property management office with multiple staff.

---

### 9. Audit Log / Activity History
- [ ] Create `action_log` table (`user`, `action`, `target`, `timestamp`)
- [ ] Log all bill create/update/delete events
- [ ] Add a simple "Activity Log" view in the UI

**Why:** Critical for financial accountability — track who changed what and when.

---

## Priority Summary

| Priority | Suggestion | Effort | Impact |
|---|---|---|---|
| 🔴 Critical | iOS on-device QA | Low | High |
| 🔴 Critical | Run SQL migrations | Low | High |
| 🔴 Critical | React ErrorBoundary | Low | Medium |
| 🟡 Medium | Clean up `script.js` | Low | Medium |
| 🟡 Medium | Integration tests | Medium | High |
| 🟡 Medium | Update `Features.md` | Very Low | Low |
| 🟢 Nice | Dashboard KPI page | High | High |
| 🟢 Nice | Role-based access | High | Medium |
| 🟢 Nice | Audit log | Medium | High |
