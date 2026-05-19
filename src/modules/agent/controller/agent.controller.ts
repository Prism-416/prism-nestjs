import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import {
  AgentRunResponseDto,
  SearchAgentRunsQueryDto,
  SearchAgentRunsResponseDto,
} from '@/modules/agent/dto';
import { AgentUseCase } from '@/modules/agent/usecases';

@ApiTags('Project Agent')
@Controller(':projectId/agent-runs')
export class AgentController {
  constructor(private readonly usecase: AgentUseCase) {}

  @Get()
  @Authenticated()
  @ApiOperation({ summary: 'Search project agent runs' })
  @ApiDataResponse(SearchAgentRunsResponseDto)
  async searchAgentRuns(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Query() query: SearchAgentRunsQueryDto,
  ): Promise<SearchAgentRunsResponseDto> {
    return this.usecase.searchAgentRuns(String(user.sub), projectId, query);
  }

  @Get(':runId')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve agent run metadata' })
  @ApiDataResponse(AgentRunResponseDto)
  async getAgentRun(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
  ): Promise<AgentRunResponseDto> {
    return this.usecase.getAgentRun(String(user.sub), projectId, runId);
  }
}
