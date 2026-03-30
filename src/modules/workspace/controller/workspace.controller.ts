import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/common/auth';
import { ApiDataResponse } from '@/common/response';
import type { JwtPayload } from '@/common/auth/jwt-token.service';
import {
  CreateWorkspaceDto,
  CreateWorkspaceInvitationDto,
  UpdateWorkspaceDto,
  WorkspaceMemberResponseDto,
  WorkspaceInvitationResponseDto,
  WorkspaceResponseDto,
} from '@/modules/workspace/dto';
import { WorkspaceUseCase } from '@/modules/workspace/usecases';

@ApiTags('Workspace')
@Controller()
@Authenticated()
export class WorkspaceController {
  constructor(private readonly usecase: WorkspaceUseCase) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve workspaces the user belongs to' })
  @ApiDataResponse(WorkspaceResponseDto, { isArray: true })
  async getWorkspaces(
    @CurrentUser() user: JwtPayload,
  ): Promise<WorkspaceResponseDto[]> {
    return this.usecase.getWorkspaces(String(user.sub));
  }

  @Get(':workspaceId')
  @ApiOperation({ summary: 'Retrieve a workspace the user belongs to' })
  @ApiDataResponse(WorkspaceResponseDto)
  async getWorkspace(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
  ): Promise<WorkspaceResponseDto> {
    return this.usecase.getWorkspace(String(user.sub), workspaceId);
  }

  @Get(':workspaceId/members')
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

  @Post(':workspaceId/invitations')
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

  @Patch(':workspaceId')
  @ApiOperation({ summary: 'Update a workspace the user administers' })
  @ApiDataResponse(WorkspaceResponseDto)
  async updateWorkspace(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    return this.usecase.updateWorkspace(String(user.sub), workspaceId, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create Workspace' })
  @ApiDataResponse(WorkspaceResponseDto, { status: HttpStatus.CREATED })
  async createWorkspace(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    return this.usecase.createWorkspace(String(user.sub), dto);
  }
}
