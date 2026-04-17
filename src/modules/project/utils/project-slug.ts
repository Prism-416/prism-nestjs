import { randomInt } from 'node:crypto';
import {
  MAX_PROJECT_SLUG_BASE_LENGTH,
  PROJECT_SLUG_RANDOM_DIGITS,
} from '@/modules/project/constants';

export function generateProjectSlug(name: string): string {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, MAX_PROJECT_SLUG_BASE_LENGTH);

  const base = normalizedName || 'project';
  return `${base}-${generateRandomDigits(PROJECT_SLUG_RANDOM_DIGITS)}`;
}

function generateRandomDigits(length: number): string {
  return randomInt(0, 10 ** length)
    .toString()
    .padStart(length, '0');
}
