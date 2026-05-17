import { Module } from '@nestjs/common';
import { DocumentController } from '@/modules/document/controller';
import { DocumentRepository } from '@/modules/document/repository';
import { DocumentUseCase } from '@/modules/document/usecases';
import { ProjectModule } from '@/modules/project/project.module';

@Module({
  imports: [ProjectModule],
  controllers: [DocumentController],
  providers: [DocumentRepository, DocumentUseCase],
})
export class DocumentModule {}
