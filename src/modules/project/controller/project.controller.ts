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
  GetProjectsQueryDto,
  ProjectRepositoryLinkResponseDto,
  ProjectResponseDto,
  ProjectSummaryResponseDto,
  UpdateProjectDto,
  UpsertProjectRepositoryLinkDto,
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

  @Get('workspaces/:workspaceSlug')
  @Authenticated()
  @ApiOperation({
    summary: 'Retrieve projects in a workspace by slug the user belongs to',
  })
  @ApiDataResponse(ProjectSummaryResponseDto, { isArray: true })
  async getProjectsWithWorkspaceSlug(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceSlug') workspaceSlug: string,
  ): Promise<ProjectSummaryResponseDto[]> {
    return this.usecase.getProjectsWithWorkspaceSlug(
      String(user.sub),
      workspaceSlug,
    );
  }

  @Get('slugs/:projectSlug')
  @Authenticated()
  @ApiOperation({
    summary: 'Retrieve a project by slug',
  })
  @ApiDataResponse(ProjectResponseDto)
  async getProjectBySlug(
    @CurrentUser() user: JwtPayload,
    @Param('projectSlug') projectSlug: string,
  ): Promise<ProjectResponseDto> {
    return this.usecase.getProjectBySlug(String(user.sub), projectSlug);
  }

  @Get(':projectId/repository-link')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve project GitHub repository link' })
  @ApiDataResponse(ProjectRepositoryLinkResponseDto)
  async getProjectRepositoryLink(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
  ): Promise<ProjectRepositoryLinkResponseDto> {
    return this.usecase.getProjectRepositoryLink(String(user.sub), projectId);
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

  @Patch(':projectId/repository-link')
  @Authenticated()
  @ApiOperation({ summary: 'Connect a GitHub repository to a project' })
  @ApiDataResponse(ProjectRepositoryLinkResponseDto)
  async upsertProjectRepositoryLink(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: UpsertProjectRepositoryLinkDto,
  ): Promise<ProjectRepositoryLinkResponseDto> {
    return this.usecase.upsertProjectRepositoryLink(
      String(user.sub),
      projectId,
      dto,
    );
  }

  @Delete(':projectId/repository-link')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect a GitHub repository from a project' })
  @ApiNoContentResponse({
    description: 'Successfully disconnected project GitHub repository',
  })
  async deleteProjectRepositoryLink(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
  ): Promise<void> {
    await this.usecase.deleteProjectRepositoryLink(String(user.sub), projectId);
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
}
