import { Test } from '@nestjs/testing';
import { PushService } from './push.service';
import { PrismaService } from '../../prisma/prisma.service';
import * as webpush from 'web-push';
import type { DigestDto } from '@repo/shared';

jest.mock('web-push', () => {
  class WebPushError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.statusCode = statusCode;
    }
  }
  return {
    setVapidDetails: jest.fn(),
    sendNotification: jest.fn(),
    WebPushError,
  };
});

describe('PushService', () => {
  let service: PushService;
  let prisma: {
    pushSubscription: {
      upsert: jest.Mock;
      deleteMany: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      pushSubscription: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [PushService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(PushService);
    jest.clearAllMocks();
  });

  describe('saveSubscription', () => {
    it('upserts by endpoint', async () => {
      await service.saveSubscription('user-1', {
        endpoint: 'https://push.example.com/abc',
        keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
      });

      expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith({
        where: { endpoint: 'https://push.example.com/abc' },
        create: {
          userId: 'user-1',
          endpoint: 'https://push.example.com/abc',
          p256dh: 'p256dh-key',
          auth: 'auth-key',
        },
        update: {
          userId: 'user-1',
          p256dh: 'p256dh-key',
          auth: 'auth-key',
        },
      });
    });
  });

  describe('removeSubscription', () => {
    it('scopes deletion by endpoint and userId', async () => {
      await service.removeSubscription(
        'user-1',
        'https://push.example.com/abc',
      );

      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { endpoint: 'https://push.example.com/abc', userId: 'user-1' },
      });
    });
  });

  describe('sendDigestReadyNotification', () => {
    const digest: DigestDto = {
      id: 'digest-1',
      userId: 'user-1',
      digestDate: new Date(),
      summaryMarkdown: 'summary',
      linksProcessed: [{ url: 'https://a.com', keyPoints: [] }],
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('does nothing when there are no subscriptions', async () => {
      prisma.pushSubscription.findMany.mockResolvedValue([]);

      await service.sendDigestReadyNotification('user-1', digest);

      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('sends a notification per subscription', async () => {
      prisma.pushSubscription.findMany.mockResolvedValue([
        { endpoint: 'ep-1', p256dh: 'p1', auth: 'a1' },
        { endpoint: 'ep-2', p256dh: 'p2', auth: 'a2' },
      ]);
      (webpush.sendNotification as jest.Mock).mockResolvedValue(undefined);

      await service.sendDigestReadyNotification('user-1', digest);

      expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
      expect(webpush.sendNotification).toHaveBeenCalledWith(
        { endpoint: 'ep-1', keys: { p256dh: 'p1', auth: 'a1' } },
        expect.stringContaining('"digestId":"digest-1"'),
      );
    });

    it('removes the subscription on a 410 Gone error', async () => {
      prisma.pushSubscription.findMany.mockResolvedValue([
        { endpoint: 'ep-expired', p256dh: 'p1', auth: 'a1' },
      ]);
      (webpush.sendNotification as jest.Mock).mockRejectedValue(
        new webpush.WebPushError('gone', 410, {}, '', 'ep-expired'),
      );

      await service.sendDigestReadyNotification('user-1', digest);

      expect(prisma.pushSubscription.delete).toHaveBeenCalledWith({
        where: { endpoint: 'ep-expired' },
      });
    });

    it('does not remove the subscription and does not throw on a transient error', async () => {
      prisma.pushSubscription.findMany.mockResolvedValue([
        { endpoint: 'ep-flaky', p256dh: 'p1', auth: 'a1' },
      ]);
      (webpush.sendNotification as jest.Mock).mockRejectedValue(
        new Error('network blip'),
      );

      await expect(
        service.sendDigestReadyNotification('user-1', digest),
      ).resolves.toBeUndefined();

      expect(prisma.pushSubscription.delete).not.toHaveBeenCalled();
    });
  });
});
