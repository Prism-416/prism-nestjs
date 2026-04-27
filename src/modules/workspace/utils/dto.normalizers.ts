export function normalizeTrimmedString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  return value.trim();
}

export function normalizeOptionalTrimmedString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeNullableTrimmedString(value: unknown): unknown {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
