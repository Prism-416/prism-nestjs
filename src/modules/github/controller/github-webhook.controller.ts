import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiDataResponse } from '@/core/response';
import { GithubWebhookResponseDto } from '@/modules/github/dto';
import { GithubWebhookUseCase } from '@/modules/github/usecases';

type RawBodyRequest = Request & {
  rawBody?: Buffer;
};

@ApiTags('GitHub Webhook')
@Controller('webhooks')
export class GithubWebhookController {
  constructor(private readonly usecase: GithubWebhookUseCase) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Receive GitHub App webhooks' })
  @ApiDataResponse(GithubWebhookResponseDto, { status: HttpStatus.ACCEPTED })
  async handleWebhook(
    @Req() request: RawBodyRequest,
    @Body() payload: unknown,
    @Headers('x-github-event') event: string | undefined,
    @Headers('x-github-delivery') deliveryId: string | undefined,
    @Headers('x-hub-signature-256') signature: string | undefined,
  ): Promise<GithubWebhookResponseDto> {
    if (!event) {
      throw new BadRequestException('GitHub webhook event header is required.');
    }

    if (!request.rawBody) {
      throw new BadRequestException('Raw GitHub webhook body is required.');
    }

    return this.usecase.handleWebhook({
      event,
      deliveryId,
      signature,
      rawBody: request.rawBody,
      payload,
    });
  }
}
