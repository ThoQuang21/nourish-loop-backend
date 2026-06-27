import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUserId } from '../../../common/decorators/current-user-id.decorator';
import { PreviewProviderMatchDto } from './dto/preview-provider-match.dto';
import { MatchingService } from './matching.service';

@Controller('provider/matching')
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post('preview')
  preview(
    @CurrentUserId() providerId: string,
    @Body() dto: PreviewProviderMatchDto,
  ) {
    return this.matchingService.preview(providerId, dto);
  }
}
