import { Controller, Get } from '@nestjs/common';

/**
 * Health check cho Render (healthCheckPath: /api/health).
 */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'nourish-loop-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
