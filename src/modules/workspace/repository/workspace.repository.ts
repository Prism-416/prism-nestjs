import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  WorkspaceInvitationEventRow,
  WorkspaceInvitationEventType,
  WorkspaceInvitationRow,
  WorkspaceListRow,
  WorkspaceMemberRow,
  WorkspaceProjectJobIdRow,
  WorkspaceProjectJobRow,
  WorkspaceRow,
  WorkspaceUserRow,
} from '@/modules/workspace/types';

@Injectable()
export class WorkspaceRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findWorkspaceByIdAndAdminUserId(
    workspaceId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<WorkspaceRow | null> {
    const workspaces = await this.getManager(manager).query<WorkspaceRow[]>(
      `
        SELECT
          w.workspace_id AS "workspaceId",
          w.name,
          w.slug,
          w.description,
          w.owner_id AS "ownerId",
          w.created_at AS "createdAt"
        FROM prism_workspaces_l w
               INNER JOIN prism_workspace_members_l wm
                          ON wm.workspace_id = w.workspace_id
        WHERE w.workspace_id = $1
          AND wm.user_id = $2
          AND wm.role = 'admin'
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        LIMIT 1
      `,
      [workspaceId, userId],
    );

    return workspaces[0] ?? null;
  }

  async findWorkspaceByIdAndMemberUserId(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceRow | null> {
    const workspaces = await this.dataSource.query<WorkspaceRow[]>(
      `
        SELECT
          w.workspace_id AS "workspaceId",
          w.name,
          w.slug,
          w.description,
          w.owner_id AS "ownerId",
          w.created_at AS "createdAt"
        FROM prism_workspaces_l w
               INNER JOIN prism_workspace_members_l wm
                          ON wm.workspace_id = w.workspace_id
        WHERE w.workspace_id = $1
          AND wm.user_id = $2
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        LIMIT 1
      `,
      [workspaceId, userId],
    );

    return workspaces[0] ?? null;
  }

  async findWorkspaceById(
    workspaceId: string,
    manager?: EntityManager,
  ): Promise<WorkspaceRow | null> {
    const workspaces = await this.getManager(manager).query<WorkspaceRow[]>(
      `
        SELECT
          workspace_id AS "workspaceId",
          name,
          slug,
          description,
          owner_id AS "ownerId",
          created_at AS "createdAt"
        FROM prism_workspaces_l
        WHERE workspace_id = $1
          AND deleted_at IS NULL
          AND status = 'active'
        LIMIT 1
      `,
      [workspaceId],
    );

    return workspaces[0] ?? null;
  }

  async findWorkspaceByOwnerIdAndName(
    ownerId: string,
    name: string,
    manager?: EntityManager,
  ): Promise<WorkspaceRow | null> {
    const workspaces = await this.getManager(manager).query<WorkspaceRow[]>(
      `
        SELECT
          workspace_id AS "workspaceId",
          name,
          slug,
          description,
          owner_id AS "ownerId",
          created_at AS "createdAt"
        FROM prism_workspaces_l
        WHERE owner_id = $1
          AND name = $2
          AND deleted_at IS NULL
          AND status = 'active'
        LIMIT 1
      `,
      [ownerId, name],
    );

    return workspaces[0] ?? null;
  }

  async findUserByEmail(
    email: string,
    manager?: EntityManager,
  ): Promise<WorkspaceUserRow | null> {
    const users = await this.getManager(manager).query<WorkspaceUserRow[]>(
      `
        SELECT
          u.user_id AS "userId",
          u.email,
          u.full_name AS "fullName",
          u.username
        FROM prism_users_l u
        WHERE LOWER(u.email) = LOWER($1)
          AND EXISTS (
            SELECT 1
            FROM prism_user_auths_l ua
            WHERE ua.user_id = u.user_id
              AND ua.is_verified = TRUE
          )
        LIMIT 1
      `,
      [email],
    );

    return users[0] ?? null;
  }

  async searchWorkspaceMemberCandidates(
    keyword: string,
    excludeUserId: string,
    workspaceId?: string,
    manager?: EntityManager,
  ): Promise<WorkspaceUserRow[]> {
    const containsKeyword = `%${keyword}%`;
    const prefixedKeyword = `${keyword}%`;

    return this.getManager(manager).query<WorkspaceUserRow[]>(
      `
        SELECT
          u.user_id AS "userId",
          u.email,
          u.full_name AS "fullName",
          u.username
        FROM prism_users_l u
        WHERE u.user_id <> $2
          AND EXISTS (
            SELECT 1
            FROM prism_user_auths_l ua
            WHERE ua.user_id = u.user_id
              AND ua.is_verified = TRUE
          )
          AND (
            u.username ILIKE $1
            OR u.full_name ILIKE $1
            OR u.email ILIKE $1
          )
          AND (
            $3::uuid IS NULL
            OR NOT EXISTS (
              SELECT 1
              FROM prism_workspace_members_l wm
              WHERE wm.workspace_id = $3
                AND wm.user_id = u.user_id
            )
          )
        ORDER BY
          CASE
            WHEN LOWER(u.username) = LOWER($5) THEN 0
            WHEN LOWER(u.full_name) = LOWER($5) THEN 1
            WHEN LOWER(u.email) = LOWER($5) THEN 2
            WHEN u.username ILIKE $4 THEN 3
            WHEN u.full_name ILIKE $4 THEN 4
            WHEN u.email ILIKE $4 THEN 5
            ELSE 6
          END,
          u.username,
          u.email
        LIMIT 10
      `,
      [
        containsKeyword,
        excludeUserId,
        workspaceId ?? null,
        prefixedKeyword,
        keyword,
      ],
    );
  }

  async findWorkspacesByMemberUserId(
    userId: string,
  ): Promise<WorkspaceListRow[]> {
    return this.dataSource.query<WorkspaceListRow[]>(
      `
        SELECT
          w.workspace_id AS "workspaceId",
          w.name,
          w.slug,
          w.description,
          w.owner_id AS "ownerId",
          (
            SELECT COUNT(*)::int
            FROM prism_workspace_members_l wm_count
            WHERE wm_count.workspace_id = w.workspace_id
          ) AS "memberCount",
          (
            SELECT COUNT(*)::int
            FROM prism_projects_l p
            WHERE p.workspace_id = w.workspace_id
          ) AS "projectCount",
          w.created_at AS "createdAt"
        FROM prism_workspaces_l w
               INNER JOIN prism_workspace_members_l wm
                          ON wm.workspace_id = w.workspace_id
        WHERE wm.user_id = $1
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        ORDER BY w.created_at DESC
      `,
      [userId],
    );
  }

  async findWorkspaceMembersByWorkspaceId(
    workspaceId: string,
  ): Promise<WorkspaceMemberRow[]> {
    return this.dataSource.query<WorkspaceMemberRow[]>(
      `
        SELECT
          u.user_id AS "userId",
          u.full_name AS "fullName",
          u.username,
          wm.role,
          wm.joined_at AS "joinedAt",
          wm.invited_at AS "invitedAt"
        FROM prism_workspace_members_l wm
               INNER JOIN prism_users_l u
                          ON u.user_id = wm.user_id
        WHERE wm.workspace_id = $1
        ORDER BY
          CASE wm.role
            WHEN 'admin' THEN 0
            WHEN 'member' THEN 1
            ELSE 2
            END,
          u.username
      `,
      [workspaceId],
    );
  }

  async findWorkspaceMember(
    workspaceId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<WorkspaceMemberRow | null> {
    const members = await this.getManager(manager).query<WorkspaceMemberRow[]>(
      `
        SELECT
          u.user_id AS "userId",
          u.full_name AS "fullName",
          u.username,
          wm.role,
          wm.joined_at AS "joinedAt",
          wm.invited_at AS "invitedAt"
        FROM prism_workspace_members_l wm
               INNER JOIN prism_users_l u
                          ON u.user_id = wm.user_id
        WHERE wm.workspace_id = $1
          AND wm.user_id = $2
        LIMIT 1
      `,
      [workspaceId, userId],
    );

    return members[0] ?? null;
  }

  async deleteProjectMembersByWorkspaceMemberUserId(
    workspaceId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const deletedMembers = await this.getManager(manager).query<
      Array<{ memberId: string }>
    >(
      `
        DELETE FROM prism_project_members_l
        WHERE workspace_id = $1
          AND user_id = $2
        RETURNING member_id AS "memberId"
      `,
      [workspaceId, userId],
    );

    return deletedMembers.length;
  }

  async deleteWorkspaceMemberByUserId(
    workspaceId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const [deletedMember] = await this.getManager(manager).query<
      Array<{ userId: string }>
    >(
      `
        DELETE FROM prism_workspace_members_l
        WHERE workspace_id = $1
          AND user_id = $2
        RETURNING user_id AS "userId"
      `,
      [workspaceId, userId],
    );

    return Boolean(deletedMember);
  }

  async updateWorkspaceMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceMemberRow['role'],
    manager?: EntityManager,
  ): Promise<WorkspaceMemberRow> {
    const members = await this.getManager(manager).query<WorkspaceMemberRow[]>(
      `
        UPDATE prism_workspace_members_l wm
        SET role = $3
        FROM prism_users_l u
        WHERE wm.workspace_id = $1
          AND wm.user_id = $2
          AND u.user_id = wm.user_id
        RETURNING
          wm.user_id AS "userId",
          u.full_name AS "fullName",
          u.username,
          wm.role,
          wm.joined_at AS "joinedAt",
          wm.invited_at AS "invitedAt"
      `,
      [workspaceId, userId, role],
    );

    return members[0];
  }

  async updateWorkspaceOwner(
    workspaceId: string,
    ownerId: string,
    manager?: EntityManager,
  ): Promise<WorkspaceRow> {
    const workspaces = await this.getManager(manager).query<WorkspaceRow[]>(
      `
        UPDATE prism_workspaces_l
        SET owner_id = $2
        WHERE workspace_id = $1
        RETURNING
          workspace_id AS "workspaceId",
          name,
          slug,
          description,
          owner_id AS "ownerId",
          created_at AS "createdAt"
      `,
      [workspaceId, ownerId],
    );

    return workspaces[0];
  }

  async findUserById(
    userId: string,
    manager?: EntityManager,
  ): Promise<WorkspaceUserRow | null> {
    const users = await this.getManager(manager).query<WorkspaceUserRow[]>(
      `
        SELECT
          u.user_id AS "userId",
          u.email,
          u.full_name AS "fullName",
          u.username
        FROM prism_users_l u
        WHERE u.user_id = $1
          AND EXISTS (
            SELECT 1
            FROM prism_user_auths_l ua
            WHERE ua.user_id = u.user_id
              AND ua.is_verified = TRUE
          )
        LIMIT 1
      `,
      [userId],
    );

    return users[0] ?? null;
  }

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

  async createWorkspaceInvitation(
    params: {
      workspaceId: string;
      senderId: string;
      receiverId: string;
      role: WorkspaceMemberRow['role'];
      token: string;
      expiresAt: Date;
    },
    manager?: EntityManager,
  ): Promise<WorkspaceInvitationRow> {
    const invitations = await this.getManager(manager).query<
      WorkspaceInvitationRow[]
    >(
      `
        INSERT INTO prism_workspace_invitations_l (
          workspace_id,
          sender_id,
          receiver_id,
          role,
          invitation_token,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (workspace_id, receiver_id)
        DO UPDATE SET
          sender_id = EXCLUDED.sender_id,
          role = EXCLUDED.role,
          invitation_token = EXCLUDED.invitation_token,
          expires_at = EXCLUDED.expires_at
        RETURNING
          invitation_id AS "invitationId",
          workspace_id AS "workspaceId",
          sender_id AS "senderId",
          receiver_id AS "receiverId",
          role,
          invitation_token AS "token",
          expires_at AS "expiresAt",
          created_at AS "createdAt"
      `,
      [
        params.workspaceId,
        params.senderId,
        params.receiverId,
        params.role,
        params.token,
        params.expiresAt,
      ],
    );

    return invitations[0];
  }

  async findWorkspaceInvitationByToken(
    token: string,
    manager?: EntityManager,
  ): Promise<WorkspaceInvitationRow | null> {
    const invitations = await this.getManager(manager).query<
      WorkspaceInvitationRow[]
    >(
      `
        SELECT
          invitation_id AS "invitationId",
          workspace_id AS "workspaceId",
          sender_id AS "senderId",
          receiver_id AS "receiverId",
          role,
          invitation_token AS "token",
          expires_at AS "expiresAt",
          created_at AS "createdAt"
        FROM prism_workspace_invitations_l
        WHERE invitation_token = $1
        LIMIT 1
      `,
      [token],
    );

    return invitations[0] ?? null;
  }

  async createWorkspaceMembership(
    params: {
      workspaceId: string;
      userId: string;
      role: WorkspaceMemberRow['role'];
      invitedAt: Date;
    },
    manager?: EntityManager,
  ): Promise<void> {
    await this.getManager(manager).query(
      `
        INSERT INTO prism_workspace_members_l (
          workspace_id,
          user_id,
          role,
          invited_at,
          joined_at
        )
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `,
      [params.workspaceId, params.userId, params.role, params.invitedAt],
    );
  }

  async createProjectJobs(
    params: {
      workspaceId: string;
      jobs: Array<{
        name: string;
        description: string;
      }>;
    },
    manager?: EntityManager,
  ): Promise<WorkspaceProjectJobRow[]> {
    if (params.jobs.length === 0) {
      return [];
    }

    const jobNames = params.jobs.map((job) => job.name);
    const jobDescriptions = params.jobs.map((job) => job.description);

    return await this.getManager(manager).query<WorkspaceProjectJobRow[]>(
      `
        INSERT INTO prism_project_jobs_l (
          workspace_id,
          name,
          description
        )
        SELECT
          $1,
          input.name,
          input.description
        FROM unnest($2::text[], $3::text[]) AS input(name, description)
        RETURNING
          job_id AS "jobId",
          workspace_id AS "workspaceId",
          name,
          description,
          created_at AS "createdAt"
      `,
      [params.workspaceId, jobNames, jobDescriptions],
    );
  }

  async findProjectJobsByIds(
    workspaceId: string,
    jobIds: string[],
    manager?: EntityManager,
  ): Promise<WorkspaceProjectJobIdRow[]> {
    if (jobIds.length === 0) {
      return [];
    }

    return this.getManager(manager).query<WorkspaceProjectJobIdRow[]>(
      `
        SELECT
          job_id AS "jobId"
        FROM prism_project_jobs_l
        WHERE workspace_id = $1
          AND job_id = ANY($2::uuid[])
      `,
      [workspaceId, jobIds],
    );
  }

  async findProjectJobsByWorkspaceId(
    workspaceId: string,
    manager?: EntityManager,
  ): Promise<WorkspaceProjectJobRow[]> {
    return this.getManager(manager).query<WorkspaceProjectJobRow[]>(
      `
        SELECT
          job_id AS "jobId",
          workspace_id AS "workspaceId",
          name,
          description,
          created_at AS "createdAt"
        FROM prism_project_jobs_l
        WHERE workspace_id = $1
      `,
      [workspaceId],
    );
  }

  async updateProjectJobs(
    params: {
      workspaceId: string;
      jobs: Array<{
        jobId: string;
        name: string;
        description: string;
      }>;
    },
    manager?: EntityManager,
  ): Promise<WorkspaceProjectJobRow[]> {
    if (params.jobs.length === 0) {
      return [];
    }

    const jobIds = params.jobs.map((job) => job.jobId);
    const jobNames = params.jobs.map((job) => job.name);
    const jobDescriptions = params.jobs.map((job) => job.description);

    return this.getManager(manager).query<WorkspaceProjectJobRow[]>(
      `
        UPDATE prism_project_jobs_l pj
        SET
          name = input.name,
          description = input.description
        FROM unnest(
          $2::uuid[],
          $3::text[],
          $4::text[]
        ) AS input(job_id, name, description)
        WHERE pj.workspace_id = $1
          AND pj.job_id = input.job_id
        RETURNING
          pj.job_id AS "jobId",
          pj.workspace_id AS "workspaceId",
          pj.name,
          pj.description,
          pj.created_at AS "createdAt"
      `,
      [params.workspaceId, jobIds, jobNames, jobDescriptions],
    );
  }

  async createWorkspaceInvitationEvent(
    params: {
      invitationId: string;
      actorId?: string | null;
      eventType: WorkspaceInvitationEventType;
    },
    manager?: EntityManager,
  ): Promise<WorkspaceInvitationEventRow> {
    const events = await this.getManager(manager).query<
      WorkspaceInvitationEventRow[]
    >(
      `
        INSERT INTO prism_workspace_invitation_events_l (
          invitation_id,
          actor_id,
          event_type
        )
        VALUES ($1, $2, $3)
        RETURNING
          event_id AS "eventId",
          invitation_id AS "invitationId",
          actor_id AS "actorId",
          event_type AS "eventType",
          created_at AS "createdAt"
      `,
      [params.invitationId, params.actorId, params.eventType],
    );

    return events[0];
  }

  async updateWorkspace(
    params: {
      workspaceId: string;
      name: string;
      description: string | null;
    },
    manager?: EntityManager,
  ): Promise<WorkspaceRow> {
    const workspaces = await this.getManager(manager).query<WorkspaceRow[]>(
      `
        UPDATE prism_workspaces_l
        SET name = $2,
            description = $3
        WHERE workspace_id = $1
        RETURNING
          workspace_id AS "workspaceId",
          name,
          slug,
          description,
          owner_id AS "ownerId",
          created_at AS "createdAt"
      `,
      [params.workspaceId, params.name, params.description],
    );

    return workspaces[0];
  }

  async markWorkspaceDeletedByIdAndOwnerId(
    workspaceId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<boolean> {
    const [deletedWorkspace] = await this.getManager(manager).query<
      Array<{ workspaceId: string }>
    >(
      `
        UPDATE prism_workspaces_l w
        SET status = 'deleted',
            deleted_at = NOW()
        WHERE w.workspace_id = $1
          AND w.owner_id = $2
          AND w.deleted_at IS NULL
          AND w.status = 'active'
        RETURNING w.workspace_id AS "workspaceId"
      `,
      [workspaceId, userId],
    );

    return Boolean(deletedWorkspace);
  }

  async restoreWorkspaceByIdAndOwnerId(
    workspaceId: string,
    userId: string,
    manager?: EntityManager,
  ): Promise<WorkspaceRow | null> {
    const workspaces = await this.getManager(manager).query<WorkspaceRow[]>(
      `
        UPDATE prism_workspaces_l w
        SET status = 'active',
            deleted_at = NULL
        WHERE w.workspace_id = $1
          AND w.owner_id = $2
          AND w.deleted_at IS NOT NULL
          AND w.status = 'deleted'
        RETURNING
          w.workspace_id AS "workspaceId",
          w.name,
          w.slug,
          w.description,
          w.owner_id AS "ownerId",
          w.created_at AS "createdAt"
      `,
      [workspaceId, userId],
    );

    return workspaces[0] ?? null;
  }

  private getManager(manager?: EntityManager): DataSource | EntityManager {
    return manager ?? this.dataSource;
  }
}
