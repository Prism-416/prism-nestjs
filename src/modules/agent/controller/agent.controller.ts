import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import {
  AgentRunResponseDto,
  AgentStepResponseDto,
  CreateAgentRunDto,
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

  @Post()
  @Authenticated()
  @ApiOperation({ summary: 'Create manual agent run' })
  @ApiDataResponse(AgentRunResponseDto, { status: HttpStatus.CREATED })
  async createAgentRun(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: CreateAgentRunDto,
  ): Promise<AgentRunResponseDto> {
    return this.usecase.createAgentRun(String(user.sub), projectId, dto);
  }

  @Post(':runId/cancel')
  @Authenticated()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel agent run' })
  @ApiDataResponse(AgentRunResponseDto)
  async cancelAgentRun(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
  ): Promise<AgentRunResponseDto> {
    return this.usecase.cancelAgentRun(String(user.sub), projectId, runId);
  }

  @Get(':runId/steps')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve agent run steps' })
  @ApiDataResponse(AgentStepResponseDto, { isArray: true })
  async getAgentRunSteps(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('runId') runId: string,
  ): Promise<AgentStepResponseDto[]> {
    return this.usecase.getAgentRunSteps(String(user.sub), projectId, runId);
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
