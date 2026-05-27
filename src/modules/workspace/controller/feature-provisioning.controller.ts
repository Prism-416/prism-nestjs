import { Body, Controller, Get, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import {
  CreateFeatureProvisioningRequestDto,
  FeatureProvisioningRequestResponseDto,
} from '@/modules/workspace/dto';
import { FeatureProvisioningUseCase } from '@/modules/workspace/usecases';

@ApiTags('Workspace Feature Provisioning')
@Controller(':workspaceId/provision')
export class FeatureProvisioningController {
  constructor(private readonly usecase: FeatureProvisioningUseCase) {}

  @Post()
  @Authenticated()
  @ApiOperation({ summary: 'Request feature provisioning' })
  @ApiDataResponse(FeatureProvisioningRequestResponseDto, {
    status: HttpStatus.CREATED,
  })
  async createFeatureProvisioningRequest(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateFeatureProvisioningRequestDto,
  ): Promise<FeatureProvisioningRequestResponseDto> {
    return this.usecase.createFeatureProvisioningRequest(
      String(user.sub),
      workspaceId,
      dto,
    );
  }

  @Get(':requestId')
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve feature provisioning request metadata' })
  @ApiDataResponse(FeatureProvisioningRequestResponseDto)
  async getFeatureProvisioningRequest(
    @CurrentUser() user: JwtPayload,
    @Param('workspaceId') workspaceId: string,
    @Param('requestId') requestId: string,
  ): Promise<FeatureProvisioningRequestResponseDto> {
    return this.usecase.getFeatureProvisioningRequest(
      String(user.sub),
      workspaceId,
      requestId,
    );
  }
}
