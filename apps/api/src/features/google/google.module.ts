import { Module } from '@nestjs/common';
import { GoogleAuthRepository } from './google.service';
import { GmailService } from './gmail.service';

@Module({
  providers: [GoogleAuthRepository, GmailService],
  exports: [GoogleAuthRepository, GmailService],
})
export class GoogleModule {}
