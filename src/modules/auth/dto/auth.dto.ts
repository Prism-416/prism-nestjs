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

  @IsOptional()
  @IsString()
  redirectUri?: string;
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

export class AuthTokenResponseDto {
  @ApiProperty()
  accessToken: string;
}

export class OAuthSignInResponseDto {
  @ApiProperty({ required: false })
  accessToken?: string;

  @ApiProperty({
    required: false,
    description:
      'True when the OAuth identity is not linked to an existing user.',
  })
  newUser?: boolean;
}

export class AuthTokenPairResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}
