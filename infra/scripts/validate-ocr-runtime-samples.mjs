#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function cleanText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeComparable(value) {
  return cleanText(value).replace(/,/g, '');
}

function ensureArray(value) {
  return Array.isArray(value) ? value : [];
}

function ensureObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function sameText(a, b) {
  return String(a ?? '').replace(/\r\n/g, '\n') === String(b ?? '').replace(/\r\n/g, '\n');
}

function toMarkdownList(items) {
  if (!items || items.length === 0) {
    return '-';
  }
  return items.join(', ');
}

function escapeMarkdownCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}

function formatMismatch(mismatch) {
  return `${mismatch.field}: expected ${mismatch.expected}, got ${mismatch.actual}`;
}

function unwrapRuntimePayload(payload) {
  let current = payload;

  if (Array.isArray(current) && current.length > 0) {
    current = current[0];
  }

  for (let i = 0; i < 6; i += 1) {
    if (!current || typeof current !== 'object') {
      break;
    }

    if (current.success === true && current.data && typeof current.data === 'object') {
      current = current.data;
      continue;
    }
    if (current.json && typeof current.json === 'object') {
      current = current.json;
      continue;
    }
    if (current.data && typeof current.data === 'object') {
      current = current.data;
      continue;
    }
    break;
  }

  return ensureObject(current);
}

function compareSamplePayload(sample, payload, requiredFieldsByType) {
  const expectedBillType = cleanText(sample.runtime_expected_bill_type || sample.expected_bill_type).toLowerCase();
  const expectedPresentFields = ensureArray(sample.runtime_expected_present_fields ?? sample.expected_present_fields).map((field) => cleanText(field));
  const expectedValues = ensureObject(sample.runtime_expected_values ?? sample.expected_values);
  const effectiveType = expectedBillType || cleanText(payload.bill_type).toLowerCase() || 'water';
  const requiredFields = ensureArray(requiredFieldsByType[effectiveType]);

  const requiredFieldsMissing = requiredFields.filter((field) => cleanText(payload[field]) === '');
  const expectedPresentFieldsMissing = expectedPresentFields.filter((field) => cleanText(payload[field]) === '');
  const expectedValueMismatches = Object.entries(expectedValues).reduce((acc, [field, expected]) => {
    const actualValue = normalizeComparable(payload[field]);
    const expectedValue = normalizeComparable(expected);
    if (actualValue !== expectedValue) {
      acc.push({
        field,
        expected: expectedValue,
        actual: actualValue
      });
    }
    return acc;
  }, []);

  const detectedBillType = cleanText(payload.bill_type).toLowerCase();
  const status =
    detectedBillType === effectiveType &&
    requiredFieldsMissing.length === 0 &&
    expectedPresentFieldsMissing.length === 0 &&
    expectedValueMismatches.length === 0
      ? 'PASS'
      : 'FAIL';

  return {
    expected_bill_type: effectiveType,
    detected_bill_type: detectedBillType,
    required_fields_missing: requiredFieldsMissing,
    expected_present_fields_missing: expectedPresentFieldsMissing,
    expected_value_mismatches: expectedValueMismatches,
    status
  };
}

function buildMarkdownReport(report) {
  const lines = [];
  lines.push('# OCR Runtime Validation Matrix');
  lines.push('');
  lines.push(`Summary: ${report.summary.passed}/${report.summary.total} PASS, ${report.summary.failed} FAIL`);
  lines.push('');
  lines.push('| Sample | Target | Expected Type | Detected Type | Required Missing | Expected Missing | Value Mismatches | Status |');
  lines.push('|---|---|---|---|---|---|---|---|');

  report.rows.forEach((row) => {
    lines.push(
      [
        row.sample,
        row.target,
        row.expected_bill_type,
        row.detected_bill_type,
        toMarkdownList(row.required_fields_missing),
        toMarkdownList(row.expected_present_fields_missing),
        toMarkdownList(row.expected_value_mismatches.map(formatMismatch)),
        row.status
      ]
        .map((value) => escapeMarkdownCell(value))
        .join(' | ')
        .replace(/^/, '| ')
        .replace(/$/, ' |')
    );
  });

  return `${lines.join('\n')}\n`;
}

