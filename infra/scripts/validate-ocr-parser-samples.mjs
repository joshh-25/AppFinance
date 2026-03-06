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

function toMarkdownList(items) {
  if (!items || items.length === 0) {
    return '-';
  }
  return items.join(', ');
}

function escapeMarkdownCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}

function sameText(a, b) {
  return String(a ?? '').replace(/\r\n/g, '\n') === String(b ?? '').replace(/\r\n/g, '\n');
}

function formatMismatch(mismatch) {
  return `${mismatch.field}: expected ${mismatch.expected}, got ${mismatch.actual}`;
}

function buildMarkdownReport(report) {
  const lines = [];
  lines.push('# Parser Validation Matrix');
  lines.push('');
  lines.push(`Summary: ${report.summary.passed}/${report.summary.total} PASS, ${report.summary.failed} FAIL`);
  lines.push('');
  lines.push('| Sample | Expected Type | Detected Type | Required Missing | Expected Missing | Value Mismatches | Status |');
  lines.push('|---|---|---|---|---|---|---|');

  report.rows.forEach((row) => {
    const mismatchText = row.expected_value_mismatches.map(formatMismatch);
    lines.push(
      [
        row.sample,
        row.expected_bill_type,
        row.detected_bill_type,
        toMarkdownList(row.required_fields_missing),
        toMarkdownList(row.expected_present_fields_missing),
        toMarkdownList(mismatchText),
        row.status
      ]
        .map((value) => escapeMarkdownCell(value))
        .join(' | ')
        .replace(/^/, '| ')
        .replace(/$/, ' |')
    );
  });

  const failedRows = report.rows.filter((row) => row.status !== 'PASS');
  if (failedRows.length > 0) {
    lines.push('');
    lines.push('## Failed Samples');
    failedRows.forEach((row) => {
      lines.push(`- ${row.sample}`);
      lines.push(`  - required missing: ${toMarkdownList(row.required_fields_missing)}`);
      lines.push(`  - expected missing: ${toMarkdownList(row.expected_present_fields_missing)}`);
      lines.push(
        `  - value mismatches: ${toMarkdownList(row.expected_value_mismatches.map(formatMismatch))}`
      );
    });
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  if (args.has('--help')) {
    console.log('Usage: node infra/scripts/validate-ocr-parser-samples.mjs [--check] [--write]');
    process.exit(0);
  }

  const writeMode = args.has('--write');
  const checkMode = args.has('--check') || !writeMode;

  const repoRoot = process.cwd();
  const inputPath = path.join(repoRoot, 'Examples', 'Samples', 'parser_validation_input.json');
  const jsonOutputPath = path.join(repoRoot, 'Examples', 'Samples', 'parser_validation_report.json');
  const markdownOutputPath = path.join(repoRoot, 'Examples', 'Samples', 'parser_validation_report.md');
  const parserPath = path.join(repoRoot, 'frontend', 'src', 'shared', 'lib', 'ocrParser.js');

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }
  if (!fs.existsSync(parserPath)) {
    throw new Error(`Parser file not found: ${parserPath}`);
  }

  const parserModule = await import(pathToFileURL(parserPath).href);
  const normalizeUploadData = parserModule.normalizeUploadData;
  const detectBillTypeFromData = parserModule.detectBillTypeFromData;
  const validateUploadExtraction = parserModule.validateUploadExtraction;
  const requiredFieldsByType = ensureObject(parserModule.UPLOAD_REQUIRED_FIELDS_BY_TYPE);

  if (
    typeof normalizeUploadData !== 'function' ||
    typeof detectBillTypeFromData !== 'function' ||
    typeof validateUploadExtraction !== 'function'
  ) {
    throw new Error('OCR parser exports are missing required functions.');
  }

  const samplesRaw = fs.readFileSync(inputPath, 'utf8');
  const samples = JSON.parse(samplesRaw);
  if (!Array.isArray(samples)) {
    throw new Error('parser_validation_input.json must contain an array.');
  }

  const rows = samples.map((sample) => {
    const sampleObject = ensureObject(sample);
    const sampleName = cleanText(sampleObject.name || path.basename(cleanText(sampleObject.path || '')));
    const samplePath = cleanText(sampleObject.path);
    const normalized = normalizeUploadData({
      path: samplePath,
      name: sampleName,
      text: typeof sampleObject.text === 'string' ? sampleObject.text : ''
    }) || {};

    const expectedBillType = cleanText(sampleObject.expected_bill_type).toLowerCase();
    const detectedBillType = cleanText(detectBillTypeFromData(normalized)).toLowerCase();
    const effectiveExpectedType = expectedBillType || detectedBillType || 'water';
    const requiredFields = ensureArray(requiredFieldsByType[effectiveExpectedType]);
    const expectedPresentFields = ensureArray(sampleObject.expected_present_fields).map((field) => cleanText(field));
    const expectedValues = ensureObject(sampleObject.expected_values);

    const requiredFieldsDetected = requiredFields.filter((field) => cleanText(normalized[field]) !== '');
    const requiredFieldsMissing = requiredFields.filter((field) => cleanText(normalized[field]) === '');
    const expectedPresentFieldsMissing = expectedPresentFields.filter(
      (field) => cleanText(normalized[field]) === ''
    );

    const expectedValueMismatches = Object.entries(expectedValues).reduce((acc, [field, expected]) => {
      const actualValue = normalizeComparable(normalized[field]);
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

    const validation = validateUploadExtraction(normalized, effectiveExpectedType);
    const status =
      detectedBillType === effectiveExpectedType &&
      requiredFieldsMissing.length === 0 &&
      expectedPresentFieldsMissing.length === 0 &&
      expectedValueMismatches.length === 0
        ? 'PASS'
        : 'FAIL';

    const previewFields = Array.from(
      new Set([
        'bill_type',
        ...requiredFields,
        ...expectedPresentFields,
        ...Object.keys(expectedValues)
      ])
    );
    const parsedPreview = previewFields.reduce((acc, field) => {
      acc[field] = cleanText(normalized[field]);
      return acc;
    }, {});

    return {
      sample: sampleName,
      path: samplePath,
      expected_bill_type: effectiveExpectedType,
      normalized_bill_type: cleanText(normalized.bill_type).toLowerCase(),
      detected_bill_type: detectedBillType,
      validation,
      required_fields_detected: requiredFieldsDetected,
      required_fields_missing: requiredFieldsMissing,
      expected_present_fields_missing: expectedPresentFieldsMissing,
      expected_value_mismatches: expectedValueMismatches,
      status,
      parsed_preview: parsedPreview
    };
  });

  const summary = {
    total: rows.length,
    passed: rows.filter((row) => row.status === 'PASS').length,
    failed: rows.filter((row) => row.status !== 'PASS').length
  };

  const report = {
    summary,
    rows
  };

  const generatedJson = `${JSON.stringify(report, null, 2)}\n`;
  const generatedMarkdown = buildMarkdownReport(report);

  if (writeMode) {
    fs.writeFileSync(jsonOutputPath, generatedJson, 'utf8');
    fs.writeFileSync(markdownOutputPath, generatedMarkdown, 'utf8');
    console.log('[parser-validation] Wrote reports:');
    console.log(`- ${jsonOutputPath}`);
    console.log(`- ${markdownOutputPath}`);
  }

  if (summary.failed > 0) {
    console.error(`[parser-validation] ${summary.failed} sample(s) failed validation.`);
    rows
      .filter((row) => row.status !== 'PASS')
      .forEach((row) => {
        console.error(`- ${row.sample}`);
        if (row.detected_bill_type !== row.expected_bill_type) {
          console.error(
            `  bill type mismatch: expected ${row.expected_bill_type}, got ${row.detected_bill_type || '(empty)'}`
          );
        }
        if (row.required_fields_missing.length > 0) {
          console.error(`  missing required fields: ${row.required_fields_missing.join(', ')}`);
        }
        if (row.expected_present_fields_missing.length > 0) {
          console.error(`  missing expected fields: ${row.expected_present_fields_missing.join(', ')}`);
        }
        if (row.expected_value_mismatches.length > 0) {
          row.expected_value_mismatches.forEach((mismatch) => {
            console.error(`  ${formatMismatch(mismatch)}`);
          });
        }
      });
    process.exit(1);
  }

  if (checkMode) {
    let stale = false;
    if (!fs.existsSync(jsonOutputPath)) {
      stale = true;
      console.error(`[parser-validation] Missing report file: ${jsonOutputPath}`);
    } else {
      const existingJson = fs.readFileSync(jsonOutputPath, 'utf8');
      if (!sameText(existingJson, generatedJson)) {
        stale = true;
        console.error(`[parser-validation] Outdated JSON report: ${jsonOutputPath}`);
      }
    }

    if (!fs.existsSync(markdownOutputPath)) {
      stale = true;
      console.error(`[parser-validation] Missing report file: ${markdownOutputPath}`);
    } else {
      const existingMarkdown = fs.readFileSync(markdownOutputPath, 'utf8');
      if (!sameText(existingMarkdown, generatedMarkdown)) {
        stale = true;
        console.error(`[parser-validation] Outdated Markdown report: ${markdownOutputPath}`);
      }
    }

    if (stale) {
      console.error('[parser-validation] Run with --write to refresh parser validation reports.');
      process.exit(1);
    }
  }

  console.log(
    `[parser-validation] PASS (${summary.passed}/${summary.total}). ` +
      (checkMode ? 'Reports are up to date.' : 'Validation completed.')
  );
}

main().catch((error) => {
  console.error('[parser-validation] Error:', error?.message || error);
  process.exit(1);
});

