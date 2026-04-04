import { Body, Controller, Get, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiDataResponse } from '@/common/response';
import { SignUpUseCase } from '@/modules/auth/usecases';
import {
  SignUpWithEmailResponseDto,
  SignUpWithGithubDto,
  SignUpWithGoogleDto,
} from '@/modules/auth/dto';

@ApiTags('Authentication')
@Controller()
export class SignUpController {
  constructor(private readonly usecase: SignUpUseCase) {}

  @Get('username/:username')
  @ApiOperation({ summary: 'Check Username Availability' })
  @ApiNoContentResponse({ description: 'Username Available' })
  async checkUsername(@Param('username') username: string) {
    await this.usecase.checkUsername(username);
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
  ): Promise<SignUpWithEmailResponseDto> {
    return await this.usecase.signUpWithGithub(dto);
  }
}
