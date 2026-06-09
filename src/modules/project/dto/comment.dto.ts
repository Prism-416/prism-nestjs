import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PROJECT_EMBEDDING_DIMENSIONS } from '@/modules/project/constants';
import { DocumentSummaryResponseDto } from '@/modules/document/dto';
import { normalizeTrimmedString } from '@/modules/project/utils';

export class CreateCommentDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body!: string;
}

export class SearchCommentsQueryDto {
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

export class CommentResponseDto {
  @ApiProperty()
  commentId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  itemId!: string;

  @ApiProperty()
  authorUserId!: string;

  @ApiProperty()
  body!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ nullable: true })
  updatedAt!: Date | null;

  @ApiProperty({ type: [DocumentSummaryResponseDto], required: false })
  attachments?: DocumentSummaryResponseDto[];
}

export class SearchCommentsResponseDto {
  @ApiProperty({ type: [CommentResponseDto] })
  comments!: CommentResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}

export class UpsertWorkItemCommentEmbeddingDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  embeddedBody!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  contentHash!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model!: string;

  @ApiPropertyOptional({
    default: PROJECT_EMBEDDING_DIMENSIONS,
    minimum: PROJECT_EMBEDDING_DIMENSIONS,
    maximum: PROJECT_EMBEDDING_DIMENSIONS,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(PROJECT_EMBEDDING_DIMENSIONS)
  @Max(PROJECT_EMBEDDING_DIMENSIONS)
  dimensions?: number;

  @ApiProperty({
    type: [Number],
    minItems: PROJECT_EMBEDDING_DIMENSIONS,
    maxItems: PROJECT_EMBEDDING_DIMENSIONS,
  })
  @IsArray()
  @ArrayMinSize(PROJECT_EMBEDDING_DIMENSIONS)
  @ArrayMaxSize(PROJECT_EMBEDDING_DIMENSIONS)
  @IsNumber({ allowInfinity: false, allowNaN: false }, { each: true })
  embedding!: number[];
}

export class WorkItemCommentEmbeddingResponseDto {
  @ApiProperty()
  commentId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  itemId!: string;

  @ApiProperty()
  embeddedBody!: string;

  @ApiProperty()
  contentHash!: string;

  @ApiProperty()
  model!: string;

  @ApiProperty()
  dimensions!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  embeddedAt!: Date;
}
