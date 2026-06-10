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
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import { RequireInternalScopes } from '@/modules/admin';
import {
  BulkDeleteWorkItemsDto,
  BulkWorkItemIdsDto,
  CreateWorkItemDto,
  CreateWorkItemForInternalDto,
  DeleteWorkItemForInternalDto,
  FindSimilarWorkItemsDto,
  ReorderWorkItemsDto,
  ReorderWorkItemsForInternalDto,
  SearchTrashedWorkItemsResponseDto,
  SearchWorkItemsQueryDto,
  SearchWorkItemsResponseDto,
  SimilarWorkItemResponseDto,
  UpdateWorkItemDto,
  UpdateWorkItemForInternalDto,
  UpsertWorkItemEmbeddingDto,
  WorkItemEmbeddingResponseDto,
  WorkItemResponseDto,
} from '@/modules/project/dto';
import { WorkItemUseCase } from '@/modules/project/usecases';

@ApiTags('Project Work Item')
@Controller(':projectId/work-items')
export class WorkItemController {
  constructor(private readonly usecase: WorkItemUseCase) {}

  @Get()
  @Authenticated()
  @ApiOperation({ summary: 'Search work items' })
  @ApiDataResponse(SearchWorkItemsResponseDto)
  async searchWorkItems(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Query() query: SearchWorkItemsQueryDto,
  ): Promise<SearchWorkItemsResponseDto> {
    return this.usecase.searchWorkItems(String(user.sub), projectId, query);
  }

  @Get('internal')
  @RequireInternalScopes('projects:read')
  @ApiOperation({ summary: 'Search work items for internal workers' })
  @ApiDataResponse(SearchWorkItemsResponseDto)
  async searchWorkItemsForInternal(
    @Param('projectId') projectId: string,
    @Query() query: SearchWorkItemsQueryDto,
  ): Promise<SearchWorkItemsResponseDto> {
    return this.usecase.searchWorkItemsForInternal(projectId, query);
  }

  @Get('trash')
  @Authenticated()
  @ApiOperation({ summary: 'List trashed work items' })
  @ApiDataResponse(SearchTrashedWorkItemsResponseDto)
  async searchTrashedWorkItems(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
  ): Promise<SearchTrashedWorkItemsResponseDto> {
    return this.usecase.searchTrashedWorkItems(String(user.sub), projectId);
  }

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

