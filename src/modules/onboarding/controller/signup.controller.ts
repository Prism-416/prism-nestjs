import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/core/response';
import { OnboardingUseCase } from '@/modules/onboarding/usecases';
import {
  SignUpWithEmailDto,
  SignUpWithEmailResponseDto,
  SignUpWithGithubDto,
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
  @ApiDataResponse(SignUpWithEmailResponseDto, { status: HttpStatus.CREATED })
  async signUpWithGoogle(
    @Body() dto: SignUpWithGoogleDto,
  ): Promise<SignUpWithEmailResponseDto> {
    return await this.usecase.signUpWithGoogle(dto);
  }

  @Post('oauth/github/signup')
  @ApiOperation({ summary: 'Signup with GitHub' })
  @ApiDataResponse(SignUpWithEmailResponseDto, { status: HttpStatus.CREATED })
  async signUpWithGithub(
    @Body() dto: SignUpWithGithubDto,
    @Headers('cookie') cookieHeader: string | undefined,
  ): Promise<SignUpWithEmailResponseDto> {
    return await this.usecase.signUpWithGithub(dto, cookieHeader);
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
