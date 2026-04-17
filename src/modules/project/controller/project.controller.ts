import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import { CreateProjectDto, ProjectResponseDto } from '@/modules/project/dto';
import { ProjectUseCase } from '@/modules/project/usecases';

@ApiTags('Project')
@Controller()
export class ProjectController {
  constructor(private readonly usecase: ProjectUseCase) {}

  @Post()
  @Authenticated()
  @ApiOperation({ summary: 'Create Project' })
  @ApiDataResponse(ProjectResponseDto, { status: HttpStatus.CREATED })
  async createProject(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.usecase.createProject(String(user.sub), dto);
  }
}
