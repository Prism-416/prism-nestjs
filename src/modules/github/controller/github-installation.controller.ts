import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { GithubInstallationCallbackQueryDto } from '@/modules/github/dto';
import { GithubInstallationUseCase } from '@/modules/github/usecases';

@ApiTags('GitHub Installation')
@Controller('installations')
export class GithubInstallationController {
  constructor(private readonly usecase: GithubInstallationUseCase) {}

  @Get('callback')
  @ApiOperation({ summary: 'Handle GitHub App installation callback' })
  async handleCallback(
    @Query() query: GithubInstallationCallbackQueryDto,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.usecase.handleCallback(query);

    response.redirect(HttpStatus.FOUND, result.redirectUrl);
  }
}
