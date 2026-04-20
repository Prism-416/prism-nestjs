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
  Put,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import type { JwtPayload } from '@/core/auth/jwt-token.service';
import {
  AcceptWorkspaceInvitationDto,
  CreateProjectJobsDto,
  CreateWorkspaceDto,
  CreateWorkspaceInvitationDto,
  ProjectJobResponseDto,
  UpdateWorkspaceMemberRoleDto,
  UpdateProjectJobsDto,
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

  @Delete(':workspaceId/members/:userId')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a workspace member' })
  @ApiNoContentResponse({
    description: 'Successfully removed the workspace member',
  })
  async removeWorkspaceMember(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
  ): Promise<void> {
    await this.usecase.removeWorkspaceMember(
      String(user.sub),
      workspaceId,
      targetUserId,
    );
  }

  @Put(':workspaceId/members/:userId/role')
  @Authenticated()
  @ApiOperation({ summary: 'Update a workspace member role' })
  @ApiDataResponse(WorkspaceMemberResponseDto)
  async updateWorkspaceMemberRole(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateWorkspaceMemberRoleDto,
  ): Promise<WorkspaceMemberResponseDto> {
    return this.usecase.updateWorkspaceMemberRole(
      String(user.sub),
      workspaceId,
      targetUserId,
      dto,
    );
  }

  @Get(':workspaceId/jobs')
  @Authenticated()
  @ApiOperation({
    summary: 'Retrieve project jobs in a workspace the user belongs to',
  })
  @ApiDataResponse(ProjectJobResponseDto, { isArray: true })
  async getProjectJobs(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
  ): Promise<ProjectJobResponseDto[]> {
    return this.usecase.getProjectJobs(String(user.sub), workspaceId);
  }

  @Post(':workspaceId/jobs')
  @Authenticated()
  @ApiOperation({ summary: 'Create project jobs in a workspace' })
  @ApiDataResponse(ProjectJobResponseDto, {
    status: HttpStatus.CREATED,
    isArray: true,
  })
  async createProjectJobs(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectJobsDto,
  ): Promise<ProjectJobResponseDto[]> {
    return this.usecase.createProjectJobs(String(user.sub), workspaceId, dto);
  }

  @Patch(':workspaceId/jobs')
  @Authenticated()
  @ApiOperation({ summary: 'Update project jobs in a workspace in batch' })
  @ApiDataResponse(ProjectJobResponseDto, { isArray: true })
  async updateProjectJobs(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateProjectJobsDto,
  ): Promise<ProjectJobResponseDto[]> {
    return this.usecase.updateProjectJobs(String(user.sub), workspaceId, dto);
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
  @ApiOperation({ summary: 'Restore a deleted workspace the user owns' })
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
  @ApiOperation({ summary: 'Delete a workspace the user owns' })
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
