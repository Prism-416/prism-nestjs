import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/core/response';
import { AdminAuthenticated } from '@/modules/admin/decorators';
import {
  GetUserActiveTrendQueryDto,
  GetUserSignupTrendQueryDto,
  UserActiveTrendResponseDto,
  UserActivitySummaryResponseDto,
  UserMetricsSummaryResponseDto,
  UserSignupTrendResponseDto,
} from '@/modules/admin/dto';
import { AdminUserMetricsUseCase } from '@/modules/admin/usecases';

@ApiTags('Admin User Metrics')
@Controller('users')
export class AdminUserMetricsController {
  constructor(private readonly usecase: AdminUserMetricsUseCase) {}

  @Get('metrics')
  @AdminAuthenticated()
  @ApiOperation({ summary: 'Summarize user metrics' })
  @ApiDataResponse(UserMetricsSummaryResponseDto)
  getMetricsSummary(): Promise<UserMetricsSummaryResponseDto> {
    return this.usecase.getMetricsSummary();
  }

  @Get('signups')
  @AdminAuthenticated()
  @ApiOperation({ summary: 'Summarize daily user signups' })
  @ApiDataResponse(UserSignupTrendResponseDto)
  getSignupTrend(
    @Query() query: GetUserSignupTrendQueryDto,
  ): Promise<UserSignupTrendResponseDto> {
    return this.usecase.getSignupTrend(query);
  }

  @Get('activity')
  @AdminAuthenticated()
  @ApiOperation({ summary: 'Summarize active users (DAU/WAU/MAU)' })
  @ApiDataResponse(UserActivitySummaryResponseDto)
  getActivitySummary(): Promise<UserActivitySummaryResponseDto> {
    return this.usecase.getActivitySummary();
  }

  @Get('activity/trend')
  @AdminAuthenticated()
  @ApiOperation({ summary: 'Summarize daily active users (new vs returning)' })
  @ApiDataResponse(UserActiveTrendResponseDto)
  getActiveUserTrend(
    @Query() query: GetUserActiveTrendQueryDto,
  ): Promise<UserActiveTrendResponseDto> {
    return this.usecase.getActiveUserTrend(query);
  }
}
