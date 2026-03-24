import { Body, Controller, Get, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/common/auth';
import { ApiDataResponse } from '@/common/response';
import type { JwtPayload } from '@/common/auth/jwt-token.service';
import {
  CreateWorkspaceDto,
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
