import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  SprintProjectRow,
  SprintRow,
  SprintStatus,
} from '@/modules/sprint/types';

@Injectable()
export class SprintRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findProjectByIdAndMemberUserId(
    projectId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<SprintProjectRow | null> {
    const projects = await this.getManager(manager).query<SprintProjectRow[]>(
      `
        SELECT
          p.project_id AS "projectId"
        FROM prism_projects_l p
               INNER JOIN prism_workspaces_l w
                          ON w.workspace_id = p.workspace_id
               INNER JOIN prism_workspace_members_l wm
                          ON wm.workspace_id = p.workspace_id
        WHERE p.project_id = $1
          AND wm.user_id = $2
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        LIMIT 1
      `,
      [projectId, userId],
    );

    return projects[0] ?? null;
  }

  async createSprint(
    params: {
      projectId: string;
      name: string;
      description?: string;
      startsAt: Date;
      endsAt: Date;
      status: SprintStatus;
    },
    manager?: EntityManager,
  ): Promise<SprintRow> {
    const sprints = await this.getManager(manager).query<SprintRow[]>(
      `
        INSERT INTO prism_sprints_l (
          project_id,
          sprint_name,
          description,
          starts_at,
          ends_at,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
          sprint_id AS "sprintId",
          project_id AS "projectId",
          sprint_name AS "name",
          description,
          starts_at AS "startsAt",
          ends_at AS "endsAt",
          status,
          created_at AS "createdAt"
      `,
      [
        params.projectId,
        params.name,
        params.description ?? null,
        params.startsAt,
        params.endsAt,
        params.status,
      ],
    );

    return sprints[0];
  }

  private getManager(manager?: EntityManager): DataSource | EntityManager {
    return manager ?? this.dataSource;
  }
}
