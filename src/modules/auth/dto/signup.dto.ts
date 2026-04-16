import { IsString, MaxLength, MinLength } from 'class-validator';

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
