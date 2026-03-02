# n8n Setup Guide (Simple Step-by-Step)

## What you are building
One n8n process that can read and return bill data for:
1. Electricity
2. WiFi / Internet
3. Water
4. Association

Use **one webhook** and route by `bill_type`.

This matches your current app flow:
- Frontend uploads file to `api.php?action=upload_bill`
- PHP forwards file to n8n
- n8n returns parsed JSON
- Your app fills the form
- User clicks Save/Update to write into database

## Step 1: Set webhook URL in your app config
Open your project root `.env` (or `config.nmb`) and add:

```env
N8N_WEBHOOK_URL=https://YOUR-N8N-DOMAIN/webhook/finance-bill-upload
```

Important:
- The path must match your n8n Webhook node path exactly.
- Keep this in backend config only (do not expose in frontend).

## Step 2: Create workflow in n8n
1. Open n8n.
2. Click `New Workflow`.
3. Name it: `Finance Bill Upload (All Types)`.

## Step 3: Add Webhook node
1. Add **Webhook** node.
2. Set:
   - Method: `POST`
   - Path: `finance-bill-upload`
3. Response mode:
   - Use `Respond to Webhook` node (recommended for full control).

## Step 4: Read uploaded file and metadata
Your PHP sends file using these keys:
- `data`
- `file`
- `bill_file`

And metadata:
- `bill_type`
- `billing_period`
- `dd`
- `property`

Add a **Code** node after Webhook and use:

```javascript
const item = items[0];
const b = item.binary || {};

const binaryKey = b.file ? 'file' : (b.bill_file ? 'bill_file' : (b.data ? 'data' : null));
if (!binaryKey) {
  throw new Error('No uploaded file found. Expected binary key: file, bill_file, or data.');
}

const j = item.json || {};

return [
  {
    json: {
      bill_type_hint: String(j.bill_type || '').trim().toLowerCase(),
      billing_period_hint: String(j.billing_period || '').trim(),
      dd_hint: String(j.dd || '').trim(),
      property_hint: String(j.property || '').trim(),
      mime_type: String((b[binaryKey]?.mimeType || '')).toLowerCase(),
      file_name: String(b[binaryKey]?.fileName || '')
    },
    binary: {
      file: b[binaryKey]
    }
  }
];
```

## Step 5: Route by file type (PDF vs Image)
Add **Switch** node:
- If `mime_type` contains `application/pdf` -> PDF branch
- Else -> Image branch

### PDF branch
Use a PDF text extraction node (for example `Read PDF`).

### Image branch
Use OCR node (for example `Tesseract OCR` or your preferred OCR).

Output from both branches must become one text field, e.g.:
- `extracted_text`

## Step 6: Parse and normalize bill data
Add **Code** node (or AI node) to convert extracted text into normalized fields.

Rules:
1. Detect `bill_type`:
   - `electricity`
   - `internet` (for WiFi)
   - `water`
   - `association_dues`
2. Normalize `billing_period` to `YYYY-MM`.
3. Keep all missing fields as empty string.

Use this exact output schema:

```json
{
  "success": true,
  "data": {
    "bill_type": "",
    "billing_period": "",
    "dd": "",
    "property": "",
    "unit_owner": "",
    "classification": "",
    "deposit": "",
    "rent": "",
    "internet_provider": "",
    "internet_account_no": "",
    "wifi_amount": "",
    "wifi_due_date": "",
    "wifi_payment_status": "",
    "water_account_no": "",
    "water_amount": "",
    "water_due_date": "",
    "water_payment_status": "",
    "electricity_account_no": "",
    "electricity_amount": "",
    "electricity_due_date": "",
    "electricity_payment_status": "",
    "association_dues": "",
    "association_due_date": "",
    "association_payment_status": "",
    "real_property_tax": "",
    "rpt_payment_status": "",
    "penalty": "",
    "per_property_status": ""
  }
}
```

Note:
- If detected bill type is WiFi, return `bill_type = "internet"`.
- If parser misses bill type, use `bill_type_hint` when valid.

## Step 7: Add final validation node
Before responding, validate:
1. `bill_type` is one of: `internet`, `water`, `electricity`, `association_dues`
2. `billing_period` is empty or `YYYY-MM`
3. At least one of `dd` or `property` exists (or keep hint values)

If invalid, return:

```json
{
  "success": false,
  "message": "Clear error message here"
}
```

## Step 8: Respond to webhook
Add **Respond to Webhook** node.
- Status code `200` for success.
- Return parsed object exactly as above.

For errors, return:
- Status code `200` or `4xx` (your choice)
- JSON with `success: false` and exact `message`.

## Step 9: Activate workflow
1. Save workflow.
2. Click `Active`.
3. Copy Production webhook URL.
4. Put that URL in `.env` as `N8N_WEBHOOK_URL`.

## Step 10: Test from your app
For each bill module (WiFi, Water, Electricity, Association):
1. Open corresponding Bills page in your app.
2. Click `Upload Bill`.
3. Upload a sample file.
4. Confirm fields are auto-filled correctly.
5. Click `Record Payment` (or `Update Record`).
6. Check DB table `property_billing_records`.

## Step 11: Verify duplicate behavior
1. Save one record for same `dd + property + billing_period + bill_type`.
2. Try saving same identity again.
3. Confirm app shows duplicate error clearly.

## Step 12: Common errors and fixes
1. `N8N_WEBHOOK_URL is not configured`
   - Add it in `.env` or `config.nmb`.

2. `Document processing service returned an error`
   - Check n8n execution log and node errors.

3. `No uploaded file found`
   - Ensure webhook receives binary field from PHP.

4. Wrong bill type mapping
   - Ensure WiFi maps to `internet`, Association maps to `association_dues`.

5. Billing period not accepted
   - Return `YYYY-MM` only.

---

## Final recommendation
Keep **one webhook** for all bill types.  
Do routing and parsing inside that workflow.  
This is simpler, cleaner, and easier to maintain than 4 separate webhooks.

