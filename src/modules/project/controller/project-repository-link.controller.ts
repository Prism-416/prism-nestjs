import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import {
  CreateProjectRepositoryLinkDto,
  ProjectRepositoryLinkResponseDto,
} from '@/modules/project/dto';
import {
  GithubInstallationAuthorizeResponseDto,
  GithubRepositoryOptionResponseDto,
} from '@/modules/github/dto';
import { ProjectRepositoryLinkUseCase } from '@/modules/project/usecases';

@ApiTags('Project Repository')
@Controller(':projectId/repositories')
export class ProjectRepositoryLinkController {
  constructor(private readonly usecase: ProjectRepositoryLinkUseCase) {}

  @Get()
  @Authenticated()
  @ApiOperation({ summary: 'List connected GitHub repositories' })
  @ApiDataResponse(ProjectRepositoryLinkResponseDto, { isArray: true })
  async listProjectRepositories(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ProjectRepositoryLinkResponseDto[]> {
    return this.usecase.listProjectRepositories(String(user.sub), projectId);
  }

  @Get('github/authorize')
  @Authenticated()
  @ApiOperation({ summary: 'Create GitHub App installation URL' })
  @ApiDataResponse(GithubInstallationAuthorizeResponseDto)
  async createGithubInstallationAuthorization(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<GithubInstallationAuthorizeResponseDto> {
    return this.usecase.createGithubInstallationAuthorization(
      String(user.sub),
      projectId,
    );
  }

  @Get('github/installations/:githubInstallationId/repositories')
  @Authenticated()
  @ApiOperation({ summary: 'List repositories accessible to an installation' })
  @ApiDataResponse(GithubRepositoryOptionResponseDto, { isArray: true })
  async listGithubInstallationRepositories(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('githubInstallationId') githubInstallationId: string,
  ): Promise<GithubRepositoryOptionResponseDto[]> {
    return this.usecase.listGithubInstallationRepositories(
      String(user.sub),
      projectId,
      githubInstallationId,
    );
  }

  @Post()
  @Authenticated()
  @ApiOperation({ summary: 'Connect a GitHub repository to a project' })
  @ApiDataResponse(ProjectRepositoryLinkResponseDto, {
    status: HttpStatus.CREATED,
  })
  async connectProjectRepository(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateProjectRepositoryLinkDto,
  ): Promise<ProjectRepositoryLinkResponseDto> {
    return this.usecase.connectProjectRepository(
      String(user.sub),
      projectId,
      dto,
    );
  }

  @Delete(':linkId')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect a GitHub repository from a project' })
  @ApiNoContentResponse({
    description: 'Successfully disconnected GitHub repository',
  })
  async disconnectProjectRepository(
    @CurrentUser() user: JwtPayload,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ): Promise<void> {
    await this.usecase.disconnectProjectRepository(
      String(user.sub),
      projectId,
      linkId,
    );
  }
}
