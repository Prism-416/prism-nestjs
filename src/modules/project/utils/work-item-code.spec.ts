import {
  extractWorkItemCode,
  parseWorkItemCode,
} from '@/modules/project/utils/work-item-code';

describe('parseWorkItemCode', () => {
  it('parses a normalized work item code', () => {
    expect(parseWorkItemCode(' task-346 ')).toEqual({
      prefix: 'TASK',
      seq: 346,
    });
  });

  it('rejects codes that are not a clean prefix-sequence pair', () => {
    expect(parseWorkItemCode('TASK-346: add dispatch')).toBeNull();
    expect(parseWorkItemCode('TA-1')).toBeNull();
    expect(parseWorkItemCode('TASK-0')).toBeNull();
  });
});

describe('extractWorkItemCode', () => {
  it('extracts a code embedded in a pull request title', () => {
    expect(extractWorkItemCode('TASK-346: dispatch agent workflows')).toEqual({
      prefix: 'TASK',
      seq: 346,
    });
  });

  it('extracts a bracketed, lowercase code', () => {
    expect(extractWorkItemCode('[task-346] dispatch agent workflows')).toEqual({
      prefix: 'TASK',
      seq: 346,
    });
  });

  it('returns the first code when several are present', () => {
    expect(extractWorkItemCode('PROJ-12 supersedes TASK-7')).toEqual({
      prefix: 'PROJ',
      seq: 12,
    });
  });

  it('ignores codes glued to surrounding alphanumerics', () => {
    expect(extractWorkItemCode('XTASK-346')).toBeNull();
    expect(extractWorkItemCode('TASK-346X')).toBeNull();
  });

  it('returns null when no code is present', () => {
    expect(extractWorkItemCode('Improve onboarding flow')).toBeNull();
  });
});
