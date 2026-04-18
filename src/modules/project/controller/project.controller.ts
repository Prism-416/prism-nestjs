import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import {
  CreateProjectDto,
  ProjectMemberListResponseDto,
  GetProjectsQueryDto,
  ProjectMemberResponseDto,
  ProjectResponseDto,
  ProjectSummaryResponseDto,
  UpdateProjectDto,
  UpsertProjectMembersDto,
} from '@/modules/project/dto';
import { ProjectUseCase } from '@/modules/project/usecases';

@ApiTags('Project')
@Controller()
export class ProjectController {
  constructor(private readonly usecase: ProjectUseCase) {}

  @Get()
  @Authenticated()
  @ApiOperation({
    summary: 'Retrieve projects in a workspace the user belongs to',
  })
  @ApiDataResponse(ProjectSummaryResponseDto, { isArray: true })
  async getProjects(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetProjectsQueryDto,
  ): Promise<ProjectSummaryResponseDto[]> {
    return this.usecase.getProjects(String(user.sub), query);
  }

  @Get(':projectId')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve project metadata' })
  @ApiDataResponse(ProjectResponseDto)
  async getProject(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
  ): Promise<ProjectResponseDto> {
    return this.usecase.getProject(String(user.sub), projectId);
  }

  @Get(':projectId/members')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve project members' })
  @ApiDataResponse(ProjectMemberListResponseDto, { isArray: true })
  async getProjectMembers(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
  ): Promise<ProjectMemberListResponseDto[]> {
    return this.usecase.getProjectMembers(String(user.sub), projectId);
  }

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

  @Delete(':projectId')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete project' })
  @ApiNoContentResponse({ description: 'Successfully deleted project' })
  async deleteProject(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
  ): Promise<void> {
    await this.usecase.deleteProject(String(user.sub), projectId);
  }

  @Delete(':projectId/members/:memberId')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a project member' })
  @ApiNoContentResponse({
    description: 'Successfully removed the project member',
  })
  async removeProjectMember(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('memberId') memberId: string,
  ): Promise<void> {
    await this.usecase.removeProjectMember(
      String(user.sub),
      projectId,
      memberId,
    );
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
