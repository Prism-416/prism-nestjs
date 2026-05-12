import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth/jwt-token.service';
import { ApiDataResponse } from '@/core/response';
import { UserPreferencesResponseDto } from '@/modules/user/dto';
import { UserPreferenceUseCase } from '@/modules/user/usecases';

@ApiTags('User')
@Controller('me/preferences')
export class UserPreferenceController {
  constructor(private readonly usecase: UserPreferenceUseCase) {}

  @Get()
  @Authenticated()
  @ApiOperation({ summary: 'Retrieve current user preferences' })
  @ApiDataResponse(UserPreferencesResponseDto)
  async getPreferences(
    @CurrentUser() user: JwtPayload,
  ): Promise<UserPreferencesResponseDto> {
    return this.usecase.getPreferences(String(user.sub));
  }
}
