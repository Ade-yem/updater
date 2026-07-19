import { Module } from '@nestjs/common';
import { CronController } from './cron.controller';
import { DigestModule } from '../digest/digest.module';

@Module({
  imports: [DigestModule],
  controllers: [CronController],
})
export class CronModule {}
