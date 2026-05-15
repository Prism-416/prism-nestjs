import { IsUUID } from 'class-validator';

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