async function postFile(url, fields, filePath, mimeType) {
  const buffer = await fs.promises.readFile(filePath);
  const formData = new FormData();
  const filename = path.basename(filePath);
  const fileBlob = new Blob([buffer], { type: mimeType });
  const binaryFieldNames = new Set(['file', 'data', 'bill_file']);

  Object.entries(fields).forEach(([key, value]) => {
    if (binaryFieldNames.has(key)) {
      return;
    }
    formData.append(key, String(value ?? ''));
  });

  formData.append('file', fileBlob, filename);
  if (fields.data !== undefined) {
    formData.append('data', fileBlob, filename);
  }
  if (fields.bill_file !== undefined) {
    formData.append('bill_file', fileBlob, filename);
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  const responseText = await response.text();
  let decoded = null;
  try {
    decoded = JSON.parse(responseText);
  } catch {
    decoded = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    text: responseText,
    json: decoded
  };
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--help')) {
    console.log('Usage: node infra/scripts/validate-ocr-runtime-samples.mjs [--check] [--write]');
    process.exit(0);
  }

  const repoRoot = process.cwd();
  const writeMode = args.has('--write');
  const checkMode = args.has('--check') || !writeMode;
  const inputPath = path.join(repoRoot, 'Examples', 'Samples', 'parser_validation_input.json');
  const jsonOutputPath = path.join(repoRoot, 'Examples', 'Samples', 'ocr_runtime_validation_report.json');
  const markdownOutputPath = path.join(repoRoot, 'Examples', 'Samples', 'ocr_runtime_validation_report.md');

  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const parserModule = await import(
    pathToFileURL(path.join(repoRoot, 'frontend', 'src', 'shared', 'lib', 'ocrParser.js')).href
  );
  const requiredFieldsByType = ensureObject(parserModule.UPLOAD_REQUIRED_FIELDS_BY_TYPE);

  const envText = fs.existsSync(path.join(repoRoot, '.env'))
    ? fs.readFileSync(path.join(repoRoot, '.env'), 'utf8')
    : '';
  const webhookMatch = envText.match(/^\s*N8N_WEBHOOK_URL=(.+)\s*$/m);
  const webhookUrl = cleanText(process.env.N8N_WEBHOOK_URL || webhookMatch?.[1] || 'http://localhost:5678/webhook/finance-bill-ocr');
  const ocrApiUrl = cleanText(process.env.OCR_API_URL || 'http://localhost:8001/ocr');

  const runtimeTargets = [
    {
      name: 'ocr_api',
      url: ocrApiUrl,
      buildFields: () => ({})
    },
    {
      name: 'n8n_webhook',
      url: webhookUrl,
      buildFields: (sample) => ({
        filename: path.basename(sample.path || sample.name || ''),
        mime_type: 'application/pdf',
        detected_mime_type: 'application/pdf',
        source_mime_type: 'application/pdf',
        file_extension: 'pdf',
        bill_type: sample.expected_bill_type || '',
        property_list_id: 0,
        dd: '',
        property: '',
        due_period: '2026-03',
        data: 'binary',
        bill_file: 'binary'
      })
    }
  ];

  const rows = [];

  for (const sample of input) {
    const sampleObject = ensureObject(sample);
    const samplePath = path.join(repoRoot, cleanText(sampleObject.path));
    const sampleName = cleanText(sampleObject.name || path.basename(samplePath));
    if (!fs.existsSync(samplePath)) {
      throw new Error(`Sample file not found: ${samplePath}`);
    }

    for (const target of runtimeTargets) {
      const response = await postFile(
        target.url,
        target.buildFields(sampleObject),
        samplePath,
        'application/pdf'
      );

      if (!response.ok || !response.json) {
        rows.push({
          sample: sampleName,
          target: target.name,
          expected_bill_type: cleanText(sampleObject.expected_bill_type).toLowerCase(),
          detected_bill_type: '',
          required_fields_missing: ['runtime request failed'],
          expected_present_fields_missing: [],
          expected_value_mismatches: response.json ? [] : [{ field: 'response', expected: 'valid json', actual: cleanText(response.text) || `HTTP ${response.status}` }],
          status: 'FAIL'
        });
        continue;
      }

      const payload = unwrapRuntimePayload(response.json);
      const comparison = compareSamplePayload(sampleObject, payload, requiredFieldsByType);
      rows.push({
        sample: sampleName,
        target: target.name,
        ...comparison
      });
    }
  }

  const summary = {
    total: rows.length,
    passed: rows.filter((row) => row.status === 'PASS').length,
    failed: rows.filter((row) => row.status !== 'PASS').length
  };
  const report = { summary, rows };
  const generatedJson = `${JSON.stringify(report, null, 2)}\n`;
  const generatedMarkdown = buildMarkdownReport(report);

  if (writeMode) {
    fs.writeFileSync(jsonOutputPath, generatedJson, 'utf8');
    fs.writeFileSync(markdownOutputPath, generatedMarkdown, 'utf8');
    console.log('[ocr-runtime-validation] Wrote reports:');
    console.log(`- ${jsonOutputPath}`);
    console.log(`- ${markdownOutputPath}`);
  }

  if (summary.failed > 0) {
    console.error(`[ocr-runtime-validation] ${summary.failed} runtime sample(s) failed validation.`);
    process.exit(1);
  }

  if (checkMode) {
    let stale = false;
    if (!fs.existsSync(jsonOutputPath) || !sameText(fs.readFileSync(jsonOutputPath, 'utf8'), generatedJson)) {
      stale = true;
      console.error(`[ocr-runtime-validation] Outdated JSON report: ${jsonOutputPath}`);
    }
    if (!fs.existsSync(markdownOutputPath) || !sameText(fs.readFileSync(markdownOutputPath, 'utf8'), generatedMarkdown)) {
      stale = true;
      console.error(`[ocr-runtime-validation] Outdated Markdown report: ${markdownOutputPath}`);
    }
    if (stale) {
      console.error('[ocr-runtime-validation] Run with --write to refresh runtime validation reports.');
      process.exit(1);
    }
  }

  console.log(
    `[ocr-runtime-validation] PASS (${summary.passed}/${summary.total}). ` +
      (checkMode ? 'Reports are up to date.' : 'Validation completed.')
  );
}

main().catch((error) => {
  console.error('[ocr-runtime-validation] Error:', error?.message || error);
  process.exit(1);
});
