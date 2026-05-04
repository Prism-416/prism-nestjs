import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignUpWithEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  fullName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(30)
  username!: string;
}

export class SignUpWithEmailResponseDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  createdAt: Date;
}

export class SignInWithEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RequestEmailVerificationDto {
  @IsEmail()
  email!: string;
}

export class RequestEmailVerificationResponseDto {
  @ApiProperty()
  requested: boolean;
}

export class VerifyEmailResponseDto {
  @ApiProperty()
  verified: boolean;
}

export class RequestPasswordResetDto {
  @IsEmail()
  email!: string;
}

export class RequestPasswordResetResponseDto {
  @ApiProperty()
  requested: boolean;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}

export class ResetPasswordResponseDto {
  @ApiProperty()
  reset: boolean;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword!: string;
}

export class ChangePasswordResponseDto {
  @ApiProperty()
  changed: boolean;
}

export class SignInWithGoogleDto {
  @IsString()
  idToken!: string;
}

export class SignInWithGithubDto {
  @IsString()
  code!: string;

  @IsString()
  @MinLength(8)
  state!: string;
}

export class GithubOAuthCallbackQueryDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  @MinLength(8)
  state!: string;

  @IsOptional()
  @IsString()
  error?: string;

  @IsOptional()
  @IsString()
  error_description?: string;

  @IsOptional()
  @IsString()
  error_uri?: string;
}

export class GithubOAuthAuthorizeResponseDto {
  @ApiProperty()
  authorizationUrl: string;

  @ApiProperty()
  state: string;

  @ApiProperty()
  expiresAt: Date;
}

export class OAuthAccountLinkResponseDto {
  @ApiProperty({ enum: ['google', 'github'] })
  provider!: 'google' | 'github';

  @ApiProperty()
  linked!: boolean;
}

export class OAuthConnectedAccountDto {
  @ApiProperty({ enum: ['google', 'github'] })
  provider!: 'google' | 'github';

  @ApiProperty()
  email!: string;

  @ApiProperty()
  isVerified!: boolean;
}

export class OAuthConnectedAccountsResponseDto {
  @ApiProperty({ type: [OAuthConnectedAccountDto] })
  accounts!: OAuthConnectedAccountDto[];
}

export class AuthMeUserDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  isOAuthUser!: boolean;
}

export class AuthMeResponseDto {
  @ApiProperty({ type: AuthMeUserDto })
  user!: AuthMeUserDto;
}

export class AuthTokenResponseDto {
  @ApiProperty()
  accessToken: string;
}

export class RefreshTokenResponseDto {
  @ApiProperty()
  refreshToken: string;
}

export class AuthTokenPairResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}
