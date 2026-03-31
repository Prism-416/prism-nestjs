import {
  Body,
  Controller,
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
} from '@/common/auth';
import { ApiDataResponse } from '@/common/response';
import { AuthUseCase } from '@/modules/auth/usecases';
import {
  AuthTokenResponseDto,
  RequestEmailVerificationDto,
  RequestEmailVerificationResponseDto,
  SignInWithEmailDto,
  SignInWithGithubDto,
  SignInWithGoogleDto,
  SignUpWithEmailDto,
  SignUpWithEmailResponseDto,
  VerifyEmailResponseDto,
} from '@/modules/auth/dto';

@ApiTags('Authentication')
@Controller()
export class AuthController {
  constructor(private readonly usecase: AuthUseCase) {}

  @Post('signup')
  @ApiOperation({ summary: 'Sign Up with Email' })
  @ApiDataResponse(SignUpWithEmailResponseDto, { status: HttpStatus.CREATED })
  async signUp(
    @Body() dto: SignUpWithEmailDto,
  ): Promise<SignUpWithEmailResponseDto> {
    return await this.usecase.signUpWithEmail(dto);
  }

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

  @Post('verify')
  @ApiOperation({ summary: 'Verify Email with Token' })
  @ApiDataResponse(VerifyEmailResponseDto, { status: HttpStatus.CREATED })
  async verifyEmail(@Query('token') token: string) {
    return await this.usecase.verifyEmail(token);
  }

  @Post('oauth/google')
  @ApiOperation({ summary: 'Authorize User with Google ID Token' })
  @ApiDataResponse(AuthTokenResponseDto, { status: HttpStatus.CREATED })
  @UseInterceptors(AuthTokenCookieInterceptor)
  async signInWithGoogle(@Body() dto: SignInWithGoogleDto) {
    return await this.usecase.signInWithGoogle(dto);
  }

  @Post('oauth/github')
  @ApiOperation({ summary: 'Authorize User with GitHub Authorization Code' })
  @ApiDataResponse(AuthTokenResponseDto, { status: HttpStatus.CREATED })
  @UseInterceptors(AuthTokenCookieInterceptor)
  async signInWithGithub(@Body() dto: SignInWithGithubDto) {
    return await this.usecase.signInWithGithub(dto);
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
