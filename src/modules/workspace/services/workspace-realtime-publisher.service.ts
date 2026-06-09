import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import { WORKSPACE_REALTIME_EVENTS } from '@/modules/workspace/constants';
import {
  ProjectCreatedWorkspacePayloadDto,
  ProjectDeletedWorkspacePayloadDto,
  ProjectUpdatedWorkspacePayloadDto,
  SprintCreatedPayloadDto,
  SprintDeletedPayloadDto,
  SprintUpdatedPayloadDto,
  SprintWorkItemsChangedPayloadDto,
  WorkspaceDeletedPayloadDto,
  WorkspaceJobDeletedPayloadDto,
  WorkspaceJobsChangedPayloadDto,
  WorkspaceMemberCreatedPayloadDto,
  WorkspaceMemberRemovedPayloadDto,
  WorkspaceMemberUpdatedPayloadDto,
  WorkspaceUpdatedPayloadDto,
} from '@/modules/workspace/dto';
import { buildWorkspaceRoom } from '@/modules/workspace/utils';

@Injectable()
export class WorkspaceRealtimePublisherService {
  private server?: Server;

  bindServer(server: Server): void {
    this.server = server;
  }

  publishWorkspaceUpdated(payload: WorkspaceUpdatedPayloadDto): void {
    this.emitToWorkspace(
      payload.workspaceId,
      WORKSPACE_REALTIME_EVENTS.WORKSPACE_UPDATED,
      payload,
    );
  }

  publishWorkspaceDeleted(payload: WorkspaceDeletedPayloadDto): void {
    this.emitToWorkspace(
      payload.workspaceId,
      WORKSPACE_REALTIME_EVENTS.WORKSPACE_DELETED,
      payload,
    );
  }

  publishProjectCreated(payload: ProjectCreatedWorkspacePayloadDto): void {
    this.emitToWorkspace(
      payload.workspaceId,
      WORKSPACE_REALTIME_EVENTS.PROJECT_CREATED,
      payload,
    );
  }

  publishProjectUpdated(payload: ProjectUpdatedWorkspacePayloadDto): void {
    this.emitToWorkspace(
      payload.workspaceId,
      WORKSPACE_REALTIME_EVENTS.PROJECT_UPDATED,
      payload,
    );
  }

  publishProjectDeleted(payload: ProjectDeletedWorkspacePayloadDto): void {
    this.emitToWorkspace(
      payload.workspaceId,
      WORKSPACE_REALTIME_EVENTS.PROJECT_DELETED,
      payload,
    );
  }

  publishSprintCreated(payload: SprintCreatedPayloadDto): void {
    this.emitToWorkspace(
      payload.workspaceId,
      WORKSPACE_REALTIME_EVENTS.SPRINT_CREATED,
      payload,
    );
  }

  publishSprintUpdated(payload: SprintUpdatedPayloadDto): void {
    this.emitToWorkspace(
      payload.workspaceId,
      WORKSPACE_REALTIME_EVENTS.SPRINT_UPDATED,
      payload,
    );
  }

  publishSprintDeleted(payload: SprintDeletedPayloadDto): void {
    this.emitToWorkspace(
      payload.workspaceId,
      WORKSPACE_REALTIME_EVENTS.SPRINT_DELETED,
      payload,
    );
  }

  publishSprintWorkItemsChanged(
    payload: SprintWorkItemsChangedPayloadDto,
  ): void {
    this.emitToWorkspace(
      payload.workspaceId,
      WORKSPACE_REALTIME_EVENTS.SPRINT_WORK_ITEMS_CHANGED,
      payload,
    );
  }

  publishWorkspaceMemberCreated(
    payload: WorkspaceMemberCreatedPayloadDto,
  ): void {
    this.emitToWorkspace(
      payload.workspaceId,
      WORKSPACE_REALTIME_EVENTS.WORKSPACE_MEMBER_CREATED,
      payload,
    );
  }

  publishWorkspaceMemberUpdated(
    payload: WorkspaceMemberUpdatedPayloadDto,
  ): void {
    this.emitToWorkspace(
      payload.workspaceId,
      WORKSPACE_REALTIME_EVENTS.WORKSPACE_MEMBER_UPDATED,
      payload,
    );
  }

  publishWorkspaceMemberRemoved(
    payload: WorkspaceMemberRemovedPayloadDto,
  ): void {
    this.emitToWorkspace(
      payload.workspaceId,
      WORKSPACE_REALTIME_EVENTS.WORKSPACE_MEMBER_REMOVED,
      payload,
    );
  }

  publishWorkspaceJobsChanged(payload: WorkspaceJobsChangedPayloadDto): void {
    this.emitToWorkspace(
      payload.workspaceId,
      WORKSPACE_REALTIME_EVENTS.WORKSPACE_JOBS_CHANGED,
      payload,
    );
  }

  publishWorkspaceJobDeleted(payload: WorkspaceJobDeletedPayloadDto): void {
    this.emitToWorkspace(
      payload.workspaceId,
      WORKSPACE_REALTIME_EVENTS.WORKSPACE_JOB_DELETED,
      payload,
    );
  }

  private emitToWorkspace<TPayload>(
    workspaceId: string,
    event: string,
    payload: TPayload,
  ): void {
    this.server?.to(buildWorkspaceRoom(workspaceId)).emit(event, payload);
  }
}
