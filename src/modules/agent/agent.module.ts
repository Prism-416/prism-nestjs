import { Module } from '@nestjs/common';
import { AdminModule } from '@/modules/admin';
import {
  AgentActionController,
  AgentController,
  AgentMemoryController,
} from '@/modules/agent/controller';
import { AgentGateway } from '@/modules/agent/gateway';
import { AgentRepository } from '@/modules/agent/repository';
import { AgentRealtimePublisherService } from '@/modules/agent/services';
import {
  AgentRealtimeSubscriptionUseCase,
  AgentUseCase,
} from '@/modules/agent/usecases';

@Module({
  imports: [AdminModule],
  controllers: [AgentController, AgentActionController, AgentMemoryController],
  providers: [
    AgentGateway,
    AgentRealtimePublisherService,
    AgentRealtimeSubscriptionUseCase,
    AgentRepository,
    AgentUseCase,
  ],
  exports: [AgentRealtimePublisherService],
})
export class AgentModule {}
