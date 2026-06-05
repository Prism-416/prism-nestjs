import {
  Body,
  Controller,
  Get,
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
import {
  AgentActionEventResponseDto,
  AgentActionResponseDto,
  CreateAgentActionEventForInternalDto,
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
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('actionId', ParseUUIDPipe) actionId: string,
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
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('actionId', ParseUUIDPipe) actionId: string,
  ): Promise<AgentActionResponseDto> {
    return this.usecase.cancelAgentAction(
      String(user.sub),
      workspaceId,
      actionId,
    );
  }

  @Post('internal/:actionId/events')
  @RequireInternalScopes('agents:invoke')
  @ApiOperation({ summary: 'Create agent action event for internal workers' })
  @ApiDataResponse(AgentActionEventResponseDto)
  async createAgentActionEventForInternal(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('actionId', ParseUUIDPipe) actionId: string,
    @Body() dto: CreateAgentActionEventForInternalDto,
  ): Promise<AgentActionEventResponseDto> {
    return this.usecase.createAgentActionEventForInternal(
      workspaceId,
      actionId,
      dto,
    );
  }

  @Get(':actionId')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve agent action metadata' })
  @ApiDataResponse(AgentActionResponseDto)
  async getAgentAction(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('actionId', ParseUUIDPipe) actionId: string,
  ): Promise<AgentActionResponseDto> {
    return this.usecase.getAgentAction(String(user.sub), workspaceId, actionId);
  }

  @Get(':actionId/events')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve agent action events' })
  @ApiDataResponse(AgentActionEventResponseDto, { isArray: true })
  async getAgentActionEvents(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('actionId', ParseUUIDPipe) actionId: string,
  ): Promise<AgentActionEventResponseDto[]> {
    return this.usecase.getAgentActionEvents(
      String(user.sub),
      workspaceId,
      actionId,
    );
  }
}
