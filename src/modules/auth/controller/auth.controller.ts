import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  AuthTokenCookieInterceptor,
  REFRESH_TOKEN_COOKIE,
  RefreshToken,
} from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import { AuthUseCase } from '@/modules/auth/usecases';
import {
  AuthTokenResponseDto,
  GithubOAuthAuthorizeQueryDto,
  GithubOAuthAuthorizeResponseDto,
  OAuthSignInResponseDto,
  RequestEmailVerificationDto,
  RequestEmailVerificationResponseDto,
  SignInWithEmailDto,
  SignInWithGithubDto,
  SignInWithGoogleDto,
} from '@/modules/auth/dto';

@ApiTags('Authentication')
@Controller()
export class AuthController {
  constructor(private readonly usecase: AuthUseCase) {}

  @Post('signin')
  @ApiOperation({ summary: 'Sign In with Email' })
  @ApiDataResponse(AuthTokenResponseDto, { status: HttpStatus.CREATED })
  @UseInterceptors(AuthTokenCookieInterceptor)
  async signIn(@Body() dto: SignInWithEmailDto) {
    return await this.usecase.signInWithEmail(dto);
  }

  @Post('email-verification')
  @ApiOperation({ summary: 'Request Email Verification' })
  @ApiDataResponse(RequestEmailVerificationResponseDto, {
    status: HttpStatus.CREATED,
  })
  async requestEmailVerification(@Body() dto: RequestEmailVerificationDto) {
    return await this.usecase.requestEmailVerification(dto);
  }

  @Get('oauth/github/authorize')
  @ApiOperation({ summary: 'Create GitHub App Authorization URL' })
  @ApiDataResponse(GithubOAuthAuthorizeResponseDto, { status: HttpStatus.OK })
  createGithubAuthorizationUrl(
    @Query() query: GithubOAuthAuthorizeQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): GithubOAuthAuthorizeResponseDto {
    const authorization = this.usecase.createGithubAuthorizationRequest(
      query.redirectUri,
    );

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

  @Post('oauth/google')
  @ApiOperation({ summary: 'Authorize User with Google ID Token' })
  @ApiDataResponse(OAuthSignInResponseDto, { status: HttpStatus.CREATED })
  @UseInterceptors(AuthTokenCookieInterceptor)
  async signInWithGoogle(
    @Body() dto: SignInWithGoogleDto,
  ): Promise<OAuthSignInResponseDto> {
    return await this.usecase.signInWithGoogle(dto);
  }

  @Post('oauth/github')
  @ApiOperation({ summary: 'Authorize User with GitHub Authorization Code' })
  @ApiDataResponse(OAuthSignInResponseDto, { status: HttpStatus.CREATED })
  @UseInterceptors(AuthTokenCookieInterceptor)
  async signInWithGithub(
    @Body() dto: SignInWithGithubDto,
    @Headers('cookie') cookieHeader: string | undefined,
  ): Promise<OAuthSignInResponseDto> {
    return await this.usecase.signInWithGithub(dto, cookieHeader);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh Access Token' })
  @ApiDataResponse(AuthTokenResponseDto, { status: HttpStatus.CREATED })
  @UseInterceptors(AuthTokenCookieInterceptor)
  async refresh(@RefreshToken() refreshToken: string) {
    return await this.usecase.refresh(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout (Invalidate Refresh Token)' })
  @ApiNoContentResponse({ description: 'Successfully logged out' })
  async logout(
    @RefreshToken() refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.usecase.logout(refreshToken);
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/' });
  }
}
