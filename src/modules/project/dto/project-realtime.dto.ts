import { IsUUID } from 'class-validator';
import { CommentResponseDto } from '@/modules/project/dto/comment.dto';
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

export class WorkItemsReorderedPayloadDto {
  projectId!: string;

  workItems!: WorkItemResponseDto[];
}

export class WorkItemDeletedPayloadDto {
  projectId!: string;

  itemId!: string;
}

export class CommentCreatedPayloadDto extends CommentResponseDto {}

export class CommentUpdatedPayloadDto extends CommentResponseDto {}

export class CommentDeletedPayloadDto {
  projectId!: string;

  itemId!: string;

  commentId!: string;
}

export class DocumentCreatedPayloadDto {
  documentId!: string;

  workspaceId!: string;

  projectId!: string;

  title!: string;

  description!: string | null;

  fileName!: string;

  contentType!: string;

  sizeBytes!: number;

  createdBy!: string;

  createdAt!: Date;
}

export class DocumentDeletedPayloadDto {
  projectId!: string;

  documentId!: string;
}
