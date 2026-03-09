import { Controller, Get, Redirect } from '@nestjs/common';
import { AppService } from '@/app.service';

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
}
