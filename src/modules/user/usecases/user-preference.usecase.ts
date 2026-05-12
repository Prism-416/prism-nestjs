import { Injectable } from '@nestjs/common';
import { UserPreferencesResponseDto } from '@/modules/user/dto';
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
}
