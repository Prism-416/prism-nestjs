import { Module } from '@nestjs/common';
import { ProjectController } from '@/modules/project/controller';
import { ProjectRepository } from '@/modules/project/repository';
import { ProjectUseCase } from '@/modules/project/usecases';

@Module({
  controllers: [ProjectController],
  providers: [ProjectRepository, ProjectUseCase],
})
export class ProjectModule {}
