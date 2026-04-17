import {
  Body,
  Controller,
  Get,
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

  @Post('verify')
  @ApiOperation({ summary: 'Verify Email with Token' })
  @ApiDataResponse(VerifyEmailResponseDto, { status: HttpStatus.CREATED })
  async verifyEmail(
    @Query('token') token: string,
  ): Promise<VerifyEmailResponseDto> {
    return await this.usecase.verifyEmail(token);
  }
}
