import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiDataResponse } from '@/core/response';
import { AdminAuthenticated } from '@/modules/admin/decorators';
import {
  CreateServiceAccountDto,
  CreateServiceApiTokenDto,
  IssueServiceApiTokenDto,
  IssueServiceApiTokenResponseDto,
  ServiceAccountResponseDto,
  ServiceApiTokenResponseDto,
  UpdateServiceApiTokenDto,
  UpdateServiceAccountDto,
} from '@/modules/admin/dto';
import {
  AdminAuditContext,
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
    @Req() request: Request,
  ): Promise<ServiceAccountResponseDto> {
    return this.usecase.createServiceAccount(
      dto,
      this.toAdminAuditContext(request),
    );
  }

  @Patch('service-accounts/:serviceAccountId')
  @AdminAuthenticated()
  @ApiOperation({ summary: 'Update a service account' })
  @ApiDataResponse(ServiceAccountResponseDto)
  updateServiceAccount(
    @Param('serviceAccountId') serviceAccountId: string,
    @Body() dto: UpdateServiceAccountDto,
    @Req() request: Request,
  ): Promise<ServiceAccountResponseDto> {
    return this.usecase.updateServiceAccount(
      {
        serviceAccountId,
        name: dto.name,
        description: dto.description,
      },
      this.toAdminAuditContext(request),
    );
  }

  @Post('service-accounts/:serviceAccountId/activate')
  @AdminAuthenticated()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a service account' })
  @ApiDataResponse(ServiceAccountResponseDto)
  activateServiceAccount(
    @Param('serviceAccountId') serviceAccountId: string,
    @Req() request: Request,
  ): Promise<ServiceAccountResponseDto> {
    return this.usecase.activateServiceAccount(
      serviceAccountId,
      this.toAdminAuditContext(request),
    );
  }

  @Post('service-accounts/:serviceAccountId/deactivate')
  @AdminAuthenticated()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a service account' })
  @ApiDataResponse(ServiceAccountResponseDto)
  deactivateServiceAccount(
    @Param('serviceAccountId') serviceAccountId: string,
    @Req() request: Request,
  ): Promise<ServiceAccountResponseDto> {
    return this.usecase.deactivateServiceAccount(
      serviceAccountId,
      this.toAdminAuditContext(request),
    );
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
    @Req() request: Request,
  ): Promise<IssueServiceApiTokenResponseDto> {
    const created = await this.usecase.createServiceApiToken(
      {
        serviceAccountId,
        name: dto.name,
        scopes: dto.scopes,
        expiresAt: dto.expiresAt,
      },
      this.toAdminAuditContext(request),
    );

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
    @Req() request: Request,
  ): Promise<IssueServiceApiTokenResponseDto> {
    const created = await this.usecase.createServiceApiTokenForServiceName(
      {
        serviceName: dto.serviceName,
        serviceDescription: dto.serviceDescription,
        tokenName: dto.tokenName,
        scopes: dto.scopes,
        expiresAt: dto.expiresAt,
      },
      this.toAdminAuditContext(request),
    );

    return this.toIssueServiceApiTokenResponse(created);
  }

  @Patch('service-api-tokens/:apiTokenId')
  @AdminAuthenticated()
  @ApiOperation({ summary: 'Update a service API token' })
  @ApiDataResponse(ServiceApiTokenResponseDto)
  async updateServiceApiToken(
    @Param('apiTokenId') apiTokenId: string,
    @Body() dto: UpdateServiceApiTokenDto,
    @Req() request: Request,
  ): Promise<ServiceApiTokenResponseDto> {
    const token = await this.usecase.updateServiceApiToken(
      {
        apiTokenId,
        name: dto.name,
        scopes: dto.scopes,
        expiresAt: dto.expiresAt,
      },
      this.toAdminAuditContext(request),
    );

    return this.toServiceApiTokenResponse(token);
  }

  @Post('service-api-tokens/:apiTokenId/revoke')
  @AdminAuthenticated()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a service API token' })
  @ApiDataResponse(ServiceApiTokenResponseDto)
  async revokeServiceApiToken(
    @Param('apiTokenId') apiTokenId: string,
    @Req() request: Request,
  ): Promise<ServiceApiTokenResponseDto> {
    const revoked = await this.usecase.revokeServiceApiToken(
      apiTokenId,
      this.toAdminAuditContext(request),
    );
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

  private toAdminAuditContext(request: Request): AdminAuditContext {
    return {
      actorType: 'admin-password',
      requestId: this.extractRequestId(request),
      reason: this.extractAdminReason(request),
    };
  }

  private extractRequestId(request: Request): string | null {
    const requestId = request.res?.getHeader('x-request-id');

    if (Array.isArray(requestId)) {
      return this.normalizeOptionalHeaderValue(requestId[0]);
    }

    return this.normalizeOptionalHeaderValue(requestId);
  }

  private extractAdminReason(request: Request): string | null {
    const reason = request.headers['x-admin-reason'];

    if (Array.isArray(reason)) {
      return this.normalizeAdminReason(reason[0]);
    }

    return this.normalizeAdminReason(reason);
  }

  private normalizeOptionalHeaderValue(
    value: number | string | undefined,
  ): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private normalizeAdminReason(value: string | undefined): string | null {
    const reason = this.normalizeOptionalHeaderValue(value);
    if (!reason) {
      return null;
    }

    if (reason.length > 500) {
      throw new BadRequestException(
        'Admin audit reason must be 500 characters or fewer.',
      );
    }

    return reason;
  }
}
