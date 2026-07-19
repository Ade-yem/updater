import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './features/auth/auth.module';
import { UsersModule } from './features/users/users.module';
import { GoogleModule } from './features/google/google.module';
import { SseModule } from './features/sse/sse.module';
import { DigestModule } from './features/digest/digest.module';
import { CronModule } from './features/cron/cron.module';
import { PushModule } from './features/push/push.module';
import {ConfigModule} from '@nestjs/config'

// Modules
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    GoogleModule,
    SseModule,
    DigestModule,
    CronModule,
    PushModule,
    ConfigModule.forRoot({ isGlobal: true }), PrismaModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
