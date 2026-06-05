import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import { RequireInternalScopes } from '@/modules/admin';
import {
  AgentActionResponseDto,
  AgentRunResponseDto,
  AgentStepResponseDto,
  CreateAgentRunDto,
  SearchAgentRunsQueryDto,
  SearchAgentRunsResponseDto,
  UpdateAgentRunStatusForInternalDto,
  UpsertAgentActionForInternalDto,
  UpsertAgentStepForInternalDto,
} from '@/modules/agent/dto';
import { AgentUseCase } from '@/modules/agent/usecases';

@ApiTags('Workspace Agent')
@Controller(':workspaceId/agent-runs')
export class AgentController {
  constructor(private readonly usecase: AgentUseCase) {}

  @Get()
  @Authenticated()
  @ApiOperation({ summary: 'Search workspace agent runs' })
  @ApiDataResponse(SearchAgentRunsResponseDto)
  async searchAgentRuns(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Query() query: SearchAgentRunsQueryDto,
  ): Promise<SearchAgentRunsResponseDto> {
    return this.usecase.searchAgentRuns(String(user.sub), workspaceId, query);
  }

  @Post()
  @Authenticated()
  @ApiOperation({ summary: 'Create manual agent run' })
  @ApiDataResponse(AgentRunResponseDto, { status: HttpStatus.CREATED })
  async createAgentRun(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateAgentRunDto,
  ): Promise<AgentRunResponseDto> {
    return this.usecase.createAgentRun(String(user.sub), workspaceId, dto);
  }

  @Patch('internal/:runId/status')
  @RequireInternalScopes('agents:invoke')
  @ApiOperation({ summary: 'Update agent run status for internal workers' })
  @ApiDataResponse(AgentRunResponseDto)
  async updateAgentRunStatusForInternal(
    @Param('workspaceId') workspaceId: string,
    @Param('runId') runId: string,
    @Body() dto: UpdateAgentRunStatusForInternalDto,
  ): Promise<AgentRunResponseDto> {
    return this.usecase.updateAgentRunStatusForInternal(
      workspaceId,
      runId,
      dto,
    );
  }

  @Post('internal/:runId/steps')
  @RequireInternalScopes('agents:invoke')
  @ApiOperation({ summary: 'Upsert agent run step for internal workers' })
  @ApiDataResponse(AgentStepResponseDto)
  async upsertAgentStepForInternal(
    @Param('workspaceId') workspaceId: string,
    @Param('runId') runId: string,
    @Body() dto: UpsertAgentStepForInternalDto,
  ): Promise<AgentStepResponseDto> {
    return this.usecase.upsertAgentStepForInternal(workspaceId, runId, dto);
  }

  @Post('internal/:runId/actions')
  @RequireInternalScopes('agents:invoke')
  @ApiOperation({ summary: 'Upsert agent action for internal workers' })
  @ApiDataResponse(AgentActionResponseDto)
  async upsertAgentActionForInternal(
    @Param('workspaceId') workspaceId: string,
    @Param('runId') runId: string,
    @Body() dto: UpsertAgentActionForInternalDto,
  ): Promise<AgentActionResponseDto> {
    return this.usecase.upsertAgentActionForInternal(workspaceId, runId, dto);
  }

  @Post(':runId/cancel')
  @Authenticated()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel agent run' })
  @ApiDataResponse(AgentRunResponseDto)
  async cancelAgentRun(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Param('runId') runId: string,
  ): Promise<AgentRunResponseDto> {
    return this.usecase.cancelAgentRun(String(user.sub), workspaceId, runId);
  }

  @Get(':runId/steps')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve agent run steps' })
  @ApiDataResponse(AgentStepResponseDto, { isArray: true })
  async getAgentRunSteps(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Param('runId') runId: string,
  ): Promise<AgentStepResponseDto[]> {
    return this.usecase.getAgentRunSteps(String(user.sub), workspaceId, runId);
  }

  @Get(':runId/actions')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve agent run actions' })
  @ApiDataResponse(AgentActionResponseDto, { isArray: true })
  async getAgentRunActions(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Param('runId') runId: string,
  ): Promise<AgentActionResponseDto[]> {
    return this.usecase.getAgentRunActions(
      String(user.sub),
      workspaceId,
      runId,
    );
  }

  @Get(':runId')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve agent run metadata' })
  @ApiDataResponse(AgentRunResponseDto)
  async getAgentRun(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Param('runId') runId: string,
  ): Promise<AgentRunResponseDto> {
    return this.usecase.getAgentRun(String(user.sub), workspaceId, runId);
  }
}
