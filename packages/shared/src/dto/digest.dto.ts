import { z } from 'zod';

export const LinkSummarySchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  keyPoints: z.array(z.string()).optional().default([]),
});

export type LinkSummary = z.infer<typeof LinkSummarySchema>;

export const DigestDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  digestDate: z.date(),
  summaryMarkdown: z.string(),
  linksProcessed: z.array(LinkSummarySchema),
  status: z.enum(['processing', 'completed', 'failed', 'no_emails']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DigestDto = z.infer<typeof DigestDtoSchema>;

export const DigestCreateInputSchema = z.object({
  userId: z.string().uuid().optional(),
});

export type DigestCreateInput = z.infer<typeof DigestCreateInputSchema>;

export const DigestQueryParamsSchema = z.object({
  userId: z.string().uuid(),
  skip: z.coerce.number().int().gte(0).default(0),
  take: z.coerce.number().int().gte(1).lte(100).default(10),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type DigestQueryParams = z.infer<typeof DigestQueryParamsSchema>;
