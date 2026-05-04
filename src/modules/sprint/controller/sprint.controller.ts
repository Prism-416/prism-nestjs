import {
  Body,
  Controller,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import {
  CreateSprintDto,
  SprintResponseDto,
  UpdateSprintMetadataDto,
} from '@/modules/sprint/dto';
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

  @Patch(':sprintId')
  @Authenticated()
  @ApiOperation({ summary: 'Update sprint metadata' })
  @ApiDataResponse(SprintResponseDto)
  async updateSprintMetadata(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Body() dto: UpdateSprintMetadataDto,
  ): Promise<SprintResponseDto> {
    return this.usecase.updateSprintMetadata(
      String(user.sub),
      projectId,
      sprintId,
      dto,
    );
  }
}
