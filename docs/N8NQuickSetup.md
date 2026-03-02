# n8n Quick Setup (Working with your Finance app)

## 1) Webhook node
- Node: `Webhook`
- Method: `POST`
- Path: `finance-bill-upload`
- Respond: `Using Respond to Webhook Node`
- Authentication: `None` (for local test)

Test URL (local):
- `http://localhost:5678/webhook-test/finance-bill-upload`

Production URL (after Activate):
- `http://localhost:5678/webhook/finance-bill-upload`

## 2) Normalize incoming file key
Add node: `Code` (name it `Normalize Input`), directly after Webhook.

Paste:
```javascript
const item = items[0] || { json: {}, binary: {} };
const b = item.binary || {};
const key = b.file ? 'file' : (b.bill_file ? 'bill_file' : (b.data ? 'data' : null));
if (!key) {
  throw new Error('No uploaded file found. Expected binary key: file, bill_file, or data.');
}

const j = item.json || {};
return [{
  json: {
    bill_type_hint: String(j.bill_type || '').trim().toLowerCase(),
    billing_period_hint: String(j.billing_period || '').trim(),
    dd_hint: String(j.dd || '').trim(),
    property_hint: String(j.property || '').trim(),
    mime_type: String((b[key]?.mimeType || '')).toLowerCase()
  },
  binary: { file: b[key] }
}];
```

## 3) Route PDF vs Image
Add node: `Switch` after `Normalize Input`.
- Mode: `Rules`
- Rule 1:
  - Value 1 (expression): `{{ $json.mime_type }}`
  - Operation: `contains`
  - Value 2: `application/pdf`

Outputs:
- Output 0 = PDF
- Output 1 = Image (fallback)

## 4) PDF branch
From Switch output 0:
- Add node: `Extract from File`
- Operation: `Extract From PDF`
- Input Binary Field: `file`

Then add node: `Set` (name `PDF Text`):
- Keep only set: `false`
- Add field `extracted_text` = `{{ $json.text || $json.extractedText || '' }}`
- Also pass hints:
  - `bill_type_hint` = `{{ $('Normalize Input').item.json.bill_type_hint }}`
  - `billing_period_hint` = `{{ $('Normalize Input').item.json.billing_period_hint }}`
  - `dd_hint` = `{{ $('Normalize Input').item.json.dd_hint }}`
  - `property_hint` = `{{ $('Normalize Input').item.json.property_hint }}`

## 5) Image branch (OCR)
From Switch output 1:
- Add OCR node (`OCR`, `Tesseract`, or your OCR provider node)
- Input binary field: `file`
- Configure to return recognized text in JSON

Then add node: `Set` (name `OCR Text`):
- Keep only set: `false`
- Add field `extracted_text` = expression pointing to OCR text output
  - Example: `{{ $json.text || $json.fullText || '' }}`
- Also pass same 4 hint fields from `Normalize Input`

## 6) Merge both branches
Add `Merge` node:
- Mode: `Append`
- Input 1 = `PDF Text`
- Input 2 = `OCR Text`

## 7) Parse to Finance schema
Add `Code` node after Merge.
Paste full parser from:
- `docs/n8n_code_parser.js`

Expected output must be:
```json
{
  "success": true,
  "data": {
    "bill_type": "water|internet|electricity|association_dues",
    "billing_period": "YYYY-MM",
    "dd": "",
    "property": "",
    "...": "other finance fields"
  }
}
```

## 8) Respond to Webhook
Add node: `Respond to Webhook`
- Respond With: `JSON`
- Response Body (expression): `{{ $json }}`
- Status Code: `200`

## 9) App environment
In your app `.env`:
```env
N8N_WEBHOOK_URL=http://localhost:5678/webhook-test/finance-bill-upload
N8N_USE_MOCK=false
```

For test URL: click `Listen for test event` every test run.
For production URL: activate workflow and switch URL to `/webhook/finance-bill-upload`.

## 10) Common fail causes
- `Upload Failed` + "Document processing service returned an error":
  - Webhook not listening (test mode), wrong URL, or node crash.
- No autofill after success:
  - Response body is not `{ success: true, data: {...} }`.
- Billing period shows `---- ----`:
  - parser did not return valid `billing_period` (`YYYY-MM`).
