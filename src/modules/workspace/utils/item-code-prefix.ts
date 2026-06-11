export const DEFAULT_ITEM_CODE_PREFIX = 'TASK';

/**
 * Derive a default work item code prefix from a workspace name: letters only,
 * uppercased, first four characters. Falls back to {@link DEFAULT_ITEM_CODE_PREFIX}
 * when the name yields fewer than three letters, mirroring the migration
 * backfill so the `^[A-Z]{3,4}$` constraint always holds.
 */
export function buildDefaultItemCodePrefix(name: string): string {
  const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase();

  if (letters.length < 3) {
    return DEFAULT_ITEM_CODE_PREFIX;
  }

  return letters.slice(0, 4);
}
