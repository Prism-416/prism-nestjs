import { generateWorkspaceSlug } from '@/modules/workspace/utils';

describe('generateWorkspaceSlug', () => {
  it('caps the slug to the database column length budget', () => {
    const slug = generateWorkspaceSlug('very long workspace name for testing');

    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).toHaveLength(20);
  });

  it('falls back to the default base when the name normalizes to empty', () => {
    const slug = generateWorkspaceSlug('!!!');

    expect(slug).toMatch(/^workspace-\d{9}$/);
    expect(slug).toHaveLength(19);
  });
});
