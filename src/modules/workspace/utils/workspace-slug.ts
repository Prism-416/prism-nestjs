import { randomInt } from 'node:crypto';
import {
  MAX_WORKSPACE_SLUG_BASE_LENGTH,
  WORKSPACE_SLUG_RANDOM_DIGITS,
} from '@/modules/workspace/constants';

export function generateWorkspaceSlug(name: string): string {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_WORKSPACE_SLUG_BASE_LENGTH);

  const base = normalizedName || 'workspace';
  return `${base}-${generateRandomDigits(WORKSPACE_SLUG_RANDOM_DIGITS)}`;
}

function generateRandomDigits(length: number): string {
  return randomInt(0, 10 ** length)
    .toString()
    .padStart(length, '0');
}
