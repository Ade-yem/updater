import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SseController } from './sse.controller';
import { SseService } from './sse.service';
import { ENV } from '../../config/env';

@Module({
  imports: [
    JwtModule.register({
      secret: ENV.JWT_SECRET,
    }),
  ],
  controllers: [SseController],
  providers: [SseService],
  exports: [SseService],
})
export class SseModule {}
