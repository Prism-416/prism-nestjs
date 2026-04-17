import { buildDefaultWorkspaceName } from '@/modules/workspace/utils';

describe('buildDefaultWorkspaceName', () => {
  it('preserves short usernames', () => {
    expect(buildDefaultWorkspaceName('alex')).toBe("alex's workspace");
  });

  it('truncates long usernames to fit the workspace name limit', () => {
    const workspaceName = buildDefaultWorkspaceName(
      'verylongusernamefortest',
    );

    expect(workspaceName).toBe("verylong's workspace");
    expect(workspaceName).toHaveLength(20);
  });
});
