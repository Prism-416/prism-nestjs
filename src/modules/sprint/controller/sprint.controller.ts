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
  AddSprintWorkItemDto,
  CreateSprintDto,
  SprintResponseDto,
  SprintWorkItemResponseDto,
  UpdateSprintMetadataDto,
} from '@/modules/sprint/dto';
import {
  SearchWorkItemsQueryDto,
  SearchWorkItemsResponseDto,
} from '@/modules/project/dto';
import { SprintUseCase } from '@/modules/sprint/usecases';

@ApiTags('Project Sprint')
@Controller(':projectId/sprints')
export class SprintController {
  constructor(private readonly usecase: SprintUseCase) {}

  @Get()
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve project sprints' })
  @ApiDataResponse(SprintResponseDto, { isArray: true })
  async getSprints(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
  ): Promise<SprintResponseDto[]> {
    return this.usecase.getSprints(String(user.sub), projectId);
  }

  @Get(':sprintId/work-items')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve sprint work items' })
  @ApiDataResponse(SearchWorkItemsResponseDto)
  async getSprintWorkItems(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Query() query: SearchWorkItemsQueryDto,
  ): Promise<SearchWorkItemsResponseDto> {
    return this.usecase.getSprintWorkItems(
      String(user.sub),
      projectId,
      sprintId,
      query,
    );
  }

  @Post(':sprintId/work-items')
  @Authenticated()
  @ApiOperation({ summary: 'Add work item to sprint' })
  @ApiDataResponse(SprintWorkItemResponseDto, { status: HttpStatus.CREATED })
  async addSprintWorkItem(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Body() dto: AddSprintWorkItemDto,
  ): Promise<SprintWorkItemResponseDto> {
    return this.usecase.addSprintWorkItem(
      String(user.sub),
      projectId,
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
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    await this.usecase.removeSprintWorkItem(
      String(user.sub),
      projectId,
      sprintId,
      itemId,
    );
  }

  @Get(':sprintId')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve sprint metadata' })
  @ApiDataResponse(SprintResponseDto)
  async getSprintMetadata(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
  ): Promise<SprintResponseDto> {
    return this.usecase.getSprintMetadata(
      String(user.sub),
      projectId,
      sprintId,
    );
  }

  @Post()
  @Authenticated()
  @ApiOperation({ summary: 'Create sprint' })
  @ApiDataResponse(SprintResponseDto, { status: HttpStatus.CREATED })
  async createSprint(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Body() dto: CreateSprintDto,
  ): Promise<SprintResponseDto> {
    return this.usecase.createSprint(String(user.sub), projectId, dto);
  }

  @Patch(':sprintId')
  @Authenticated()
  @ApiOperation({ summary: 'Update sprint metadata' })
  @ApiDataResponse(SprintResponseDto)
  async updateSprintMetadata(
    @CurrentUser() user: JwtPayload,
    @Param('projectId') projectId: string,
    @Param('sprintId') sprintId: string,
    @Body() dto: UpdateSprintMetadataDto,
  ): Promise<SprintResponseDto> {
    return this.usecase.updateSprintMetadata(
      String(user.sub),
      projectId,
      sprintId,
      dto,
    );
  }
}
