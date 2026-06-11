import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/core/response';
import { RequireInternalScopes } from '@/modules/admin';
import { WorkItemProjectLookupResponseDto } from '@/modules/project/dto';
import { WorkItemUseCase } from '@/modules/project/usecases';

@ApiTags('Project Work Item')
@Controller('work-items')
export class WorkItemLookupController {
  constructor(private readonly usecase: WorkItemUseCase) {}

  @Get('internal/by-code/:taskCode')
  @RequireInternalScopes('projects:read')
  @ApiOperation({
    summary: 'Resolve project id from a work item code for internal workers',
  })
  @ApiDataResponse(WorkItemProjectLookupResponseDto)
  async getProjectByTaskCodeForInternal(
    @Param('taskCode') taskCode: string,
  ): Promise<WorkItemProjectLookupResponseDto> {
    return this.usecase.getProjectByTaskCodeForInternal(taskCode);
  }
}
