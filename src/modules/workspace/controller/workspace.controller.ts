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
  Query,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import type { JwtPayload } from '@/core/auth/jwt-token.service';
import { ProjectSummaryResponseDto } from '@/modules/project/dto';
import {
  AcceptWorkspaceInvitationDto,
  CreateWorkspaceJobsDto,
  CreateWorkspaceDto,
  CreateWorkspaceInvitationDto,
  DeclineWorkspaceInvitationDto,
  GetWorkspaceInvitationQueryDto,
  WorkspaceJobResponseDto,
  SearchWorkspaceMemberCandidatesQueryDto,
  WorkspaceMemberCandidateSearchResponseDto,
  WorkspaceInvitationPreviewResponseDto,
  TransferWorkspaceOwnerDto,
  UpdateWorkspaceMemberJobsDto,
  UpdateWorkspaceMemberRoleDto,
  UpdateWorkspaceJobsDto,
  UpdateWorkspaceDto,
  WorkspaceSummaryResponseDto,
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
  @ApiDataResponse(WorkspaceSummaryResponseDto, { isArray: true })
  async getWorkspaces(
    @CurrentUser() user: JwtPayload,
  ): Promise<WorkspaceSummaryResponseDto[]> {
    return this.usecase.getWorkspaces(String(user.sub));
  }

  @Get('members/search')
  @Authenticated()
  @ApiOperation({
    summary: 'Search workspace member candidates by email, username, or name',
  })
  @ApiDataResponse(WorkspaceMemberCandidateSearchResponseDto)
  async searchWorkspaceMemberCandidates(
    @CurrentUser() user: JwtPayload,
    @Query() query: SearchWorkspaceMemberCandidatesQueryDto,
  ): Promise<WorkspaceMemberCandidateSearchResponseDto> {
    return this.usecase.searchWorkspaceMemberCandidates(
      String(user.sub),
      query,
    );
  }

  @Get('invitations')
  @ApiOperation({
    summary: 'Retrieve a workspace invitation using an invitation token',
  })
  @ApiDataResponse(WorkspaceInvitationPreviewResponseDto)
  async getWorkspaceInvitation(
    @Query() query: GetWorkspaceInvitationQueryDto,
  ): Promise<WorkspaceInvitationPreviewResponseDto> {
    return this.usecase.getWorkspaceInvitation(query);
  }

  @Get(':workspaceSlug/projects')
  @Authenticated()
  @ApiOperation({
    summary: 'Retrieve projects in a workspace by slug the user belongs to',
  })
  @ApiDataResponse(ProjectSummaryResponseDto, { isArray: true })
  async getWorkspaceProjectsBySlug(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceSlug') workspaceSlug: string,
  ): Promise<ProjectSummaryResponseDto[]> {
    return this.usecase.getWorkspaceProjectsBySlug(
      String(user.sub),
      workspaceSlug,
    );
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

  @Put(':workspaceId/members/:userId/jobs')
  @Authenticated()
  @ApiOperation({ summary: 'Update workspace member job assignments' })
  @ApiDataResponse(WorkspaceMemberResponseDto)
  async updateWorkspaceMemberJobs(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateWorkspaceMemberJobsDto,
  ): Promise<WorkspaceMemberResponseDto> {
    return this.usecase.updateWorkspaceMemberJobs(
      String(user.sub),
      workspaceId,
      targetUserId,
      dto,
    );
  }

  @Put(':workspaceId/owner')
  @Authenticated()
  @ApiOperation({ summary: 'Transfer workspace ownership' })
  @ApiDataResponse(WorkspaceResponseDto)
  async transferWorkspaceOwner(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: TransferWorkspaceOwnerDto,
  ): Promise<WorkspaceResponseDto> {
    return this.usecase.transferWorkspaceOwner(
      String(user.sub),
      workspaceId,
      dto,
    );
  }

  @Get(':workspaceId/jobs')
  @Authenticated()
  @ApiOperation({
    summary: 'Retrieve workspace jobs in a workspace the user belongs to',
  })
  @ApiDataResponse(WorkspaceJobResponseDto, { isArray: true })
  async getWorkspaceJobs(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceJobResponseDto[]> {
    return this.usecase.getWorkspaceJobs(String(user.sub), workspaceId);
  }

  @Post(':workspaceId/jobs')
  @Authenticated()
  @ApiOperation({ summary: 'Create workspace jobs in a workspace' })
  @ApiDataResponse(WorkspaceJobResponseDto, {
    status: HttpStatus.CREATED,
    isArray: true,
  })
  async createWorkspaceJobs(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateWorkspaceJobsDto,
  ): Promise<WorkspaceJobResponseDto[]> {
    return this.usecase.createWorkspaceJobs(String(user.sub), workspaceId, dto);
  }

  @Patch(':workspaceId/jobs')
  @Authenticated()
  @ApiOperation({ summary: 'Update workspace jobs in a workspace in batch' })
  @ApiDataResponse(WorkspaceJobResponseDto, { isArray: true })
  async updateWorkspaceJobs(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceJobsDto,
  ): Promise<WorkspaceJobResponseDto[]> {
    return this.usecase.updateWorkspaceJobs(String(user.sub), workspaceId, dto);
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

  @Post('invitations/decline')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Decline a workspace invitation using an invitation token',
  })
  @ApiNoContentResponse({
    description: 'Successfully declined the workspace invitation',
  })
  async declineWorkspaceInvitation(
    @Body() dto: DeclineWorkspaceInvitationDto,
  ): Promise<void> {
    await this.usecase.declineWorkspaceInvitation(dto);
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
