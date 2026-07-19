import { z } from 'zod';

export const PushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export const PushSubscribeInputSchema = z.object({
  endpoint: z.string().url(),
  keys: PushSubscriptionKeysSchema,
});

export type PushSubscribeInput = z.infer<typeof PushSubscribeInputSchema>;

export const PushUnsubscribeInputSchema = z.object({
  endpoint: z.string().url(),
});

export type PushUnsubscribeInput = z.infer<typeof PushUnsubscribeInputSchema>;
