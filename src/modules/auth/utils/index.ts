export function pickDisplayName(
  fallback: string,
  ...candidates: Array<string | null | undefined>
): string {
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value) {
      return value;
    }
  }

  return fallback;
}

export function normalizeUsername(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);

  if (normalized.length >= 2) {
    return normalized;
  }

  if (normalized.length === 1) {
    return `${normalized}_user`.slice(0, 30);
  }

  return '';
}

export function buildUsernameSeeds(fullName: string, email: string): string[] {
  return [
    normalizeUsername(fullName),
    normalizeUsername(email.split('@')[0] ?? ''),
    'user',
  ].filter(Boolean);
}
