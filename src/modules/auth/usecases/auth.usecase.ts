import { Injectable } from '@nestjs/common';
import { SignUpWithEmailDto } from '@/modules/auth/dto';
import { AuthRepository } from '@/modules/auth/repository';

@Injectable()
export class AuthUseCase {
  constructor(private readonly repo: AuthRepository) {}

  signUpWithEmail(dto: SignUpWithEmailDto) {
    return this.repo.createUserWithEmail(dto);
  }
}
