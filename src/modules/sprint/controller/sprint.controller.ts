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
  Query,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import {
  AddSprintWorkItemsDto,
  CreateSprintDto,
  SprintResponseDto,
  UpdateSprintMetadataDto,
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
    @Param('workspaceId') workspaceId: string,
  ): Promise<SprintResponseDto[]> {
    return this.usecase.getSprints(String(user.sub), workspaceId);
  }

  @Get(':sprintId/work-items')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve sprint work items' })
  @ApiDataResponse(SearchWorkItemsResponseDto)
  async getSprintWorkItems(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Param('sprintId') sprintId: string,
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
    @Param('workspaceId') workspaceId: string,
    @Param('sprintId') sprintId: string,
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
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateSprintDto,
  ): Promise<SprintResponseDto> {
    return this.usecase.createSprint(String(user.sub), workspaceId, dto);
  }

  @Patch(':sprintId')
  @Authenticated()
  @ApiOperation({ summary: 'Update sprint metadata' })
  @ApiDataResponse(SprintResponseDto)
  async updateSprintMetadata(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Param('sprintId') sprintId: string,
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
    @Param('workspaceId') workspaceId: string,
    @Param('sprintId') sprintId: string,
    @Body() dto: AddSprintWorkItemsDto,
  ): Promise<void> {
    await this.usecase.addSprintWorkItems(
      String(user.sub),
      workspaceId,
      sprintId,
      dto,
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
    @Param('workspaceId') workspaceId: string,
    @Param('sprintId') sprintId: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    await this.usecase.removeSprintWorkItem(
      String(user.sub),
      workspaceId,
      sprintId,
      itemId,
    );
  }

  @Delete(':sprintId')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete sprint' })
  @ApiNoContentResponse({ description: 'Successfully deleted sprint' })
  async deleteSprint(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Param('sprintId') sprintId: string,
  ): Promise<void> {
    await this.usecase.deleteSprint(String(user.sub), workspaceId, sprintId);
  }
}
