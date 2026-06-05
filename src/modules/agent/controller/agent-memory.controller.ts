import {
  Body,
  Controller,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
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

@ApiTags('Workspace Agent')
@Controller(':workspaceId/agent-memories')
export class AgentMemoryController {
  constructor(private readonly usecase: AgentUseCase) {}

  @Post()
  @Authenticated()
  @ApiOperation({ summary: 'Upsert agent memory' })
  @ApiDataResponse(AgentMemoryResponseDto, { status: HttpStatus.CREATED })
  async upsertAgentMemory(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: UpsertAgentMemoryDto,
  ): Promise<AgentMemoryResponseDto> {
    return this.usecase.upsertAgentMemory(String(user.sub), workspaceId, dto);
  }

  @Put(':memoryId/embedding')
  @Authenticated()
  @ApiOperation({ summary: 'Upsert agent memory embedding' })
  @ApiDataResponse(AgentMemoryEmbeddingResponseDto)
  async upsertAgentMemoryEmbedding(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('memoryId', ParseUUIDPipe) memoryId: string,
    @Body() dto: UpsertAgentMemoryEmbeddingDto,
  ): Promise<AgentMemoryEmbeddingResponseDto> {
    return this.usecase.upsertAgentMemoryEmbedding(
      String(user.sub),
      workspaceId,
      memoryId,
      dto,
    );
  }
}
