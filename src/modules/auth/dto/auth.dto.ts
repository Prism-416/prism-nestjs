import { IsEmail, IsString } from 'class-validator';

export class SignUpWithEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsString()
  fullName!: string;

  @IsString()
  username!: string;
}

export class SignUpWithEmailResponseDto {
  userId: string;
  email: string;
  createdAt: Date;
}

export class SignInWithEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class AuthTokenResponseDto {
  accessToken: string;
}

export class AuthTokenPairResponseDto {
  accessToken: string;
  refreshToken: string;
}
