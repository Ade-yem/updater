import { Injectable, Logger } from '@nestjs/common';
import { google} from 'googleapis';
import { GoogleAuthRepository } from './google.service';
import { ENV } from '../../config/env';
import { withRetry } from '../../common/utils/retry';

export interface ExtractedEmail {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  body: string;
  urls: string[];
}

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);

  // A standard regular expression to isolate URLs embedded in the email body
  private readonly urlRegex = /https?:\/\/[^\s<>'"]+/g;

  constructor(private readonly googleAuthRepo: GoogleAuthRepository) {}

  /**
   * Main entrypoint called by the Orchestrator to fetch and parse today's emails.
   */
  async fetchTodayEmailsForUser(userId: string): Promise<ExtractedEmail[]> {
    this.logger.log(`Initiating Gmail extraction loop for user: ${userId}`);

    // 1. Fetch and decrypt the user's refresh token using your secure utility repo
    const decryptedRefreshToken =
      await this.googleAuthRepo.getDecryptedRefreshToken(userId);

    // 2. Initialize the Google OAuth2 client with backend environment secrets
    const oauth2Client = new google.auth.OAuth2({
      clientId: ENV.GOOGLE_CLIENT_ID,
      clientSecret: ENV.GOOGLE_CLIENT_SECRET,
      redirectUri: ENV.GOOGLE_REDIRECT_URI,
    });

    oauth2Client.setCredentials({ refresh_token: decryptedRefreshToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // 3. Calculate the UNIX timestamp for the absolute start of today (UTC)
    const startOfTodaySeconds = Math.floor(
      new Date().setHours(0, 0, 0, 0) / 1000,
    );

    try {
      // Query Gmail for messages arriving after midnight today
      const listResponse = await withRetry(() =>
        gmail.users.messages.list({
          userId: 'me',
          q: `after:${startOfTodaySeconds}`,
        }),
      );

      const messages = listResponse.data.messages || [];
      if (messages.length === 0) {
        this.logger.log(`No new emails discovered today for user: ${userId}`);
        return [];
      }

      this.logger.log(
        `Found ${messages.length} raw email messages. Batch fetching details...`,
      );
      const detailedEmails: ExtractedEmail[] = [];

      // 4. Batch fetch content metadata details for each message item
      for (const msg of messages) {
        try {
          const emailDetail = await withRetry(() =>
            gmail.users.messages.get({
              userId: 'me',
              id: msg.id!,
              format: 'full',
            }),
          );

          const parsedEmail = this.parseEmailResponse(
            msg.id!,
            emailDetail.data,
          );
          detailedEmails.push(parsedEmail);
        } catch (msgError) {
          this.logger.error(
            `Failed to pull individual message ID details ${msg.id}:`,
            (msgError as Error).stack,
          );
        }
      }

      return detailedEmails;
    } catch (error) {
      this.logger.error(
        `Failed to fetch email collection from Gmail API for user ${userId}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  /**
   * Helper utility parsing raw Gmail payload metadata blocks down into structured objects.
   */
  private parseEmailResponse(id: string, payload: any): ExtractedEmail {
    const headers = payload.payload?.headers || [];
    const subject =
      headers.find((h: any) => h.name?.toLowerCase() === 'subject')?.value ||
      '(No Subject)';
    const from =
      headers.find((h: any) => h.name?.toLowerCase() === 'from')?.value ||
      '(Unknown Sender)';
    const snippet = payload.snippet || '';

    // Extract textual body content from multipart structures
    const rawBody = this.extractBodyText(payload.payload);

    // Parse any actionable hyperlinks found in the body text string
    const urls = this.extractUrls(rawBody);

    return {
      id,
      subject,
      from,
      snippet,
      body: rawBody,
      urls,
    };
  }

  /**
   * Traverses multipart sub-payload branches recursively to grab core plain text.
   */
  private extractBodyText(part: any): string {
    if (!part) return '';

    // Scenario A: Plain text block found directly inside this structural node
    if (part.mimeType === 'text/plain' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf8');
    }

    // Scenario B: Fall back to stripping markdown context elements out of HTML strings if text/plain isn't available
    if (part.mimeType === 'text/html' && part.body?.data) {
      const htmlText = Buffer.from(part.body.data, 'base64').toString('utf8');
      return htmlText.replace(/<[^>]*>/g, ' '); // Very basic tag stripping
    }

    // Scenario C: Node contains child subparts, dive down structural array blocks recursively
    if (part.parts && Array.isArray(part.parts)) {
      let combinedText = '';
      for (const subPart of part.parts) {
        combinedText += this.extractBodyText(subPart) + ' ';
      }
      return combinedText.trim();
    }

    return '';
  }

  /**
   * Matches string tokens up against regular expressions to assemble localized arrays of unique target links.
   */
  private extractUrls(text: string): string[] {
    const matches = text.match(this.urlRegex) || [];
    // Filter down to unique matches to avoid scraping duplicate links
    return Array.from(new Set(matches));
  }
}
