import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import { RequireInternalScopes } from '@/modules/admin';
import {
  AddSprintWorkItemsDto,
  AddSprintWorkItemsForInternalDto,
  CreateSprintDto,
  CreateSprintForInternalDto,
  RemoveSprintWorkItemForInternalDto,
  SprintResponseDto,
  UpdateSprintMetadataDto,
  UpdateSprintMetadataForInternalDto,
} from '@/modules/sprint/dto';
import {
  SearchWorkItemsQueryDto,
  SearchWorkItemsResponseDto,
} from '@/modules/project/dto';
import { SprintUseCase } from '@/modules/sprint/usecases';

@ApiTags('Workspace Sprint')
@Controller(':workspaceId/sprints')
export class SprintController {
  constructor(private readonly usecase: SprintUseCase) {}

  @Get()
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve workspace sprints' })
  @ApiDataResponse(SprintResponseDto, { isArray: true })
  async getSprints(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ): Promise<SprintResponseDto[]> {
    return this.usecase.getSprints(String(user.sub), workspaceId);
  }

  @Get(':sprintId/work-items')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve sprint work items' })
  @ApiDataResponse(SearchWorkItemsResponseDto)
  async getSprintWorkItems(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Query() query: SearchWorkItemsQueryDto,
  ): Promise<SearchWorkItemsResponseDto> {
    return this.usecase.getSprintWorkItems(
      String(user.sub),
      workspaceId,
      sprintId,
      query,
    );
  }

  @Get(':sprintId')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve sprint metadata' })
  @ApiDataResponse(SprintResponseDto)
  async getSprintMetadata(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
  ): Promise<SprintResponseDto> {
    return this.usecase.getSprintMetadata(
      String(user.sub),
      workspaceId,
      sprintId,
    );
  }

  @Post()
  @Authenticated()
  @ApiOperation({ summary: 'Create sprint' })
  @ApiDataResponse(SprintResponseDto, { status: HttpStatus.CREATED })
  async createSprint(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateSprintDto,
  ): Promise<SprintResponseDto> {
    return this.usecase.createSprint(String(user.sub), workspaceId, dto);
  }

  @Post('internal')
  @RequireInternalScopes('sprints:write')
  @ApiOperation({ summary: 'Create sprint for internal workers' })
  @ApiDataResponse(SprintResponseDto, { status: HttpStatus.CREATED })
  async createSprintForInternal(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body() dto: CreateSprintForInternalDto,
  ): Promise<SprintResponseDto> {
    return this.usecase.createSprint(dto.requestedByUserId, workspaceId, dto);
  }

  @Patch('internal/:sprintId')
  @RequireInternalScopes('sprints:write')
  @ApiOperation({ summary: 'Update sprint metadata for internal workers' })
  @ApiDataResponse(SprintResponseDto)
  async updateSprintMetadataForInternal(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Body() dto: UpdateSprintMetadataForInternalDto,
  ): Promise<SprintResponseDto> {
    return this.usecase.updateSprintMetadata(
      dto.requestedByUserId,
      workspaceId,
      sprintId,
      dto,
    );
  }

  @Patch(':sprintId')
  @Authenticated()
  @ApiOperation({ summary: 'Update sprint metadata' })
  @ApiDataResponse(SprintResponseDto)
  async updateSprintMetadata(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Body() dto: UpdateSprintMetadataDto,
  ): Promise<SprintResponseDto> {
    return this.usecase.updateSprintMetadata(
      String(user.sub),
      workspaceId,
      sprintId,
      dto,
    );
  }

  @Post(':sprintId/work-items')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add work items to sprint' })
  @ApiNoContentResponse({
    description: 'Successfully added work items to sprint',
  })
  async addSprintWorkItems(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Body() dto: AddSprintWorkItemsDto,
  ): Promise<void> {
    await this.usecase.addSprintWorkItems(
      String(user.sub),
      workspaceId,
      sprintId,
      dto,
    );
  }

  @Post('internal/:sprintId/work-items')
  @RequireInternalScopes('sprints:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Add work items to sprint for internal workers' })
  @ApiNoContentResponse({
    description: 'Successfully added work items to sprint',
  })
  async addSprintWorkItemsForInternal(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Body() dto: AddSprintWorkItemsForInternalDto,
  ): Promise<void> {
    await this.usecase.addSprintWorkItems(
      dto.requestedByUserId,
      workspaceId,
      sprintId,
      dto,
    );
  }

  @Delete('internal/:sprintId/work-items/:itemId')
  @RequireInternalScopes('sprints:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove work item from sprint for internal workers',
  })
  @ApiNoContentResponse({
    description: 'Successfully removed work item from sprint',
  })
  async removeSprintWorkItemForInternal(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: RemoveSprintWorkItemForInternalDto,
  ): Promise<void> {
    await this.usecase.removeSprintWorkItem(
      dto.requestedByUserId,
      workspaceId,
      sprintId,
      itemId,
    );
  }

  @Delete(':sprintId/work-items/:itemId')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove work item from sprint' })
  @ApiNoContentResponse({
    description: 'Successfully removed work item from sprint',
  })
  async removeSprintWorkItem(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    await this.usecase.removeSprintWorkItem(
      String(user.sub),
      workspaceId,
      sprintId,
      itemId,
    );
  }

  @Delete('internal/:sprintId')
  @RequireInternalScopes('sprints:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete sprint for internal workers' })
  @ApiNoContentResponse({ description: 'Successfully deleted sprint' })
  async deleteSprintForInternal(
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
    @Body() dto: RemoveSprintWorkItemForInternalDto,
  ): Promise<void> {
    await this.usecase.deleteSprint(
      dto.requestedByUserId,
      workspaceId,
      sprintId,
    );
  }

  @Delete(':sprintId')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete sprint' })
  @ApiNoContentResponse({ description: 'Successfully deleted sprint' })
  async deleteSprint(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Param('sprintId', ParseUUIDPipe) sprintId: string,
  ): Promise<void> {
    await this.usecase.deleteSprint(String(user.sub), workspaceId, sprintId);
  }
}
