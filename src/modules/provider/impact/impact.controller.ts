import { Controller, Get } from '@nestjs/common';
import { CurrentUserId } from '../../../common/decorators/current-user-id.decorator';
import { ImpactService } from './impact.service';

@Controller('impact')
export class ImpactController {
  constructor(private readonly impactService: ImpactService) {}

  @Get('summary')
  getSummary(@CurrentUserId() providerId: string) {
    return this.impactService.getSummary(providerId);
  }

  @Get('weekly')
  getWeekly(@CurrentUserId() providerId: string) {
    return this.impactService.getWeekly(providerId);
  }
}
