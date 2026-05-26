import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import {
  AgentActionEventResponseDto,
  AgentActionResponseDto,
} from '@/modules/agent/dto';
import { AgentUseCase } from '@/modules/agent/usecases';

@ApiTags('Workspace Agent')
@Controller(':workspaceId/agent-actions')
export class AgentActionController {
  constructor(private readonly usecase: AgentUseCase) {}

  @Post(':actionId/approve')
  @Authenticated()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve agent action' })
  @ApiDataResponse(AgentActionResponseDto)
  async approveAgentAction(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Param('actionId') actionId: string,
  ): Promise<AgentActionResponseDto> {
    return this.usecase.approveAgentAction(
      String(user.sub),
      workspaceId,
      actionId,
    );
  }

  @Post(':actionId/cancel')
  @Authenticated()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel agent action' })
  @ApiDataResponse(AgentActionResponseDto)
  async cancelAgentAction(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Param('actionId') actionId: string,
  ): Promise<AgentActionResponseDto> {
    return this.usecase.cancelAgentAction(
      String(user.sub),
      workspaceId,
      actionId,
    );
  }

  @Get(':actionId')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve agent action metadata' })
  @ApiDataResponse(AgentActionResponseDto)
  async getAgentAction(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Param('actionId') actionId: string,
  ): Promise<AgentActionResponseDto> {
    return this.usecase.getAgentAction(String(user.sub), workspaceId, actionId);
  }

  @Get(':actionId/events')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve agent action events' })
  @ApiDataResponse(AgentActionEventResponseDto, { isArray: true })
  async getAgentActionEvents(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Param('actionId') actionId: string,
  ): Promise<AgentActionEventResponseDto[]> {
    return this.usecase.getAgentActionEvents(
      String(user.sub),
      workspaceId,
      actionId,
    );
  }
}
