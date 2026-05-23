import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/core/response';
import { AdminAuthenticated } from '@/modules/admin/decorators';
import { EmbeddingCoverageSummaryResponseDto } from '@/modules/admin/dto';
import { AdminEmbeddingCoverageUseCase } from '@/modules/admin/usecases';

@ApiTags('Admin Embeddings')
@Controller('embeddings')
export class AdminEmbeddingCoverageController {
  constructor(private readonly usecase: AdminEmbeddingCoverageUseCase) {}

  @Get('coverage')
  @AdminAuthenticated()
  @ApiOperation({ summary: 'Summarize embedding coverage' })
  @ApiDataResponse(EmbeddingCoverageSummaryResponseDto)
  getCoverageSummary(): Promise<EmbeddingCoverageSummaryResponseDto> {
    return this.usecase.getCoverageSummary();
  }
}
