import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import { RequireInternalScopes } from '@/modules/admin';
import { AgentWorkflowDispatchResponseDto } from '@/modules/agent/dto';
import { AgentUseCase } from '@/modules/agent/usecases';

@ApiTags('Workspace Agent')
@Controller(':workspaceId/projects/:projectId/agent-workflows')
export class AgentWorkflowController {
  constructor(private readonly usecase: AgentUseCase) {}

  @Post('internal/:trigger')
  @RequireInternalScopes('projects:write')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Dispatch a scheduled agent workflow for internal schedulers',
  })
  @ApiDataResponse(AgentWorkflowDispatchResponseDto, {
    status: HttpStatus.ACCEPTED,
  })
  async dispatchWorkflowForInternal(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('trigger') trigger: string,
  ): Promise<AgentWorkflowDispatchResponseDto> {
    return this.usecase.dispatchWorkflowForInternal(
      workspaceId,
      projectId,
      trigger,
    );
  }

  @Post(':trigger')
  @Authenticated()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Dispatch an agent workflow for the project' })
  @ApiDataResponse(AgentWorkflowDispatchResponseDto, {
    status: HttpStatus.ACCEPTED,
  })
  async dispatchWorkflow(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('trigger') trigger: string,
  ): Promise<AgentWorkflowDispatchResponseDto> {
    return this.usecase.dispatchWorkflowForMember(
      String(user.sub),
      workspaceId,
      projectId,
      trigger,
    );
  }
}
