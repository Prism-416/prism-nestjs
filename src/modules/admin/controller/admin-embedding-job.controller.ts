import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/core/response';
import { AdminAuthenticated } from '@/modules/admin/decorators';
import {
  EmbeddingJobHealthSummaryResponseDto,
  GetEmbeddingJobHealthQueryDto,
} from '@/modules/admin/dto';
import { AdminEmbeddingJobUseCase } from '@/modules/admin/usecases';

@ApiTags('Admin Embedding Jobs')
@Controller('embedding-jobs')
export class AdminEmbeddingJobController {
  constructor(private readonly usecase: AdminEmbeddingJobUseCase) {}

  @Get('health')
  @AdminAuthenticated()
  @ApiOperation({ summary: 'Summarize embedding job health' })
  @ApiDataResponse(EmbeddingJobHealthSummaryResponseDto)
  getHealthSummary(
    @Query() query: GetEmbeddingJobHealthQueryDto,
  ): Promise<EmbeddingJobHealthSummaryResponseDto> {
    return this.usecase.getHealthSummary(query);
  }
}
