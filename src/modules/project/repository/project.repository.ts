import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { ProjectRow } from '@/modules/project/types';

@Injectable()
export class ProjectRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createProject(
    params: {
      workspaceId: string;
      name: string;
      slug: string;
      description?: string;
    },
    manager?: EntityManager,
  ): Promise<ProjectRow> {
    const projects = await this.getManager(manager).query<ProjectRow[]>(
      `
        INSERT INTO prism_projects_l (
          workspace_id,
          name,
          slug,
          description,
          timezone,
          locale
        )
        SELECT
          w.workspace_id,
          $2,
          $3,
          $4,
          w.timezone,
          w.locale
        FROM prism_workspaces_l w
        WHERE w.workspace_id = $1
        RETURNING
          project_id AS "projectId",
          workspace_id AS "workspaceId",
          name,
          slug,
          description,
          timezone,
          locale,
          created_at AS "createdAt"
      `,
      [
        params.workspaceId,
        params.name,
        params.slug,
        params.description ?? null,
      ],
    );

    return projects[0];
  }

  async createProjectMember(
    params: {
      workspaceId: string;
      projectId: string;
      userId: string;
    },
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        INSERT INTO prism_project_members_l (
          workspace_id,
          project_id,
          user_id
        )
        VALUES ($1, $2, $3)
      `,
      [params.workspaceId, params.projectId, params.userId],
    );
  }

  private getManager(manager?: EntityManager): DataSource | EntityManager {
    return manager ?? this.dataSource;
  }
}
