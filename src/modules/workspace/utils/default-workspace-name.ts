import { MAX_WORKSPACE_NAME_LENGTH } from '@/modules/workspace/constants';

const DEFAULT_WORKSPACE_NAME_SUFFIX = "'s workspace";
const MAX_WORKSPACE_NAME_PREFIX_LENGTH =
  MAX_WORKSPACE_NAME_LENGTH - DEFAULT_WORKSPACE_NAME_SUFFIX.length;

export function buildDefaultWorkspaceName(username: string): string {
  const normalizedUsername = username.trim();

  return `${normalizedUsername.slice(0, MAX_WORKSPACE_NAME_PREFIX_LENGTH)}${DEFAULT_WORKSPACE_NAME_SUFFIX}`;
}
