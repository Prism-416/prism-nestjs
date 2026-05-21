import { Module } from '@nestjs/common';
import { EmbeddingJobController } from '@/modules/embedding/controller';
import { EmbeddingJobRepository } from '@/modules/embedding/repository';
import { EmbeddingJobUseCase } from '@/modules/embedding/usecases';
import { AdminModule } from '@/modules/admin';

@Module({
  imports: [AdminModule],
  controllers: [EmbeddingJobController],
  providers: [EmbeddingJobRepository, EmbeddingJobUseCase],
})
export class EmbeddingModule {}
