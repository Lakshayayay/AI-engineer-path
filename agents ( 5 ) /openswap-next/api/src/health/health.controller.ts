import { Controller, Get } from '@nestjs/common';

// A cheap route to confirm the API is up, before anything spends model credits.
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
