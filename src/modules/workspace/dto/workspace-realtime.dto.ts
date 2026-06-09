import { IsUUID } from 'class-validator';
import { ProjectResponseDto } from '@/modules/project/dto';
import { SprintResponseDto } from '@/modules/sprint/dto';
import {
  WorkspaceJobResponseDto,
  WorkspaceMemberResponseDto,
  WorkspaceResponseDto,
} from '@/modules/workspace/dto/workspace.dto';

export class JoinWorkspaceDto {
  @IsUUID()
  workspaceId!: string;
}

export class LeaveWorkspaceDto {
  @IsUUID()
  workspaceId!: string;
}

export class WorkspaceJoinedPayloadDto {
  workspaceId!: string;
}

export class WorkspaceLeftPayloadDto {
  workspaceId!: string;
}

export class WorkspaceDeletedPayloadDto {
  workspaceId!: string;
}

export class ProjectDeletedWorkspacePayloadDto {
  workspaceId!: string;
  projectId!: string;
}

export class SprintDeletedPayloadDto {
  workspaceId!: string;
  sprintId!: string;
}

export class SprintWorkItemsChangedPayloadDto {
  workspaceId!: string;
  sprintId!: string;
  itemIds!: string[];
}

export class WorkspaceMemberRemovedPayloadDto {
  workspaceId!: string;
  userId!: string;
}

export class WorkspaceJobDeletedPayloadDto {
  workspaceId!: string;
  jobId!: string;
}

export class WorkspaceUpdatedPayloadDto extends WorkspaceResponseDto {}

export class ProjectCreatedWorkspacePayloadDto extends ProjectResponseDto {}

export class ProjectUpdatedWorkspacePayloadDto extends ProjectResponseDto {}

export class SprintCreatedPayloadDto extends SprintResponseDto {}

export class SprintUpdatedPayloadDto extends SprintResponseDto {}

export class WorkspaceMemberCreatedPayloadDto extends WorkspaceMemberResponseDto {
  workspaceId!: string;
}

export class WorkspaceMemberUpdatedPayloadDto extends WorkspaceMemberResponseDto {
  workspaceId!: string;
}

export class WorkspaceJobsChangedPayloadDto {
  workspaceId!: string;
  jobs!: WorkspaceJobResponseDto[];
}
