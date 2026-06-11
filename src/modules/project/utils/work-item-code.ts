const WORK_ITEM_CODE_PATTERN = /^([A-Z]{3,4})-(\d+)$/;

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
