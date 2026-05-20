import { Body, Controller, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import {
  AgentMemoryEmbeddingResponseDto,
  AgentMemoryResponseDto,
  UpsertAgentMemoryDto,
  UpsertAgentMemoryEmbeddingDto,
} from '@/modules/agent/dto';
import { AgentUseCase } from '@/modules/agent/usecases';

@ApiTags('Project Agent')
@Controller(':projectId/agent-memories')
export class AgentMemoryController {
  constructor(private readonly usecase: AgentUseCase) {}

  @Post()
  @Authenticated()
  @ApiOperation({ summary: 'Upsert agent memory' })
  @ApiDataResponse(AgentMemoryResponseDto, { status: HttpStatus.CREATED })
  async upsertAgentMemory(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: UpsertAgentMemoryDto,
  ): Promise<AgentMemoryResponseDto> {
    return this.usecase.upsertAgentMemory(String(user.sub), projectId, dto);
  }

  @Put(':memoryId/embedding')
  @Authenticated()
  @ApiOperation({ summary: 'Upsert agent memory embedding' })
  @ApiDataResponse(AgentMemoryEmbeddingResponseDto)
  async upsertAgentMemoryEmbedding(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('memoryId') memoryId: string,
    @Body() dto: UpsertAgentMemoryEmbeddingDto,
  ): Promise<AgentMemoryEmbeddingResponseDto> {
    return this.usecase.upsertAgentMemoryEmbedding(
      String(user.sub),
      projectId,
      memoryId,
      dto,
    );
  }
}
