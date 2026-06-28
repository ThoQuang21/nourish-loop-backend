import { Global, Module } from '@nestjs/common';
import { ZaloController } from './zalo.controller';
import { ZaloService } from './zalo.service';

/** Global để mọi service (vd matching) có thể inject ZaloService. */
@Global()
@Module({
  controllers: [ZaloController],
  providers: [ZaloService],
  exports: [ZaloService],
})
export class ZaloModule {}
