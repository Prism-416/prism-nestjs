import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated, CurrentUser } from '@/core/auth';
import type { JwtPayload } from '@/core/auth';
import { ApiDataResponse } from '@/core/response';
import {
  ListNotificationsQueryDto,
  ListNotificationsResponseDto,
  NotificationResponseDto,
} from '@/modules/notification/dto';
import { NotificationUseCase } from '@/modules/notification/usecases';

@ApiTags('Notification')
@Controller()
export class NotificationController {
  constructor(private readonly usecase: NotificationUseCase) {}

  @Get()
  @Authenticated()
  @ApiOperation({ summary: 'List current user notifications' })
  @ApiDataResponse(ListNotificationsResponseDto)
  async listNotifications(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListNotificationsQueryDto,
  ): Promise<ListNotificationsResponseDto> {
    return this.usecase.listNotifications(String(user.sub), query);
  }

  @Patch(':notificationId/read')
  @Authenticated()
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiDataResponse(NotificationResponseDto)
  async markNotificationRead(
    @CurrentUser() user: JwtPayload,
    @Param('notificationId') notificationId: string,
  ): Promise<NotificationResponseDto> {
    return this.usecase.markNotificationRead(String(user.sub), notificationId);
  }

  @Patch('read-all')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiNoContentResponse({
    description: 'Successfully marked all notifications as read',
  })
  async markAllNotificationsRead(
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    await this.usecase.markAllNotificationsRead(String(user.sub));
  }

  @Delete(':notificationId')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiNoContentResponse({
    description: 'Successfully deleted the notification',
  })
  async deleteNotification(
    @CurrentUser() user: JwtPayload,
    @Param('notificationId') notificationId: string,
  ): Promise<void> {
    await this.usecase.deleteNotification(String(user.sub), notificationId);
  }
}
