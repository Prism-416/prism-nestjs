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
  GithubInstallationAuthorizeResponseDto,
  GithubRepositoryOptionResponseDto,
} from '@/modules/github/dto';
import {
  CreateWorkspaceRepositoryLinkDto,
  WorkspaceRepositoryLinkResponseDto,
} from '@/modules/workspace/dto';
import { WorkspaceRepositoryLinkUseCase } from '@/modules/workspace/usecases';

@ApiTags('Workspace Repository')
@Controller(':workspaceId/repositories')
export class WorkspaceRepositoryLinkController {
  constructor(private readonly usecase: WorkspaceRepositoryLinkUseCase) {}

  @Get()
  @Authenticated()
  @ApiOperation({ summary: 'List workspace GitHub repositories' })
  @ApiDataResponse(WorkspaceRepositoryLinkResponseDto, { isArray: true })
  async listWorkspaceRepositories(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ): Promise<WorkspaceRepositoryLinkResponseDto[]> {
    return this.usecase.listWorkspaceRepositories(
      String(user.sub),
      workspaceId,
    );
  }

  @Get('github/authorize')
  @Authenticated()
  @ApiOperation({ summary: 'Create GitHub App installation URL' })
  @ApiDataResponse(GithubInstallationAuthorizeResponseDto)
  async createGithubInstallationAuthorization(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ): Promise<GithubInstallationAuthorizeResponseDto> {
    return this.usecase.createGithubInstallationAuthorization(
      String(user.sub),
      workspaceId,
    );
  }

  @Get('github/installations/:githubInstallationId/repositories')
  @Authenticated()
  @ApiOperation({ summary: 'List repositories accessible to an installation' })
  @ApiDataResponse(GithubRepositoryOptionResponseDto, { isArray: true })
  async listGithubInstallationRepositories(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('githubInstallationId') githubInstallationId: string,
  ): Promise<GithubRepositoryOptionResponseDto[]> {
    return this.usecase.listGithubInstallationRepositories(
      String(user.sub),
      workspaceId,
      githubInstallationId,
    );
  }

  @Post()
  @Authenticated()
  @ApiOperation({ summary: 'Connect a GitHub repository to a workspace' })
  @ApiDataResponse(WorkspaceRepositoryLinkResponseDto, {
    status: HttpStatus.CREATED,
  })
  async connectWorkspaceRepository(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateWorkspaceRepositoryLinkDto,
  ): Promise<WorkspaceRepositoryLinkResponseDto> {
    return this.usecase.connectWorkspaceRepository(
      String(user.sub),
      workspaceId,
      dto,
    );
  }

  @Delete(':linkId')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect a GitHub repository from a workspace' })
  @ApiNoContentResponse({
    description: 'Successfully disconnected GitHub repository',
  })
  async disconnectWorkspaceRepository(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('linkId', ParseUUIDPipe) linkId: string,
  ): Promise<void> {
    await this.usecase.disconnectWorkspaceRepository(
      String(user.sub),
      workspaceId,
      linkId,
    );
  }
}
