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

export class SignInWithGoogleDto {
  @IsString()
  idToken!: string;
}

export class SignInWithGithubDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  redirectUri?: string;
}

export class AuthTokenResponseDto {
  @ApiProperty()
  accessToken: string;
}

export class AuthTokenPairResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}
