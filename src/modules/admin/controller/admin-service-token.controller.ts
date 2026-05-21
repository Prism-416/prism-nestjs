import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/core/response';
import { AdminAuthenticated } from '@/modules/admin/decorators';
import {
  CreateServiceAccountDto,
  CreateServiceApiTokenDto,
  IssueServiceApiTokenDto,
  IssueServiceApiTokenResponseDto,
  ServiceAccountResponseDto,
  ServiceApiTokenResponseDto,
} from '@/modules/admin/dto';
import {
  CreatedInternalApiToken,
  InternalApiTokenMetadataRow,
  InternalApiTokenRow,
} from '@/modules/admin/types';
import { InternalUseCase } from '@/modules/admin/usecases';

@ApiTags('Admin Service Tokens')
@Controller()
export class AdminServiceTokenController {
  constructor(private readonly usecase: InternalUseCase) {}

  @Get('service-accounts')
  @AdminAuthenticated()
  @ApiOperation({ summary: 'List service accounts' })
  @ApiDataResponse(ServiceAccountResponseDto, { isArray: true })
  listServiceAccounts(): Promise<ServiceAccountResponseDto[]> {
    return this.usecase.listServiceAccounts();
  }

  @Post('service-accounts')
  @AdminAuthenticated()
  @ApiOperation({ summary: 'Create a service account' })
  @ApiDataResponse(ServiceAccountResponseDto, { status: HttpStatus.CREATED })
  createServiceAccount(
    @Body() dto: CreateServiceAccountDto,
  ): Promise<ServiceAccountResponseDto> {
    return this.usecase.createServiceAccount(dto);
  }

  @Post('service-accounts/:serviceAccountId/activate')
  @AdminAuthenticated()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a service account' })
  @ApiDataResponse(ServiceAccountResponseDto)
  activateServiceAccount(
    @Param('serviceAccountId') serviceAccountId: string,
  ): Promise<ServiceAccountResponseDto> {
    return this.usecase.activateServiceAccount(serviceAccountId);
  }

  @Post('service-accounts/:serviceAccountId/deactivate')
  @AdminAuthenticated()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a service account' })
  @ApiDataResponse(ServiceAccountResponseDto)
  deactivateServiceAccount(
    @Param('serviceAccountId') serviceAccountId: string,
  ): Promise<ServiceAccountResponseDto> {
    return this.usecase.deactivateServiceAccount(serviceAccountId);
  }

  @Get('service-accounts/:serviceAccountId/api-tokens')
  @AdminAuthenticated()
  @ApiOperation({ summary: 'List service API tokens for a service account' })
  @ApiDataResponse(ServiceApiTokenResponseDto, { isArray: true })
  async listServiceApiTokens(
    @Param('serviceAccountId') serviceAccountId: string,
  ): Promise<ServiceApiTokenResponseDto[]> {
    const tokens =
      await this.usecase.listServiceApiTokensForServiceAccount(
        serviceAccountId,
      );

    return tokens.map((token) => this.toServiceApiTokenResponse(token));
  }

  @Post('service-accounts/:serviceAccountId/api-tokens')
  @AdminAuthenticated()
  @ApiOperation({ summary: 'Issue a service API token for a service account' })
  @ApiDataResponse(IssueServiceApiTokenResponseDto, {
    status: HttpStatus.CREATED,
  })
  async createServiceApiToken(
    @Param('serviceAccountId') serviceAccountId: string,
    @Body() dto: CreateServiceApiTokenDto,
  ): Promise<IssueServiceApiTokenResponseDto> {
    const created = await this.usecase.createServiceApiToken({
      serviceAccountId,
      name: dto.name,
      scopes: dto.scopes,
      expiresAt: dto.expiresAt,
    });

    return this.toIssueServiceApiTokenResponse(created);
  }

  @Post('service-api-tokens')
  @AdminAuthenticated()
  @ApiOperation({ summary: 'Issue a service API token by service name' })
  @ApiDataResponse(IssueServiceApiTokenResponseDto, {
    status: HttpStatus.CREATED,
  })
  async issueServiceApiToken(
    @Body() dto: IssueServiceApiTokenDto,
  ): Promise<IssueServiceApiTokenResponseDto> {
    const created = await this.usecase.createServiceApiTokenForServiceName({
      serviceName: dto.serviceName,
      serviceDescription: dto.serviceDescription,
      tokenName: dto.tokenName,
      scopes: dto.scopes,
      expiresAt: dto.expiresAt,
    });

    return this.toIssueServiceApiTokenResponse(created);
  }

  @Post('service-api-tokens/:apiTokenId/revoke')
  @AdminAuthenticated()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a service API token' })
  @ApiDataResponse(ServiceApiTokenResponseDto)
  async revokeServiceApiToken(
    @Param('apiTokenId') apiTokenId: string,
  ): Promise<ServiceApiTokenResponseDto> {
    const revoked = await this.usecase.revokeServiceApiToken(apiTokenId);
    return this.toServiceApiTokenResponse(revoked);
  }

  private toIssueServiceApiTokenResponse(
    created: CreatedInternalApiToken,
  ): IssueServiceApiTokenResponseDto {
    return {
      token: created.token,
      apiToken: this.toServiceApiTokenResponse(created.apiToken),
    };
  }

  private toServiceApiTokenResponse(
    row: InternalApiTokenMetadataRow | InternalApiTokenRow,
  ): ServiceApiTokenResponseDto {
    return {
      apiTokenId: row.apiTokenId,
      serviceAccountId: row.serviceAccountId,
      name: row.name,
      tokenPrefix: row.tokenPrefix,
      scopes: row.scopes,
      expiresAt: row.expiresAt,
      lastUsedAt: row.lastUsedAt,
      revokedAt: row.revokedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
