import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { encryptToken, decryptToken } from '../../common/utils/crypto';

@Injectable()
export class GoogleAuthRepository {
  constructor(private prisma: PrismaService) {}
  public scopes = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/gmail.readonly',
  ];
  async saveGoogleCredentials(
    userId: string,
    googleId: string,
    rawRefreshToken: string,
    scopes: string[],
  ) {
    // Encrypt before hitting the database
    const secureToken = encryptToken(rawRefreshToken);

    return this.prisma.googleAuth.upsert({
      where: { userId },
      update: { refreshToken: secureToken, scopes },
      create: { userId, googleId, refreshToken: secureToken, scopes },
    });
  }

  async getDecryptedRefreshToken(userId: string): Promise<string> {
    const authRecord = await this.prisma.googleAuth.findUnique({
      where: { userId },
    });

    if (!authRecord) throw new Error('No credentials found for user.');

    // Decrypt on retrieval for your Cron/Gmail services
    return decryptToken(authRecord.refreshToken);
  }
}
