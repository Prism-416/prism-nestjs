import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  DOCUMENT_EMBEDDING_DIMENSIONS,
  MAX_DOCUMENT_CHUNK_EMBEDDINGS_PER_APPEND,
  MAX_DOCUMENT_CHUNKS_PER_APPEND,
} from '@/modules/document/constants';
import { normalizeOptionalTrimmedString } from '@/modules/document/utils';

function normalizeOptionalTrimmedStringArray(value: unknown): unknown {
  if (value === undefined || value === null) {
    return value;
  }

  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item) => normalizeOptionalTrimmedString(item));
}

export class UploadDocumentDto {
  @ApiPropertyOptional({
    description: 'Defaults to the uploaded file name when omitted.',
  })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class SearchDocumentsQueryDto {
  @ApiPropertyOptional({
    description: 'Case-insensitive search against title and file name',
  })
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;

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

export class DocumentSummaryResponseDto {
  @ApiProperty()
  documentId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty()
  fileName!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty({ nullable: true })
  storageETag!: string | null;

  @ApiProperty({ nullable: true })
  storageVersionId!: string | null;

  @ApiProperty()
  createdBy!: string;

  @ApiProperty()
  updatedBy!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class SearchDocumentsResponseDto {
  @ApiProperty({ type: [DocumentSummaryResponseDto] })
  items!: DocumentSummaryResponseDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}

export class AppendDocumentChunkDto {
  @ApiProperty({ minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  chunkIndex!: number;

  @ApiPropertyOptional({ type: [String] })
  @Transform(({ value }) => normalizeOptionalTrimmedStringArray(value))
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(200, { each: true })
  headingPath?: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  contentHash!: string;

  @ApiPropertyOptional({ minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  tokenCount?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  charCount?: number;
}

export class AppendDocumentChunksDto {
  @ApiProperty({
    type: [AppendDocumentChunkDto],
    maxItems: MAX_DOCUMENT_CHUNKS_PER_APPEND,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_DOCUMENT_CHUNKS_PER_APPEND)
  @ValidateNested({ each: true })
  @Type(() => AppendDocumentChunkDto)
  chunks!: AppendDocumentChunkDto[];
}

export class DocumentChunkResponseDto {
  @ApiProperty()
  chunkId!: string;

  @ApiProperty()
  documentId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  chunkIndex!: number;

  @ApiProperty({ type: [String], nullable: true })
  headingPath!: string[] | null;

  @ApiProperty()
  contentHash!: string;

  @ApiProperty({ nullable: true })
  tokenCount!: number | null;

  @ApiProperty({ nullable: true })
  charCount!: number | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class AppendDocumentChunksResponseDto {
  @ApiProperty({ type: [DocumentChunkResponseDto] })
  items!: DocumentChunkResponseDto[];

  @ApiProperty()
  count!: number;
}

export class AppendDocumentChunkEmbeddingDto {
  @ApiProperty()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsUUID()
  chunkId!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  contentHash!: string;

  @ApiProperty()
  @Transform(({ value }) => normalizeOptionalTrimmedString(value as unknown))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  model!: string;

  @ApiPropertyOptional({
    default: DOCUMENT_EMBEDDING_DIMENSIONS,
    minimum: DOCUMENT_EMBEDDING_DIMENSIONS,
    maximum: DOCUMENT_EMBEDDING_DIMENSIONS,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(DOCUMENT_EMBEDDING_DIMENSIONS)
  @Max(DOCUMENT_EMBEDDING_DIMENSIONS)
  dimensions?: number;

  @ApiProperty({
    type: [Number],
    minItems: DOCUMENT_EMBEDDING_DIMENSIONS,
    maxItems: DOCUMENT_EMBEDDING_DIMENSIONS,
  })
  @IsArray()
  @ArrayMinSize(DOCUMENT_EMBEDDING_DIMENSIONS)
  @ArrayMaxSize(DOCUMENT_EMBEDDING_DIMENSIONS)
  @IsNumber({ allowInfinity: false, allowNaN: false }, { each: true })
  embedding!: number[];
}

export class AppendDocumentChunkEmbeddingsDto {
  @ApiProperty({
    type: [AppendDocumentChunkEmbeddingDto],
    maxItems: MAX_DOCUMENT_CHUNK_EMBEDDINGS_PER_APPEND,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_DOCUMENT_CHUNK_EMBEDDINGS_PER_APPEND)
  @ValidateNested({ each: true })
  @Type(() => AppendDocumentChunkEmbeddingDto)
  embeddings!: AppendDocumentChunkEmbeddingDto[];
}

export class DocumentChunkEmbeddingResponseDto {
  @ApiProperty()
  chunkId!: string;

  @ApiProperty()
  workspaceId!: string;

  @ApiProperty()
  projectId!: string;

  @ApiProperty()
  model!: string;

  @ApiProperty()
  dimensions!: number;

  @ApiProperty()
  contentHash!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  embeddedAt!: Date;
}

export class AppendDocumentChunkEmbeddingsResponseDto {
  @ApiProperty({ type: [DocumentChunkEmbeddingResponseDto] })
  items!: DocumentChunkEmbeddingResponseDto[];

  @ApiProperty()
  count!: number;
}
