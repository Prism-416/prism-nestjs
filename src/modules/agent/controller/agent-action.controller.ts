import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import { AgentActionResponseDto } from '@/modules/agent/dto';
import { AgentUseCase } from '@/modules/agent/usecases';

@ApiTags('Project Agent')
@Controller(':projectId/agent-actions')
export class AgentActionController {
  constructor(private readonly usecase: AgentUseCase) {}

  @Get(':actionId')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve agent action metadata' })
  @ApiDataResponse(AgentActionResponseDto)
  async getAgentAction(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('actionId') actionId: string,
  ): Promise<AgentActionResponseDto> {
    return this.usecase.getAgentAction(String(user.sub), projectId, actionId);
  }
}
