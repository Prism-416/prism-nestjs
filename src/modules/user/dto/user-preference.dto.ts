import { ApiProperty } from '@nestjs/swagger';
import type { UserPreferenceTheme } from '@/modules/user/types';

export class UserPreferencesResponseDto {
  @ApiProperty({ enum: ['system', 'light', 'dark'] })
  theme!: UserPreferenceTheme;

  @ApiProperty()
  locale!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty()
  emailNotificationsEnabled!: boolean;

  @ApiProperty()
  updatedAt!: Date;
}
