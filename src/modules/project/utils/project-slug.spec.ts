import { generateProjectSlug } from '@/modules/project/utils';

describe('generateProjectSlug', () => {
  it('caps the slug to the database column length budget', () => {
    const slug = generateProjectSlug('very long project name for testing');

    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).toHaveLength(20);
  });
});
