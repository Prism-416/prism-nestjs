import { ApiProperty } from '@nestjs/swagger';

export class EmbeddingCoverageSummaryResponseDto {
  @ApiProperty()
  generatedAt!: Date;

  @ApiProperty()
  totalTargets!: number;

  @ApiProperty()
  embeddedTargets!: number;

  @ApiProperty()
  currentEmbeddings!: number;

  @ApiProperty()
  missingEmbeddings!: number;

  @ApiProperty()
  staleEmbeddings!: number;

  @ApiProperty()
  documentChunkTargets!: number;

  @ApiProperty()
  documentChunkCurrentEmbeddings!: number;

  @ApiProperty()
  documentChunkMissingEmbeddings!: number;

  @ApiProperty()
  documentChunkStaleEmbeddings!: number;

  @ApiProperty()
  workItemTargets!: number;

  @ApiProperty()
  workItemCurrentEmbeddings!: number;

  @ApiProperty()
  workItemMissingEmbeddings!: number;

  @ApiProperty()
  workItemStaleEmbeddings!: number;

  @ApiProperty()
  workItemCommentTargets!: number;

  @ApiProperty()
  workItemCommentCurrentEmbeddings!: number;

  @ApiProperty()
  workItemCommentMissingEmbeddings!: number;

  @ApiProperty()
  workItemCommentStaleEmbeddings!: number;

  @ApiProperty()
  agentMemoryTargets!: number;

  @ApiProperty()
  agentMemoryCurrentEmbeddings!: number;

  @ApiProperty()
  agentMemoryMissingEmbeddings!: number;

  @ApiProperty()
  agentMemoryStaleEmbeddings!: number;

  @ApiProperty()
  projectsWithMissingEmbeddings!: number;

  @ApiProperty()
  projectsWithStaleEmbeddings!: number;
}
