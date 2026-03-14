// Finance App File: frontend/src/features/bills/lib/uploadPropertyResolver.js
// Purpose: Keep upload property-resolution logic isolated from page component state wiring.

function toPositiveInt(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function cleanMatchValue(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeMatchValue(value) {
  return cleanMatchValue(value)
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildAcronym(value) {
  const tokens = tokenizeMatchValue(value);
  if (tokens.length === 0) {
    return '';
  }
  return tokens.map((token) => token[0]).join('');
}

function collectRecordAliases(record) {
  const property = String(record?.property || '').trim();
  const dd = String(record?.dd || '').trim();
  const unitOwner = String(record?.unit_owner || '').trim();
  const aliases = new Set();

  [property, dd, unitOwner].forEach((value) => {
    const normalized = cleanMatchValue(value);
    if (normalized !== '') {
      aliases.add(normalized);
    }

    const acronym = buildAcronym(value);
    if (acronym !== '') {
      aliases.add(acronym);
    }
  });

  if (property !== '' && dd !== '') {
    aliases.add(cleanMatchValue(`${property} ${dd}`));
    aliases.add(cleanMatchValue(`${dd} ${property}`));
  }

  return Array.from(aliases);
}

function scoreCandidateMatch(query, aliases) {
  const normalizedQuery = cleanMatchValue(query);
  if (normalizedQuery === '' || aliases.length === 0) {
    return 0;
  }

  let score = 0;
  const queryTokens = new Set(tokenizeMatchValue(normalizedQuery));

  aliases.forEach((alias) => {
    if (alias === '') {
      return;
    }
    if (alias === normalizedQuery) {
      score = Math.max(score, 120);
      return;
    }
    if (alias.includes(normalizedQuery) || normalizedQuery.includes(alias)) {
      score = Math.max(score, 80);
    }

    const aliasTokens = tokenizeMatchValue(alias);
    const overlap = aliasTokens.filter((token) => queryTokens.has(token)).length;
    if (overlap > 0) {
      score = Math.max(score, overlap * 20);
    }
  });

  return score;
}

function findPropertyRecordMatch(nextForm, propertyRecords) {
  if (!nextForm || typeof nextForm !== 'object' || !Array.isArray(propertyRecords) || propertyRecords.length === 0) {
    return null;
  }

  const propertyQuery = String(nextForm.property || '').trim();
  const ddQuery = String(nextForm.dd || '').trim();
  if (propertyQuery === '' && ddQuery === '') {
    return null;
  }

  const scored = propertyRecords
    .map((record) => {
      const aliases = collectRecordAliases(record);
      const propertyScore = scoreCandidateMatch(propertyQuery, aliases);
      const ddScore = scoreCandidateMatch(ddQuery, aliases);
      const totalScore = propertyScore + ddScore;
      return {
        record,
        totalScore,
        propertyScore,
        ddScore
      };
    })
    .filter((entry) => entry.totalScore > 0)
    .sort((left, right) => right.totalScore - left.totalScore);

  if (scored.length === 0) {
    return null;
  }

  const best = scored[0];
  const second = scored[1] || null;
  const hasStrongPropertyMatch = best.propertyScore >= 80;
  const hasStrongDdMatch = best.ddScore >= 80;
  const hasGoodCombinedMatch = best.totalScore >= 100;
  const safelyAhead = !second || best.totalScore >= second.totalScore + 20;

  if ((hasStrongPropertyMatch || hasStrongDdMatch || hasGoodCombinedMatch) && safelyAhead) {
    return best.record;
  }

  return null;
}

export function applyCanonicalPropertyRecord(nextForm, propertyRecords) {
  if (!nextForm || typeof nextForm !== 'object' || !Array.isArray(propertyRecords) || propertyRecords.length === 0) {
    return false;
  }

  const propertyListId = toPositiveInt(nextForm.property_list_id);
  if (propertyListId <= 0) {
    return false;
  }

  const canonicalRecord = propertyRecords.find(
    (record) => toPositiveInt(record?.property_list_id || record?.id) === propertyListId
  );
  if (!canonicalRecord) {
    return false;
  }

  nextForm.dd = canonicalRecord.dd || nextForm.dd || '';
  nextForm.property = canonicalRecord.property || nextForm.property || '';
  nextForm.unit_owner = canonicalRecord.unit_owner || nextForm.unit_owner || '';
  nextForm.classification = canonicalRecord.classification || nextForm.classification || '';
  nextForm.deposit = canonicalRecord.deposit || nextForm.deposit || '';
  nextForm.rent = canonicalRecord.rent || nextForm.rent || '';
  nextForm.per_property_status = canonicalRecord.per_property_status || nextForm.per_property_status || '';
  nextForm.real_property_tax = canonicalRecord.real_property_tax || nextForm.real_property_tax || '';
  nextForm.rpt_payment_status = canonicalRecord.rpt_payment_status || nextForm.rpt_payment_status || '';
  nextForm.penalty = canonicalRecord.penalty || nextForm.penalty || '';

  return true;
}

function applyLookupMatch(nextForm, matched, propertyRecords) {
  if (!nextForm || typeof nextForm !== 'object' || !matched || typeof matched !== 'object') {
    return false;
  }

  const matchedPropertyListId = toPositiveInt(matched.property_list_id);
  const matchedProperty = String(matched.property || matched.property_name || '').trim();
  const matchedDd = String(matched.dd || '').trim();

  if (matchedPropertyListId <= 0 && matchedProperty === '' && matchedDd === '') {
    return false;
  }

  nextForm.property_list_id = matchedPropertyListId > 0 ? matchedPropertyListId : toPositiveInt(nextForm.property_list_id);
  nextForm.dd = matchedDd || nextForm.dd || '';
  nextForm.property = matchedProperty || nextForm.property || '';
  nextForm.due_period = nextForm.due_period || matched.due_period || '';
  nextForm.unit_owner = matched.unit_owner || nextForm.unit_owner || '';
  nextForm.classification = matched.classification || nextForm.classification || '';
  nextForm.deposit = matched.deposit || nextForm.deposit || '';
  nextForm.rent = matched.rent || nextForm.rent || '';
  nextForm.per_property_status = matched.per_property_status || nextForm.per_property_status || '';
  nextForm.real_property_tax = matched.real_property_tax || nextForm.real_property_tax || '';
  nextForm.rpt_payment_status = matched.rpt_payment_status || nextForm.rpt_payment_status || '';
  nextForm.penalty = matched.penalty || nextForm.penalty || '';

  applyCanonicalPropertyRecord(nextForm, propertyRecords);
  return true;
}

export async function resolveUploadPropertyBeforeRender({
  nextForm,
  activeBillType,
  accountLookupFieldByType,
  lookupPropertyByAccountNumber,
  propertyRecords
}) {
  if (!nextForm || typeof nextForm !== 'object') {
    return nextForm;
  }

  applyCanonicalPropertyRecord(nextForm, propertyRecords);
  if (toPositiveInt(nextForm.property_list_id) <= 0) {
    const matchedRecord = findPropertyRecordMatch(nextForm, propertyRecords);
    if (matchedRecord) {
      applyLookupMatch(nextForm, matchedRecord, propertyRecords);
    }
  }

  const lookupField = accountLookupFieldByType?.[activeBillType] || '';
  const lookupAccount = lookupField ? String(nextForm[lookupField] || '').trim() : '';
  if (toPositiveInt(nextForm.property_list_id) > 0 || lookupAccount === '') {
    return nextForm;
  }

  const lookupAttempts = [
    { utilityType: activeBillType, duePeriod: nextForm.due_period || '' },
    { utilityType: '', duePeriod: nextForm.due_period || '' },
    { utilityType: activeBillType, duePeriod: '' },
    { utilityType: '', duePeriod: '' }
  ];

  for (const attempt of lookupAttempts) {
    try {
      const lookupResult = await lookupPropertyByAccountNumber({
        accountNumber: lookupAccount,
        utilityType: attempt.utilityType,
        duePeriod: attempt.duePeriod
      });
      const matched = lookupResult?.data || null;
      const matchStatus = String(matched?.match_status || 'matched').trim().toLowerCase();
      if (matchStatus === 'needs_review') {
        // Respect ambiguous account matches; do not auto-fill from broader fallbacks.
        return nextForm;
      }

      if (applyLookupMatch(nextForm, matched, propertyRecords)) {
        break;
      }
    } catch {
      // Keep upload resilient; caller still has background auto-lookup.
    }
  }

  return nextForm;
}
