import { IsEmail, IsString } from 'class-validator';

export class SignUpWithEmailDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;

  @IsString()
  name!: string;

  @IsString()
  displayName!: string;
}

export class SignUpWithEmailResponseDto {
  userId: string;
  email: string;
  name: string;
  displayName: string;
  createdAt: Date;
}
