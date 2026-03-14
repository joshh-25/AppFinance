export function cleanTextValue(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getPropertyRecordLabel(record = {}) {
  const propertyValue = cleanTextValue(record.property);
  const ddValue = cleanTextValue(record.dd);
  return propertyValue !== '' ? propertyValue : ddValue;
}
