import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

class OAuthSignUpProfileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  fullName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(30)
  username!: string;
}

export class SignUpWithGoogleDto extends OAuthSignUpProfileDto {
  @IsString()
  idToken!: string;
}

export class SignUpWithGithubDto extends OAuthSignUpProfileDto {
  @IsString()
  code!: string;

  @IsString()
  @MinLength(8)
  state!: string;

  @IsOptional()
  @IsString()
  redirectUri?: string;
}
