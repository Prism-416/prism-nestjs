import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsDate,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  INTERNAL_API_TOKEN_INVENTORY_STATUSES,
  INTERNAL_SCOPES,
} from '@/modules/admin/types';
import type {
  InternalApiTokenInventoryStatus,
  InternalScope,
} from '@/modules/admin/types';
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

export class SearchServiceApiTokensQueryDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsUUID()
  serviceAccountId?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serviceName?: string;

  @ApiPropertyOptional({ enum: INTERNAL_API_TOKEN_INVENTORY_STATUSES })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsIn(INTERNAL_API_TOKEN_INVENTORY_STATUSES)
  status?: InternalApiTokenInventoryStatus;

  @ApiPropertyOptional({ format: 'date-time' })
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  expiresBefore?: Date;

  @ApiPropertyOptional({ format: 'date-time' })
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  lastUsedBefore?: Date;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class GetServiceApiTokenHealthQueryDto {
  @ApiPropertyOptional({ default: 30, minimum: 1, maximum: 365 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiringWithinDays?: number;

  @ApiPropertyOptional({ default: 90, minimum: 1, maximum: 3650 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  staleAfterDays?: number;
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

export class ServiceApiTokenInventoryResponseDto extends ServiceApiTokenResponseDto {
  @ApiProperty()
  serviceAccountName!: string;

  @ApiProperty()
  serviceAccountActive!: boolean;

  @ApiProperty({ enum: INTERNAL_API_TOKEN_INVENTORY_STATUSES })
  status!: InternalApiTokenInventoryStatus;
}

export class SearchServiceApiTokensResponseDto {
  @ApiProperty({ type: [ServiceApiTokenInventoryResponseDto] })
  items!: ServiceApiTokenInventoryResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}

export class ServiceApiTokenHealthSummaryResponseDto {
  @ApiProperty()
  generatedAt!: Date;

  @ApiProperty()
  expiringWithinDays!: number;

  @ApiProperty()
  staleAfterDays!: number;

  @ApiProperty()
  totalTokens!: number;

  @ApiProperty()
  activeTokens!: number;

  @ApiProperty()
  expiredTokens!: number;

  @ApiProperty()
  revokedTokens!: number;

  @ApiProperty()
  expiringSoonTokens!: number;

  @ApiProperty()
  neverUsedActiveTokens!: number;

  @ApiProperty()
  staleActiveTokens!: number;

  @ApiProperty()
  activeTokensOnInactiveAccounts!: number;
}
