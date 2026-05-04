import { Body, Controller, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import { CreateSprintDto, SprintResponseDto } from '@/modules/sprint/dto';
import { SprintUseCase } from '@/modules/sprint/usecases';

@ApiTags('Project Sprints')
@Controller(':projectId/sprints')
export class SprintController {
  constructor(private readonly usecase: SprintUseCase) {}

  @Post()
  @Authenticated()
  @ApiOperation({ summary: 'Create sprint' })
  @ApiDataResponse(SprintResponseDto, { status: HttpStatus.CREATED })
  async createSprint(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: CreateSprintDto,
  ): Promise<SprintResponseDto> {
    return this.usecase.createSprint(String(user.sub), projectId, dto);
  }
}
