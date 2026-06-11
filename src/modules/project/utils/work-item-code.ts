const WORK_ITEM_CODE_PATTERN = /^([A-Z]{3,4})-(\d+)$/;
const WORK_ITEM_CODE_SEARCH_PATTERN =
  /(?<![A-Za-z0-9])([A-Za-z]{3,4})-(\d+)(?![A-Za-z0-9])/g;

export type ParsedWorkItemCode = {
  prefix: string;
  seq: number;
};

export function parseWorkItemCode(code: string): ParsedWorkItemCode | null {
  const normalized = code.trim().toUpperCase();
  const match = WORK_ITEM_CODE_PATTERN.exec(normalized);
  if (!match) {
    return null;
  }

  const seq = Number.parseInt(match[2], 10);
  if (!Number.isSafeInteger(seq) || seq <= 0) {
    return null;
  }

  return {
    prefix: match[1],
    seq,
  };
}

/**
 * Find the first work item code embedded anywhere in free text, e.g. a pull
 * request title like `TASK-346: add dispatch` or `[task-346] add dispatch`.
 */
export function extractWorkItemCode(text: string): ParsedWorkItemCode | null {
  for (const match of text.matchAll(WORK_ITEM_CODE_SEARCH_PATTERN)) {
    const parsed = parseWorkItemCode(match[0]);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}
