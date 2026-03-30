import { Controller, Get, Redirect, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AppService } from '@/app.service';
import { Authenticated } from '@/common/auth';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Redirect('/health', 302)
  redirectRoot() {
    return;
  }

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get('ready')
  getReadiness() {
    return this.appService.getReadiness();
  }

  @Get('me')
  @Authenticated()
  getMe(@Req() req: Request) {
    const request = req as Request & { user?: Record<string, unknown> };
    return {
      user: request.user ?? null,
    };
  }
}
