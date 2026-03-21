import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { EntityManager } from 'typeorm';
import {
  isWorkspaceSlugUniqueViolation,
  WorkspaceSlugAlreadyExistsError,
} from '@/modules/workspace/errors';
import { WorkspaceRepository } from '@/modules/workspace/repository';
import { WorkspaceRow } from '@/modules/workspace/types';

const MAX_WORKSPACE_SLUG_GENERATION_ATTEMPTS = 5;
const WORKSPACE_SLUG_RANDOM_DIGITS = 9;
const MAX_SLUG_BASE_LENGTH = 20;

@Injectable()
export class WorkspaceSlugService {
  constructor(private readonly repo: WorkspaceRepository) {}

  async createWorkspaceWithGeneratedSlug(
    params: {
      ownerId: string;
      name: string;
      description?: string;
    },
    manager: EntityManager,
  ): Promise<WorkspaceRow> {
    for (
      let attempt = 0;
      attempt < MAX_WORKSPACE_SLUG_GENERATION_ATTEMPTS;
      attempt += 1
    ) {
      const slug = this.generateWorkspaceSlug(params.name);

      try {
        return await this.repo.createWorkspace(
          {
            ownerId: params.ownerId,
            name: params.name,
            slug,
            description: params.description,
          },
          manager,
        );
      } catch (error) {
        if (isWorkspaceSlugUniqueViolation(error)) {
          continue;
        }

        throw error;
      }
    }

    throw new WorkspaceSlugAlreadyExistsError();
  }

  private generateWorkspaceSlug(name: string): string {
    const normalizedName = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, MAX_SLUG_BASE_LENGTH);

    const base = normalizedName || 'workspace';
    return `${base}-${this.generateRandomDigits(WORKSPACE_SLUG_RANDOM_DIGITS)}`;
  }

  private generateRandomDigits(length: number): string {
    return randomInt(0, 10 ** length)
      .toString()
      .padStart(length, '0');
  }
}
