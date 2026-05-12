import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { USER_PREFERENCE_THEMES } from '@/modules/user/types';
import type { UserPreferenceTheme } from '@/modules/user/types';
import { normalizeTrimmedString } from '@/modules/user/utils';

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({ enum: USER_PREFERENCE_THEMES })
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsIn(USER_PREFERENCE_THEMES)
  theme?: UserPreferenceTheme;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  locale?: string;

  @ApiPropertyOptional()
  @Transform(({ value }) => normalizeTrimmedString(value as unknown))
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;
}

export class UserPreferencesResponseDto {
  @ApiProperty({ enum: USER_PREFERENCE_THEMES })
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
