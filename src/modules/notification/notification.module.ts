import { Module } from '@nestjs/common';
import { NotificationController } from '@/modules/notification/controller';
import { NotificationGateway } from '@/modules/notification/gateway';
import { NotificationRepository } from '@/modules/notification/repository';
import {
  NotificationRealtimePublisherService,
  NotificationService,
} from '@/modules/notification/services';
import { NotificationUseCase } from '@/modules/notification/usecases';

@Module({
  controllers: [NotificationController],
  providers: [
    NotificationGateway,
    NotificationRealtimePublisherService,
    NotificationRepository,
    NotificationService,
    NotificationUseCase,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
