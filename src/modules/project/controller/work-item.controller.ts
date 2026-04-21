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
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import {
  CreateWorkItemDto,
  UpdateWorkItemDto,
  WorkItemResponseDto,
} from '@/modules/project/dto';
import { WorkItemUseCase } from '@/modules/project/usecases';

@ApiTags('Project Work Item')
@Controller(':projectId/work-items')
export class WorkItemController {
  constructor(private readonly usecase: WorkItemUseCase) {}

  @Get(':itemId')
  @Authenticated()
  @ApiOperation({ summary: 'Get work item detail' })
  @ApiDataResponse(WorkItemResponseDto)
  async getWorkItem(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
  ): Promise<WorkItemResponseDto> {
    return this.usecase.getWorkItem(String(user.sub), projectId, itemId);
  }

  @Get(':itemId/children')
  @Authenticated()
  @ApiOperation({ summary: 'Get work item children' })
  @ApiDataResponse(WorkItemResponseDto, { isArray: true })
  async getWorkItemChildren(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
  ): Promise<WorkItemResponseDto[]> {
    return this.usecase.getWorkItemChildren(
      String(user.sub),
      projectId,
      itemId,
    );
  }

  @Post()
  @Authenticated()
  @ApiOperation({ summary: 'Create work item' })
  @ApiDataResponse(WorkItemResponseDto, { status: HttpStatus.CREATED })
  async createWorkItem(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: CreateWorkItemDto,
  ): Promise<WorkItemResponseDto> {
    return this.usecase.createWorkItem(String(user.sub), projectId, dto);
  }

  @Patch(':itemId')
  @Authenticated()
  @ApiOperation({ summary: 'Update work item' })
  @ApiDataResponse(WorkItemResponseDto)
  async updateWorkItem(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateWorkItemDto,
  ): Promise<WorkItemResponseDto> {
    return this.usecase.updateWorkItem(
      String(user.sub),
      projectId,
      itemId,
      dto,
    );
  }

  @Delete(':itemId')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete work item' })
  @ApiNoContentResponse({ description: 'Successfully deleted work item' })
  async deleteWorkItem(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    await this.usecase.deleteWorkItem(String(user.sub), projectId, itemId);
  }
}
