import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { ScraperService } from './scraper.service';

@Module({
  providers: [AgentService, ScraperService],
  exports: [AgentService, ScraperService],
})
export class AgentModule {}
