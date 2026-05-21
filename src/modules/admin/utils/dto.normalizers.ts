export function normalizeTrimmedString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function normalizeOptionalTrimmedString(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  return normalizeTrimmedString(value);
}
