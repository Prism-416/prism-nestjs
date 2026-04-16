import { IsString } from 'class-validator';

export class SignUpWithGoogleDto {
  @IsString()
  idToken!: string;
}
