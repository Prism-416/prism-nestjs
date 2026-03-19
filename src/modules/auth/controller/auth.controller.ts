import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  AuthTokenCookieInterceptor,
  RefreshToken,
  REFRESH_TOKEN_COOKIE,
} from '@/common/auth';
import { ApiDataResponse } from '@/common/response';
import { AuthUseCase } from '@/modules/auth/usecases';
import {
  AuthTokenResponseDto,
  SignInWithEmailDto,
  SignUpWithEmailDto,
  SignUpWithEmailResponseDto,
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
