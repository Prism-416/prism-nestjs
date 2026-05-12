import { Injectable } from '@nestjs/common';
import {
  UpdateUserPreferencesDto,
  UserPreferencesResponseDto,
} from '@/modules/user/dto';
import { UserPreferencesNotFoundError } from '@/modules/user/errors';
import { UserPreferenceRepository } from '@/modules/user/repository';

@Injectable()
export class UserPreferenceUseCase {
  constructor(private readonly repo: UserPreferenceRepository) {}

  async getPreferences(userId: string): Promise<UserPreferencesResponseDto> {
    const preferences = await this.repo.findPreferencesByUserId(userId);
    if (!preferences) {
      throw new UserPreferencesNotFoundError();
    }

    return preferences;
  }

  async updatePreferences(
    userId: string,
    dto: UpdateUserPreferencesDto,
  ): Promise<UserPreferencesResponseDto> {
    if (
      dto.theme === undefined &&
      dto.locale === undefined &&
      dto.timezone === undefined &&
      dto.emailNotificationsEnabled === undefined
    ) {
      return this.getPreferences(userId);
    }

    const preferences = await this.repo.updatePreferences({
      userId,
      theme: dto.theme,
      locale: dto.locale,
      timezone: dto.timezone,
      emailNotificationsEnabled: dto.emailNotificationsEnabled,
    });
    if (!preferences) {
      throw new UserPreferencesNotFoundError();
    }

    return preferences;
  }
}
