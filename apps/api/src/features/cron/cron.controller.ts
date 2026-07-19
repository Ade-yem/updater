import {
  Controller,
  Post,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { DigestOrchestratorService } from '../digest/digest-orchestrator.service';
import { ENV } from '../../config/env';

@Controller('digest')
export class CronController {
  constructor(private readonly orchestrator: DigestOrchestratorService) {}

  @Post('update')
  async triggerHourlyUpdate(@Headers('x-cron-secret') cronSecret: string) {
    // Basic guard verification to ensure only your authorized external task manager triggers this
    console.log("Incoming => ", cronSecret);
    console.log("Comp: ", ENV.CRON_SECRET_KEY);
    if (cronSecret !== ENV.CRON_SECRET_KEY) {
      throw new UnauthorizedException('Invalid cron security credentials.');
    }

    // Fire-and-forget or await depending on your server configuration timeout limits
    this.orchestrator.processCurrentHourWindow();

    return { status: 'processing_initiated' };
  }
}
