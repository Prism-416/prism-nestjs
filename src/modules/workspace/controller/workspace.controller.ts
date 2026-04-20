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
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import type { JwtPayload } from '@/core/auth/jwt-token.service';
import {
  AcceptWorkspaceInvitationDto,
  CreateProjectRolesDto,
  CreateWorkspaceDto,
  CreateWorkspaceInvitationDto,
  ProjectRoleResponseDto,
  UpdateProjectRolesDto,
  UpdateWorkspaceDto,
  WorkspaceMemberResponseDto,
  WorkspaceInvitationResponseDto,
  WorkspaceResponseDto,
} from '@/modules/workspace/dto';
import { WorkspaceUseCase } from '@/modules/workspace/usecases';

@ApiTags('Workspace')
@Controller()
export class WorkspaceController {
  constructor(private readonly usecase: WorkspaceUseCase) {}

  @Get()
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve workspaces the user belongs to' })
  @ApiDataResponse(WorkspaceResponseDto, { isArray: true })
  async getWorkspaces(
    @CurrentUser() user: JwtPayload,
  ): Promise<WorkspaceResponseDto[]> {
    return this.usecase.getWorkspaces(String(user.sub));
  }

  @Get(':workspaceId')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve a workspace the user belongs to' })
  @ApiDataResponse(WorkspaceResponseDto)
  async getWorkspace(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceResponseDto> {
    return this.usecase.getWorkspace(String(user.sub), workspaceId);
  }

  @Get(':workspaceId/members')
  @Authenticated()
  @ApiOperation({
    summary: 'Retrieve members of a workspace the user belongs to',
  })
  @ApiDataResponse(WorkspaceMemberResponseDto, { isArray: true })
  async getWorkspaceMembers(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceMemberResponseDto[]> {
    return this.usecase.getWorkspaceMembers(String(user.sub), workspaceId);
  }

  @Get(':workspaceId/roles')
  @Authenticated()
  @ApiOperation({
    summary: 'Retrieve project roles in a workspace the user belongs to',
  })
  @ApiDataResponse(ProjectRoleResponseDto, { isArray: true })
  async getProjectRoles(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
  ): Promise<ProjectRoleResponseDto[]> {
    return this.usecase.getProjectRoles(String(user.sub), workspaceId);
  }

  @Post(':workspaceId/roles')
  @Authenticated()
  @ApiOperation({ summary: 'Create project roles in a workspace' })
  @ApiDataResponse(ProjectRoleResponseDto, {
    status: HttpStatus.CREATED,
    isArray: true,
  })
  async createProjectRoles(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectRolesDto,
  ): Promise<ProjectRoleResponseDto[]> {
    return this.usecase.createProjectRoles(String(user.sub), workspaceId, dto);
  }

  @Patch(':workspaceId/roles')
  @Authenticated()
  @ApiOperation({ summary: 'Update project roles in a workspace in batch' })
  @ApiDataResponse(ProjectRoleResponseDto, { isArray: true })
  async updateProjectRoles(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateProjectRolesDto,
  ): Promise<ProjectRoleResponseDto[]> {
    return this.usecase.updateProjectRoles(String(user.sub), workspaceId, dto);
  }

  @Post(':workspaceId/invitations')
  @Authenticated()
  @ApiOperation({
    summary: 'Create a workspace invitation for a user',
  })
  @ApiDataResponse(WorkspaceInvitationResponseDto, {
    status: HttpStatus.CREATED,
  })
  async createWorkspaceInvitation(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateWorkspaceInvitationDto,
  ): Promise<WorkspaceInvitationResponseDto> {
    return this.usecase.createWorkspaceInvitation(
      String(user.sub),
      workspaceId,
      dto,
    );
  }

  @Post('invitations/accept')
  @ApiOperation({
    summary: 'Accept a workspace invitation using an invitation token',
  })
  @ApiDataResponse(WorkspaceResponseDto)
  async acceptWorkspaceInvitation(
    @Body() dto: AcceptWorkspaceInvitationDto,
  ): Promise<WorkspaceResponseDto> {
    return this.usecase.acceptWorkspaceInvitation(dto);
  }

  @Patch(':workspaceId')
  @Authenticated()
  @ApiOperation({ summary: 'Update a workspace the user administers' })
  @ApiDataResponse(WorkspaceResponseDto)
  async updateWorkspace(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    return this.usecase.updateWorkspace(String(user.sub), workspaceId, dto);
  }

  @Post(':workspaceId/restore')
  @Authenticated()
  @ApiOperation({ summary: 'Restore a deleted workspace the user administers' })
  @ApiDataResponse(WorkspaceResponseDto)
  async restoreWorkspace(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceResponseDto> {
    return this.usecase.restoreWorkspace(String(user.sub), workspaceId);
  }

  @Delete(':workspaceId')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a workspace the user administers' })
  @ApiNoContentResponse({ description: 'Successfully deleted workspace' })
  async deleteWorkspace(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
  ): Promise<void> {
    await this.usecase.deleteWorkspace(String(user.sub), workspaceId);
  }

  @Post()
  @Authenticated()
  @ApiOperation({ summary: 'Create Workspace' })
  @ApiDataResponse(WorkspaceResponseDto, { status: HttpStatus.CREATED })
  async createWorkspace(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    return this.usecase.createWorkspace(String(user.sub), dto);
  }
}
