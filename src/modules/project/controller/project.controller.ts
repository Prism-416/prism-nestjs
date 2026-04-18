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
  CreateProjectDto,
  ProjectMemberResponseDto,
  ProjectResponseDto,
  UpdateProjectDto,
  UpsertProjectMembersDto,
} from '@/modules/project/dto';
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

  @Patch(':projectId')
  @Authenticated()
  @ApiOperation({ summary: 'Update project metadata' })
  @ApiDataResponse(ProjectResponseDto)
  async updateProject(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return this.usecase.updateProject(String(user.sub), projectId, dto);
  }

  @Patch(':projectId/members')
  @Authenticated()
  @ApiOperation({ summary: 'Upsert project members in batch' })
  @ApiDataResponse(ProjectMemberResponseDto, { isArray: true })
  async upsertProjectMembers(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: UpsertProjectMembersDto,
  ): Promise<ProjectMemberResponseDto[]> {
    return this.usecase.upsertProjectMembers(String(user.sub), projectId, dto);
  }
}
