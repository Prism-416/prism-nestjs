import { Controller, Get, Param } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SignUpUseCase } from '@/modules/auth/usecases';

@ApiTags('Authentication')
@Controller()
export class SignUpController {
  constructor(private readonly usecase: SignUpUseCase) {}

  @Get('username')
  @ApiOperation({ summary: 'Check Username Availability' })
  @ApiNoContentResponse({ description: 'Username Available' })
  async checkUsername(@Param('username') username: string) {
    await this.usecase.checkUsername(username);
  }
}
