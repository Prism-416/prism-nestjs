import { Module } from '@nestjs/common';
import { EmbeddingJobController } from '@/modules/embedding/controller';
import { EmbeddingJobRepository } from '@/modules/embedding/repository';
import { EmbeddingJobUseCase } from '@/modules/embedding/usecases';
import { InternalModule } from '@/modules/internal';

@Module({
  imports: [InternalModule],
  controllers: [EmbeddingJobController],
  providers: [EmbeddingJobRepository, EmbeddingJobUseCase],
})
export class EmbeddingModule {}
