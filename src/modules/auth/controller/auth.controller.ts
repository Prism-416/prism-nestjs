import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUseCase } from '@/modules/auth/usecases';
import {
  SignUpWithEmailDto,
  SignUpWithEmailResponseDto,
} from '@/modules/auth/dto';

@ApiTags('auth')
@Controller('/signup')
export class SignUpController {
  constructor(private readonly usecase: AuthUseCase) {}

  @Post()
  @ApiOperation({ summary: 'Sign Up with Email' })
  @ApiCreatedResponse({ type: SignUpWithEmailResponseDto })
  async signUp(
    @Body() dto: SignUpWithEmailDto,
  ): Promise<SignUpWithEmailResponseDto> {
    return await this.usecase.signUpWithEmail(dto);
  }
}
