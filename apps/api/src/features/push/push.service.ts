import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../../prisma/prisma.service';
import { ENV } from '../../config/env';
import { DigestDto, PushSubscribeInput } from '@repo/shared';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    webpush.setVapidDetails(
      ENV.VAPID_SUBJECT,
      ENV.VAPID_PUBLIC_KEY,
      ENV.VAPID_PRIVATE_KEY,
    );
  }

  async saveSubscription(
    userId: string,
    subscription: PushSubscribeInput,
  ): Promise<void> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      update: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });
  }

  async removeSubscription(userId: string, endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { endpoint, userId },
    });
  }

  /**
   * Best-effort: never throws. A failure here must never affect digest
   * status, since it's called after a digest has already been marked completed.
   */
  async sendDigestReadyNotification(
    userId: string,
    digest: DigestDto,
  ): Promise<void> {
    try {
      const subscriptions = await this.prisma.pushSubscription.findMany({
        where: { userId },
      });

      if (subscriptions.length === 0) return;

      const linkCount = digest.linksProcessed.length;
      const payload = JSON.stringify({
        title: 'Your digest is ready',
        body:
          linkCount > 0
            ? `Today's summary includes ${linkCount} link${linkCount === 1 ? '' : 's'}.`
            : "Today's summary is ready to read.",
        url: '/digest/today',
        digestId: digest.id,
      });

      await Promise.allSettled(
        subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload,
            );
          } catch (error) {
            const statusCode =
              error instanceof webpush.WebPushError
                ? error.statusCode
                : undefined;

            if (statusCode === 404 || statusCode === 410) {
              this.logger.log(
                `Push subscription expired for user ${userId}, removing`,
              );
              await this.prisma.pushSubscription
                .delete({ where: { endpoint: sub.endpoint } })
                .catch(() => undefined);
              return;
            }

            this.logger.warn(
              `Failed to send push notification for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }),
      );
    } catch (error) {
      this.logger.error(
        `sendDigestReadyNotification failed for user ${userId}:`,
        error,
      );
    }
  }
}
