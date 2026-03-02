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

### 12. Database "Connection error." in Records Table
- **Cause**: Incorrect placeholder credentials (`DataBaseUser`) in the `.env` file for a local XAMPP setup, overriding the fallback `root` connection.
- **Fix**: Replaced `.env` file values with standard XAMPP defaults (`DB_USER=root`, `DB_PASS=`).

### 13. "Date Paid" field persistently auto-filling with today's date
- **Cause**: `script.js` was automatically assigning `new Date()` whenever `populateBillForm` or the submit handler ran, negating the `form.reset()` blank state when testing form persistence.
- **Fix**: Removed the auto-fill code block inside `populateBillForm` and explicitly forced `datePaidField.value = ''` and `datePaidField.valueAsDate = null` during the `switchBillType` tab routing.

### 14. Sidebar navigation items stretching and changing to gray text on click
- **Cause**: The `switchBillType` JavaScript function was completely replacing the CSS class string on click. It altered the padding (`py-4` instead of `py-3.5`), added borders that caused layout padding shifts, and hardcoded `text-slate-600` colors instead of using abstracted CSS classes.
- **Fix**: Abstracted the styles into `.nav-active` and `.nav-inactive` CSS classes within the `<style>` block of `index.php` to maintain strict dimension boundaries. Refactored JS to simply toggle these classes via `classList.add()` and `classList.remove()`.

### 15. Form labels and table headers difficult to read
- **Cause**: Text labels were universally styled as very small (`text-xs`), uppercase, and lightweight (`text-[var(--text-secondary)]`).
- **Fix**: Refactored labels universally mapped to standard Sentence Case formatting, slightly larger size (`text-sm`), bold weight, and solid black high-contrast color (`text-slate-900`/`dark:text-white`) across `index.php` and `login.php`.

### 16. Exported CSV "Date Paid" displayed as `########` in Excel
- **Cause**: Standard CSV structure passed raw date strings and zero-padded account numbers. When dropping trailing spaces, Excel aggressively auto-reformatted these as dates/numbers in columns too narrow to display them (`########`) or stripped leading zeros off OR Numbers.
- **Fix**: Updated `exportToExcel()` JavaScript logic to wrap dynamic text values (Account No, OR Number, Billing Period, Date Paid) in `="value"` format. This syntax forces Microsoft Excel natively to read the output as raw text, overriding auto-formatting bugs while still opening effortlessly as a `.csv`.

### 17. Date picker accessibility breaks n8n Date processing
- **Cause**: Swapping `type="date"` inputs out for `type="text"` fields with a `YYYY-MM-DD` placeholder (for senior usability) resulted in n8n automations failing to push data payload dates because the text field format broke the strict Date object schema required by webhook endpoints.
- **Fix**: Reverted input logic to proper HTML5 `type="date"` and `type="month"` fields to strictly enforce database schema bindings. Re-engineered senior accessibility by targeting the native browser shadow DOM (`::-webkit-calendar-picker-indicator`), massively magnifying the clickable calendar icon `padding` to mathematically increase mouse/finger touch target area by 400% with CSS.

---

## N8N URL Reference
- **Production URL** (always active): `http://localhost:5678/webhook/67f1d653-8157-43b2-9961-5faf455bd88e`
