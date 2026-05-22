import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/core/response';
import { AdminAuthenticated } from '@/modules/admin/decorators';
import {
  SearchAdminAuditEventsQueryDto,
  SearchAdminAuditEventsResponseDto,
} from '@/modules/admin/dto';
import { AdminAuditUseCase } from '@/modules/admin/usecases';

@ApiTags('Admin Audit')
@Controller('audit-events')
export class AdminAuditController {
  constructor(private readonly usecase: AdminAuditUseCase) {}

  @Get()
  @AdminAuthenticated()
  @ApiOperation({ summary: 'List admin audit events' })
  @ApiDataResponse(SearchAdminAuditEventsResponseDto)
  searchAuditEvents(
    @Query() query: SearchAdminAuditEventsQueryDto,
  ): Promise<SearchAdminAuditEventsResponseDto> {
    return this.usecase.searchAuditEvents(query);
  }
}
