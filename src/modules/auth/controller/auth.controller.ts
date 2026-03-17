import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthTokenCookieInterceptor, RefreshToken } from '@/common/auth';
import { AuthUseCase } from '@/modules/auth/usecases';
import {
  AuthTokenResponseDto,
  SignInWithEmailDto,
  SignUpWithEmailDto,
  SignUpWithEmailResponseDto,
} from '@/modules/auth/dto';

@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly usecase: AuthUseCase) {}

  @Post('signup')
  @ApiOperation({ summary: 'Sign Up with Email' })
  @ApiCreatedResponse({ type: SignUpWithEmailResponseDto })
  async signUp(
    @Body() dto: SignUpWithEmailDto,
  ): Promise<SignUpWithEmailResponseDto> {
    return await this.usecase.signUpWithEmail(dto);
  }

  @Post('signin')
  @ApiOperation({ summary: 'Sign In with Email' })
  @ApiCreatedResponse({ type: AuthTokenResponseDto })
  @UseInterceptors(AuthTokenCookieInterceptor)
  async signIn(@Body() dto: SignInWithEmailDto) {
    return await this.usecase.signInWithEmail(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh Access Token' })
  @ApiCreatedResponse({ type: AuthTokenResponseDto })
  @UseInterceptors(AuthTokenCookieInterceptor)
  async refresh(@RefreshToken() refreshToken: string) {
    return await this.usecase.refresh(refreshToken);
  }
}