  @Get('internal/:itemId')
  @RequireInternalScopes('projects:read')
  @ApiOperation({ summary: 'Get work item detail for internal workers' })
  @ApiDataResponse(WorkItemResponseDto)
  async getWorkItemForInternal(
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
  ): Promise<WorkItemResponseDto> {
    return this.usecase.getWorkItemForInternal(projectId, itemId);
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

  @Get('internal/:itemId/children')
  @RequireInternalScopes('projects:read')
  @ApiOperation({ summary: 'Get work item children for internal workers' })
  @ApiDataResponse(WorkItemResponseDto, { isArray: true })
  async getWorkItemChildrenForInternal(
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
  ): Promise<WorkItemResponseDto[]> {
    return this.usecase.getWorkItemChildrenForInternal(projectId, itemId);
  }

  @Put(':itemId/embedding')
  @Authenticated()
  @ApiOperation({ summary: 'Upsert work item embedding' })
  @ApiDataResponse(WorkItemEmbeddingResponseDto)
  async upsertWorkItemEmbedding(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpsertWorkItemEmbeddingDto,
  ): Promise<WorkItemEmbeddingResponseDto> {
    return this.usecase.upsertWorkItemEmbedding(
      String(user.sub),
      projectId,
      itemId,
      dto,
    );
  }

  @Put('internal/:itemId/embedding')
  @RequireInternalScopes('embeddings:write')
  @ApiOperation({ summary: 'Upsert work item embedding for internal workers' })
  @ApiDataResponse(WorkItemEmbeddingResponseDto)
  async upsertWorkItemEmbeddingForInternal(
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpsertWorkItemEmbeddingDto,
  ): Promise<WorkItemEmbeddingResponseDto> {
    return this.usecase.upsertWorkItemEmbeddingForInternal(
      projectId,
      itemId,
      dto,
    );
  }

  @Post('internal/similar')
  @RequireInternalScopes('projects:read')
  @ApiOperation({
    summary: 'Find semantically similar work items for internal workers',
  })
  @ApiDataResponse(SimilarWorkItemResponseDto, { isArray: true })
  async findSimilarWorkItemsForInternal(
    @Param('projectId') projectId: string,
    @Body() dto: FindSimilarWorkItemsDto,
  ): Promise<SimilarWorkItemResponseDto[]> {
    return this.usecase.findSimilarWorkItemsForInternal(projectId, dto);
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

  @Post('bulk-delete')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Move multiple work items to trash' })
  @ApiNoContentResponse({
    description: 'Successfully moved work items to trash',
  })
  async bulkDeleteWorkItems(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: BulkDeleteWorkItemsDto,
  ): Promise<void> {
    await this.usecase.bulkDeleteWorkItems(
      String(user.sub),
      projectId,
      dto.itemIds,
    );
  }

  @Post('trash/bulk-restore')
  @Authenticated()
  @ApiOperation({ summary: 'Restore multiple trashed work items' })
  @ApiDataResponse(WorkItemResponseDto, { isArray: true })
  async bulkRestoreWorkItems(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: BulkWorkItemIdsDto,
  ): Promise<WorkItemResponseDto[]> {
    return this.usecase.bulkRestoreWorkItems(
      String(user.sub),
      projectId,
      dto.itemIds,
    );
  }

  @Post('trash/bulk-delete')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete multiple trashed work items' })
  @ApiNoContentResponse({
    description: 'Successfully deleted work items permanently',
  })
  async bulkPermanentlyDeleteWorkItems(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: BulkWorkItemIdsDto,
  ): Promise<void> {
    await this.usecase.bulkPermanentlyDeleteWorkItems(
      String(user.sub),
      projectId,
      dto.itemIds,
    );
  }

  @Post('trash/:itemId/restore')
  @Authenticated()
  @ApiOperation({ summary: 'Restore a trashed work item' })
  @ApiDataResponse(WorkItemResponseDto)
  async restoreWorkItem(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
  ): Promise<WorkItemResponseDto> {
    return this.usecase.restoreWorkItem(String(user.sub), projectId, itemId);
  }

  @Delete('trash/:itemId')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a trashed work item' })
  @ApiNoContentResponse({
    description: 'Successfully deleted work item permanently',
  })
  async permanentlyDeleteWorkItem(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    await this.usecase.permanentlyDeleteWorkItem(
      String(user.sub),
      projectId,
      itemId,
    );
  }

  @Post('internal')
  @RequireInternalScopes('projects:write')
  @ApiOperation({ summary: 'Create work item for internal workers' })
  @ApiDataResponse(WorkItemResponseDto, { status: HttpStatus.CREATED })
  async createWorkItemForInternal(
    @Param('projectId') projectId: string,
    @Body() dto: CreateWorkItemForInternalDto,
  ): Promise<WorkItemResponseDto> {
    return this.usecase.createWorkItem(dto.requestedByUserId, projectId, dto);
  }

  @Patch('reorder')
  @Authenticated()
  @ApiOperation({ summary: 'Reorder top-level work items' })
  @ApiDataResponse(WorkItemResponseDto, { isArray: true })
  async reorderWorkItems(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: ReorderWorkItemsDto,
  ): Promise<WorkItemResponseDto[]> {
    return this.usecase.reorderWorkItems(String(user.sub), projectId, dto);
  }

  @Patch('internal/reorder')
  @RequireInternalScopes('projects:write')
  @ApiOperation({
    summary: 'Reorder top-level work items for internal workers',
  })
  @ApiDataResponse(WorkItemResponseDto, { isArray: true })
  async reorderWorkItemsForInternal(
    @Param('projectId') projectId: string,
    @Body() dto: ReorderWorkItemsForInternalDto,
  ): Promise<WorkItemResponseDto[]> {
    return this.usecase.reorderWorkItems(dto.requestedByUserId, projectId, dto);
  }

  @Patch('internal/:itemId')
  @RequireInternalScopes('projects:write')
  @ApiOperation({ summary: 'Update work item for internal workers' })
  @ApiDataResponse(WorkItemResponseDto)
  async updateWorkItemForInternal(
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateWorkItemForInternalDto,
  ): Promise<WorkItemResponseDto> {
    return this.usecase.updateWorkItem(
      dto.requestedByUserId,
      projectId,
      itemId,
      dto,
    );
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

  @Delete('internal/:itemId')
  @RequireInternalScopes('projects:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete work item for internal workers' })
  @ApiNoContentResponse({ description: 'Successfully deleted work item' })
  async deleteWorkItemForInternal(
    @Param('projectId') projectId: string,
    @Param('itemId') itemId: string,
    @Body() dto: DeleteWorkItemForInternalDto,
  ): Promise<void> {
    await this.usecase.deleteWorkItem(dto.requestedByUserId, projectId, itemId);
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
