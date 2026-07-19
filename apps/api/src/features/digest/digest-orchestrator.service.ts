import { Injectable, Logger } from '@nestjs/common';
import { DigestService } from './digest.service';
import { UserService } from '../users/users.service';
import { GmailService } from '../google/gmail.service';
import { AgentService } from '../agent/agent.service';
import { ScraperService } from '../agent/scraper.service';
import { SseService } from '../sse/sse.service';
import { PushService } from '../push/push.service';
import { withRetry } from '../../common/utils/retry';
import { mapWithConcurrency } from '../../common/utils/concurrency';

const MAX_LINKS_PER_DIGEST = 15;
const SCRAPE_CONCURRENCY = 3;
const PROCESSING_TIMEOUT_MINS = 10;

@Injectable()
export class DigestOrchestratorService {
  private readonly logger = new Logger(DigestOrchestratorService.name);

  constructor(
    private digestService: DigestService,
    private userService: UserService,
    private gmailService: GmailService,
    private agentService: AgentService,
    private scraperService: ScraperService,
    private sseService: SseService,
    private pushService: PushService,
  ) {}

  async processCurrentHourWindow(): Promise<void> {
    const hour = new Date().getUTCHours();
    this.logger.log(`Processing digest hour window: UTC ${hour}`);

    try {
      const users = await this.userService.findUsersDueForDigest(hour);
      this.logger.log(`Found ${users.length} users due for digest`);

      await mapWithConcurrency(users, 5, async (user) => {
        try {
          await this.processUserDigest(user.id);
        } catch (error) {
          this.logger.error(
            `Error processing digest for user ${user.id}:`,
            error,
          );
        }
      });
    } catch (error) {
      this.logger.error('Error in processCurrentHourWindow:', error);
    }
  }

  async processUserDigest(userId: string): Promise<void> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    this.logger.log(`Starting digest processing for user ${userId}`);

    try {
      const existing = await this.digestService.findToday(userId);

      if (existing?.status === 'completed') {
        this.logger.log(
          `Digest already completed for user ${userId}, skipping`,
        );
        return;
      }

      if (existing?.status === 'processing') {
        const age = Date.now() - existing.updatedAt.getTime();
        if (age < PROCESSING_TIMEOUT_MINS * 60 * 1000) {
          this.logger.log(
            `Digest still processing for user ${userId}, skipping (age: ${Math.round(age / 1000)}s)`,
          );
          return;
        }
        this.logger.log(
          `Digest stale (${Math.round(age / 60000)}m), reprocessing for user ${userId}`,
        );
      }

      await this.digestService.upsertForUser(userId, today, {
        status: 'processing',
      });
      this.sseService.broadcast(userId, {
        type: 'digest.started',
        userId,
        timestamp: new Date().toISOString(),
      });

      const emails = await withRetry(() =>
        this.gmailService.fetchTodayEmailsForUser(userId),
      );

      if (emails.length === 0) {
        this.logger.log(`No emails for user ${userId}`);
        await this.digestService.upsertForUser(userId, today, {
          status: 'no_emails',
          summaryMarkdown: 'No emails received today.',
        });
        this.sseService.broadcast(userId, {
          type: 'digest.no_emails',
          userId,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      this.logger.log(`Fetched ${emails.length} emails for user ${userId}`);

      const urlSet = new Set<string>();
      emails.forEach((email) => {
        email.urls.forEach((url) => {
          if (urlSet.size < MAX_LINKS_PER_DIGEST) {
            urlSet.add(url);
          }
        });
      });

      const urls = Array.from(urlSet);
      this.logger.log(`Scraping ${urls.length} unique URLs`);

      const scrapeResults = await this.scraperService.scrapeBatch(
        urls,
        SCRAPE_CONCURRENCY,
      );

      const linkSummaries: any[] = [];
      for (const result of scrapeResults) {
        if (!result.page) {
          this.logger.warn(`Failed to scrape ${result.url}: ${result.error}`);
          continue;
        }

        try {
          const summary = await withRetry(() =>
            this.agentService.extractKeyPoints(result.url, result.page!),
          );
          linkSummaries.push(summary);
        } catch (error) {
          this.logger.warn(
            `Failed to extract key points from ${result.url}:`,
            error,
          );
        }
      }

      this.logger.log(`Extracted ${linkSummaries.length} link summaries`);

      const summary = await withRetry(() =>
        this.agentService.summarizeEmails(emails, linkSummaries),
      );

      const digest = await this.digestService.upsertForUser(userId, today, {
        status: 'completed',
        summaryMarkdown: summary,
        linksProcessed: linkSummaries,
      });

      this.logger.log(`Digest completed for user ${userId}`);
      this.sseService.broadcast(userId, {
        type: 'digest.completed',
        userId,
        timestamp: new Date().toISOString(),
        digest,
      });

      // Never let a push failure fall through to the outer catch below —
      // that would incorrectly overwrite this already-completed digest's
      // status back to 'failed'. sendDigestReadyNotification is itself
      // best-effort/non-throwing, but this is a deliberate second guard.
      try {
        await this.pushService.sendDigestReadyNotification(userId, digest);
      } catch (error) {
        this.logger.warn(
          `Failed to send push notification for user ${userId}:`,
          error,
        );
      }
    } catch (error) {
      this.logger.error(`Digest failed for user ${userId}:`, error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      try {
        await this.digestService.upsertForUser(userId, today, {
          status: 'failed',
          summaryMarkdown: `Digest generation failed: ${errorMessage}`,
        });
      } catch (persistError) {
        this.logger.error(
          `Failed to persist error status for user ${userId}:`,
          persistError,
        );
      }

      this.sseService.broadcast(userId, {
        type: 'digest.failed',
        userId,
        timestamp: new Date().toISOString(),
        error: errorMessage,
      });
    }
  }
}
