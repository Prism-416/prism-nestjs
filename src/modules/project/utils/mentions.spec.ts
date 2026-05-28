import { extractMentionUsernames } from '@/modules/project/utils/mentions';

describe('extractMentionUsernames', () => {
  it('extracts unique usernames in mention order', () => {
    expect(
      extractMentionUsernames('ping @alice and @bob, then @Alice again'),
    ).toEqual(['alice', 'bob']);
  });

  it('ignores emails and short tokens', () => {
    expect(extractMentionUsernames('a@company.com @a @valid-user')).toEqual([
      'valid-user',
    ]);
  });

  it('extracts usernames with dots and unicode letters', () => {
    expect(extractMentionUsernames('ping @john.doe and @민수')).toEqual([
      'john.doe',
      '민수',
    ]);
  });
});
