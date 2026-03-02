Project Flow (Current Implementation)

Core structure
You have one backend table driving both Property Records and Bills: property_billing_records.
Frontend routes are protected and split into:
Records: App.jsx (line 100)
Property Records: App.jsx (line 108)
Bills modules (wifi, water, electricity, association): App.jsx (line 68)
Sidebar bill order is now: WiFi -> Water -> Electricity -> Association: AppLayout.jsx (line 120)
Create flow: Property Records
Form state starts empty (dd, property, unit_owner, classification, deposit, rent): PropertyRecordsPage.jsx (line 29)
Single main button behavior:
Create mode = Save
Edit mode = Update
Same handler path: PropertyRecordsPage.jsx (line 389), PropertyRecordsPage.jsx (line 598)
Clicking Save opens confirm modal (Save Property Record): PropertyRecordsPage.jsx (line 534)
On confirm, saveRecord() calls createPropertyRecord(...): PropertyRecordsPage.jsx (line 309), api.js (line 126)
Backend property_record_create validates DD or Property Name is required, then upserts into property_billing_records: api.php (line 1106), api.php (line 1117), api.php (line 319)
After success, form resets, draft/context is cleared, and you stay on /property-records: PropertyRecordsPage.jsx (line 313)
Edit/Update flow: Property Records
Enter edit from Property Records table Edit button: PropertyRecordsPage.jsx (line 700)
Or from Records module Edit (cross-module edit context): RecordsPage.jsx (line 179)
Update opens confirm modal (Update Property Record): PropertyRecordsPage.jsx (line 537)
Backend property_record_update updates all linked rows by old dd + property identity, so changes sync across WiFi/Water/Electricity/Association rows: api.php (line 1178), api.php (line 1225), api.php (line 1247)
Delete flow: Property Records
Delete button opens confirm modal (Delete Property Record): PropertyRecordsPage.jsx (line 488), PropertyRecordsPage.jsx (line 540)
Backend does soft-delete by setting is_hidden = 1 for linked identity rows (does not hard delete): api.php (line 1255), api.php (line 1297)
Create flow: Bills
Each bill page uses the same component with mode (wifi/water/electricity/association): WifiBillsPage.jsx (line 3)
Bills form state contains all fields for all modules in one object: PaymentFormPage.jsx (line 24)
You now have one main action button:
Create mode = Save
Edit mode = Update Record
UI at header: PaymentFormPage.jsx (line 1258)
Selecting Property / DD in Create Mode now keeps bill fields blank and sets only dd/property: PaymentFormPage.jsx (line 845)
Submit opens confirmation modal (Save Record / Update Record): PaymentFormPage.jsx (line 1047), PaymentFormPage.jsx (line 1132)
On confirm, saveBill() calls:
createBill when create mode
updateBill when edit mode
Decision point: PaymentFormPage.jsx (line 925)
Backend save/update rules for Bills
Create (action=add):
Requires dd and billing_period
Rejects duplicate monthly identity (dd + property + billing_period)
Inserts full record, then syncs property fields via upsert_property_record_from_bill
Code: api.php (line 512), api.php (line 543), api.php (line 548), api.php (line 595)
Update (action=bill_update):
Requires id, dd, billing_period
Uses target lock (target_dd/property/billing_period/bill_type) to avoid wrong-row updates
Returns Bill record not found... if identity changed/missing
Code: api.php (line 606), api.php (line 637), api.php (line 744)
Records module (DGV-like table)
Loads bill rows from API and supports row select/edit/export: RecordsPage.jsx (line 102)
Edit from Records writes RECORDS_EDIT_CONTEXT + global edit mode then routes to Property Records: RecordsPage.jsx (line 229)
Billing Period is shown as last table column, but excluded from export CSV: RecordsPage.jsx (line 19), RecordsPage.jsx (line 66)
Navigation and mode handoff
Property Records Next goes bill flow order: WiFi -> Water -> Electricity -> Association: PropertyRecordsPage.jsx (line 48), PropertyRecordsPage.jsx (line 431)
Bills final step shows Back to Property Records: PaymentFormPage.jsx (line 373), PaymentFormPage.jsx (line 1410)
When moving inside /bills/*, navigation is seamless and does not trigger unsaved prompt: PaymentFormPage.jsx (line 1103)
Popup messages (exact behavior)
ConfirmDialog component
Close by backdrop click or Esc (when not busy)
Buttons: cancel + confirm (+ optional secondary)
File: ConfirmDialog.jsx (line 3)
ErrorDialog component
Used in Bills for blocking errors (Upload Failed, Save Failed)
Close by backdrop click or Esc
File: ErrorDialog.jsx (line 3)
Unsaved Changes modal
Message: You have unsaved changes. Save before leaving this page?
Buttons currently wired: Leave Without Saving and Keep Editing
Property page wiring: PropertyRecordsPage.jsx (line 562)
Bills page wiring: PaymentFormPage.jsx (line 1152)
Popup styling
Confirm/Error backdrop is transparent (no dark dim): styles.css (line 601)
Upload modal uses dark overlay: styles.css (line 590)
Toast messages (non-modal)
Success/error/warning toasts auto-dismiss (default 3500 ms): useToast.js (line 12), Toast.jsx (line 1)
Property Records uses toast for save/update/delete outcomes and validation warnings.
Records page uses toast for “Select row first” and export outcomes.
Bills uses toast for successful save/update and successful upload auto-fill.
Upload + OCR/n8n flow
Bills Upload button opens upload modal: PaymentFormPage.jsx (line 1250)
Frontend uploads bill_file + context (bill_type, billing_period, dd, property) to backend: api.js (line 97)
Backend validates file, forwards to N8N_WEBHOOK_URL, then normalizes/unwraps response: api.php (line 763), api.php (line 826), api.php (line 887)
Frontend normalizeUploadData now unwraps nested n8n envelopes before applying fields: PaymentFormPage.jsx (line 149)
If you want, I can also generate a single “e