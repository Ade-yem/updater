import { Module } from '@nestjs/common';
import { GoogleModule } from '../google/google.module';
import { UsersModule } from '../users/users.module';
import { AgentModule } from '../agent/agent.module';
import { SseModule } from '../sse/sse.module';
import { PushModule } from '../push/push.module';
import { DigestService } from './digest.service';
import { DigestOrchestratorService } from './digest-orchestrator.service';
import { DigestController } from './digest.controller';

@Module({
  imports: [GoogleModule, UsersModule, AgentModule, SseModule, PushModule],
  providers: [DigestService, DigestOrchestratorService],
  controllers: [DigestController],
  exports: [DigestOrchestratorService, DigestService],
})
export class DigestModule {}
