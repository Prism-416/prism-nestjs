import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDate,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { INTERNAL_SCOPES, InternalScope } from '@/modules/admin/types';
import {
  normalizeOptionalTrimmedString,
  normalizeTrimmedString,
} from '@/modules/admin/utils';

export class CreateServiceAccountDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class UpdateServiceAccountDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}

export class CreateServiceApiTokenDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: INTERNAL_SCOPES, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(INTERNAL_SCOPES.length)
  @ArrayUnique()
  @IsString({ each: true })
  @IsIn(INTERNAL_SCOPES, { each: true })
  scopes!: InternalScope[];

  @ApiProperty({ format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  expiresAt!: Date;
}

export class UpdateServiceApiTokenDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: INTERNAL_SCOPES, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(INTERNAL_SCOPES.length)
  @ArrayUnique()
  @IsString({ each: true })
  @IsIn(INTERNAL_SCOPES, { each: true })
  scopes?: InternalScope[];

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}

export class IssueServiceApiTokenDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  serviceName!: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  serviceDescription?: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  tokenName!: string;

  @ApiProperty({ enum: INTERNAL_SCOPES, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(INTERNAL_SCOPES.length)
  @ArrayUnique()
  @IsString({ each: true })
  @IsIn(INTERNAL_SCOPES, { each: true })
  scopes!: InternalScope[];

  @ApiProperty({ format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  expiresAt!: Date;
}

export class ServiceAccountResponseDto {
  @ApiProperty()
  serviceAccountId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class ServiceApiTokenResponseDto {
  @ApiProperty()
  apiTokenId!: string;

  @ApiProperty()
  serviceAccountId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  tokenPrefix!: string;

  @ApiProperty({ enum: INTERNAL_SCOPES, isArray: true })
  scopes!: InternalScope[];

  @ApiProperty()
  expiresAt!: Date;

  @ApiProperty({ nullable: true })
  lastUsedAt!: Date | null;

  @ApiProperty({ nullable: true })
  revokedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class IssueServiceApiTokenResponseDto {
  @ApiProperty()
  token!: string;

  @ApiProperty({ type: ServiceApiTokenResponseDto })
  apiToken!: ServiceApiTokenResponseDto;
}
