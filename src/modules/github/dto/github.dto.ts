import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches } from 'class-validator';

export class GithubInstallationCallbackQueryDto {
  @ApiProperty()
  @IsString()
  state!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\d+$/)
  installation_id?: string;

  @ApiPropertyOptional({ enum: ['install', 'update'] })
  @IsOptional()
  @IsString()
  @IsIn(['install', 'update'])
  setup_action?: 'install' | 'update';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error_description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error_uri?: string;
}

export class GithubInstallationAuthorizeResponseDto {
  @ApiProperty()
  authorizationUrl!: string;

  @ApiProperty()
  state!: string;

  @ApiProperty()
  expiresAt!: Date;
}

export class GithubRepositoryOptionResponseDto {
  @ApiProperty()
  githubRepositoryId!: string;

  @ApiProperty({ nullable: true })
  nodeId!: string | null;

  @ApiProperty()
  owner!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  htmlUrl!: string;

  @ApiProperty({ nullable: true })
  defaultBranch!: string | null;

  @ApiProperty({ enum: ['public', 'private', 'internal'], nullable: true })
  visibility!: 'public' | 'private' | 'internal' | null;

  @ApiProperty()
  private!: boolean;

  @ApiProperty()
  archived!: boolean;
}

export class GithubInstallationCallbackResponseDto {
  @ApiProperty()
  redirectUrl!: string;
}
