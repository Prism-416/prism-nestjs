import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RefreshTokenCookieInterceptor } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import { OnboardingUseCase } from '@/modules/onboarding/usecases';
import {
  GithubOAuthAuthorizeResponseDto,
  OAuthSignUpResponseDto,
  RefreshTokenResponseDto,
  SignUpWithEmailDto,
  SignUpWithEmailResponseDto,
  SignUpWithGoogleDto,
  VerifyEmailResponseDto,
} from '@/modules/auth/dto';

@ApiTags('Authentication')
@Controller('auth')
export class SignUpController {
  constructor(private readonly usecase: OnboardingUseCase) {}

  @Get('username/:username')
  @ApiOperation({ summary: 'Check Username Availability' })
  @ApiNoContentResponse({ description: 'Username Available' })
  async checkUsername(@Param('username') username: string) {
    await this.usecase.checkUsername(username);
  }

  @Post('signup')
  @ApiOperation({ summary: 'Sign Up with Email' })
  @ApiDataResponse(SignUpWithEmailResponseDto, { status: HttpStatus.CREATED })
  async signUp(
    @Body() dto: SignUpWithEmailDto,
  ): Promise<SignUpWithEmailResponseDto> {
    return await this.usecase.signUpWithEmail(dto);
  }

  @Post('oauth/google/signup')
  @ApiOperation({ summary: 'Signup with Google' })
  @ApiDataResponse(OAuthSignUpResponseDto, { status: HttpStatus.CREATED })
  @UseInterceptors(RefreshTokenCookieInterceptor)
  async signUpWithGoogle(
    @Body() dto: SignUpWithGoogleDto,
  ): Promise<RefreshTokenResponseDto> {
    return await this.usecase.signUpWithGoogle(dto);
  }

  @Get('oauth/github/signup/authorize')
  @ApiOperation({ summary: 'Create GitHub Signup Authorization URL' })
  @ApiDataResponse(GithubOAuthAuthorizeResponseDto, { status: HttpStatus.OK })
  createGithubSignUpAuthorizationUrl(
    @Res({ passthrough: true }) res: Response,
  ): GithubOAuthAuthorizeResponseDto {
    const authorization = this.usecase.createGithubSignUpAuthorizationRequest();

    res.cookie(
      authorization.transactionCookie.name,
      authorization.transactionCookie.value,
      authorization.transactionCookie.options,
    );

    return {
      authorizationUrl: authorization.authorizationUrl,
      state: authorization.state,
      expiresAt: authorization.expiresAt,
    };
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify Email with Token' })
  @ApiDataResponse(VerifyEmailResponseDto, { status: HttpStatus.CREATED })
  async verifyEmail(
    @Query('token') token: string,
  ): Promise<VerifyEmailResponseDto> {
    return await this.usecase.verifyEmail(token);
  }
}
