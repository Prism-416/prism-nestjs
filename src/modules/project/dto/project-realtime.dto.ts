import { IsUUID } from 'class-validator';
import { ProjectResponseDto } from '@/modules/project/dto/project.dto';
import { WorkItemResponseDto } from '@/modules/project/dto/work-item.dto';

export class JoinProjectDto {
  @IsUUID()
  projectId!: string;
}

export class LeaveProjectDto {
  @IsUUID()
  projectId!: string;
}

export class ProjectJoinedPayloadDto {
  projectId!: string;
}

export class ProjectLeftPayloadDto {
  projectId!: string;
}

export class ProjectUpdatedPayloadDto extends ProjectResponseDto {}

export class ProjectDeletedPayloadDto {
  projectId!: string;
}

export class WorkItemCreatedPayloadDto extends WorkItemResponseDto {}

export class WorkItemUpdatedPayloadDto extends WorkItemResponseDto {}

export class WorkItemDeletedPayloadDto {
  projectId!: string;

  itemId!: string;
}
