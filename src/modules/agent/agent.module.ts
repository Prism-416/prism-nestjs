import { Module } from '@nestjs/common';
import {
  AgentActionController,
  AgentController,
  AgentMemoryController,
} from '@/modules/agent/controller';
import { AgentRepository } from '@/modules/agent/repository';
import { AgentUseCase } from '@/modules/agent/usecases';

@Module({
  controllers: [AgentController, AgentActionController, AgentMemoryController],
  providers: [AgentRepository, AgentUseCase],
})
export class AgentModule {}
