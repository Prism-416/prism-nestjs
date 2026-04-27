import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { MAX_WORKSPACE_SLUG_GENERATION_ATTEMPTS } from '@/modules/workspace/constants';
import {
  isWorkspaceSlugUniqueViolation,
  WorkspaceSlugAlreadyExistsError,
} from '@/modules/workspace/errors';
import { WorkspaceRepository } from '@/modules/workspace/repository';
import { WorkspaceRow } from '@/modules/workspace/types';
import { generateWorkspaceSlug } from '@/modules/workspace/utils';

@Injectable()
export class WorkspaceProvisioningService {
  constructor(private readonly repo: WorkspaceRepository) {}

  async ensureOwnedWorkspace(
    params: {
      ownerId: string;
      name: string;
      description?: string | null;
    },
    manager: EntityManager,
  ): Promise<WorkspaceRow> {
    const existingWorkspace = await this.repo.findWorkspaceByOwnerIdAndName(
      params.ownerId,
      params.name,
      manager,
    );
    if (existingWorkspace) {
      return existingWorkspace;
    }

    return this.createOwnedWorkspace(params, manager);
  }

  async createOwnedWorkspace(
    params: {
      ownerId: string;
      name: string;
      description?: string | null;
    },
    manager: EntityManager,
  ): Promise<WorkspaceRow> {
    const workspace = await this.createWorkspaceWithGeneratedSlug(
      params,
      manager,
    );

    await this.repo.createOwnerMembership(
      workspace.workspaceId,
      params.ownerId,
      manager,
    );

    return workspace;
  }

  private async createWorkspaceWithGeneratedSlug(
    params: {
      ownerId: string;
      name: string;
      description?: string | null;
    },
    manager: EntityManager,
  ): Promise<WorkspaceRow> {
    for (
      let attempt = 0;
      attempt < MAX_WORKSPACE_SLUG_GENERATION_ATTEMPTS;
      attempt += 1
    ) {
      const slug = generateWorkspaceSlug(params.name);

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
}
