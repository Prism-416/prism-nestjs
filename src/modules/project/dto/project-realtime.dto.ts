import { IsUUID } from 'class-validator';
import { ProjectResponseDto } from '@/modules/project/dto/project.dto';

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
