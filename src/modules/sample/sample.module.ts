import { Module } from '@nestjs/common';
import { SampleController } from '@/modules/sample/controller';
import { SampleRepository } from '@/modules/sample/repository';
import { SampleUseCase } from '@/modules/sample/usecases';

@Module({
  controllers: [SampleController],
  providers: [SampleRepository, SampleUseCase],
})
export class SampleModule {}
