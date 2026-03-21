import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { WorkspaceRow } from '@/modules/workspace/types';

@Injectable()
export class WorkspaceRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createWorkspace(
    params: {
      name: string;
      slug: string;
      description?: string;
      ownerId: string;
    },
    manager?: EntityManager,
  ): Promise<WorkspaceRow> {
    const workspaces = await this.getManager(manager).query<WorkspaceRow[]>(
      `
        INSERT INTO prism_workspaces_l (name, slug, description, owner_id)
        VALUES ($1, $2, $3, $4)
        RETURNING
          workspace_id AS "workspaceId",
          name,
          slug,
          description,
          owner_id AS "ownerId",
          created_at AS "createdAt"
      `,
      [params.name, params.slug, params.description ?? null, params.ownerId],
    );

    return workspaces[0];
  }

  async createOwnerMembership(
    workspaceId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        INSERT INTO prism_workspace_members_l (workspace_id, user_id, role)
        VALUES ($1, $2, 'admin')
      `,
      [workspaceId, userId],
    );
  }

  private getManager(manager?: EntityManager): DataSource | EntityManager {
    return manager ?? this.dataSource;
  }
}
