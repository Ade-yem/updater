import { Injectable, Logger } from '@nestjs/common';
import { google} from 'googleapis';
import * as cheerio from 'cheerio';
import { GoogleAuthRepository } from './google.service';
import { ENV } from '../../config/env';
import { withRetry } from '../../common/utils/retry';

export interface ExtractedLink {
  url: string;
  anchorText: string;
}

export interface ExtractedEmail {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  body: string;
  urls: ExtractedLink[];
}

@Injectable()
export class GmailService {
  private readonly logger = new Logger(GmailService.name);

  // Mailing-list infra, asset hosts, analytics, social platforms, unsubscribe/preferences links.
  private readonly JUNK_HOST_RE =
    /(list-manage|mailchimp|sendgrid|sparkpost|mcusercontent|beehiiv\.com\/cdn|s2\/favicons|doubleclick|googletagmanager|google-analytics|facebook\.com|twitter\.com|x\.com|instagram\.com|linkedin\.com|youtube\.com|\.gif|\.png|\.jpe?g|\.svg|\.webp|unsubscribe|opt-out|optout|preferences|manage-subscription|mailto:)/i;

  // Open/click-tracking beacon path shapes. Deliberately narrow: many ESPs (SmartBrief,
  // Bloomberg, Google News, TechCrunch) route every real article link through a per-provider
  // redirect/tracking wrapper, so a broad redirect-path blocklist would kill legitimate
  // content along with junk. Anchor-text quality (length + not-generic) does the real
  // filtering work below; this only catches unambiguous non-content beacons.
  private readonly TRACKER_PATH_RE = /(\/open\.aspx|\/track\/open|beacon\.gif|pixel\.gif)/i;

  // Boilerplate CTA text that carries no headline value even when long enough to pass the length check.
  private readonly GENERIC_ANCHOR_TEXT_RE =
    /^(click here|read more|view in browser|view online|learn more|here|link|this link|unsubscribe|manage preferences|update preferences|view web version)$/i;

  private readonly MIN_ANCHOR_TEXT_LENGTH = 12;

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

    // Extract real article/headline links straight from the HTML anchor tags
    const rawHtml = this.extractRawHtml(payload.payload);
    const urls = this.extractLinksFromHtml(rawHtml);

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
   * Traverses multipart sub-payload branches collecting RAW (unstripped) HTML,
   * since real hyperlinks live in <a href> attributes that get destroyed by
   * extractBodyText's tag-stripping fallback.
   */
  private extractRawHtml(part: any): string {
    if (!part) return '';

    if (part.mimeType === 'text/html' && part.body?.data) {
      return Buffer.from(part.body.data, 'base64').toString('utf8');
    }

    if (part.parts && Array.isArray(part.parts)) {
      return part.parts.map((subPart: any) => this.extractRawHtml(subPart)).join('');
    }

    return '';
  }

  /**
   * Extracts {url, anchorText} pairs from raw HTML <a href> tags, filtering out
   * trackers, unsubscribe/social links, and boilerplate CTAs with no headline value.
   */
  private extractLinksFromHtml(html: string): ExtractedLink[] {
    if (!html) return [];

    const $ = cheerio.load(html);
    const seen = new Set<string>();
    const out: ExtractedLink[] = [];

    $('a[href]').each((_, el) => {
      const href = ($(el).attr('href') || '').trim();
      const anchorText = $(el).text().replace(/\s+/g, ' ').trim();

      if (!/^https?:\/\//i.test(href)) return;
      if (this.JUNK_HOST_RE.test(href)) return;
      if (this.TRACKER_PATH_RE.test(href)) return;
      if (seen.has(href)) return;
      if (anchorText.length < this.MIN_ANCHOR_TEXT_LENGTH) return;
      if (this.GENERIC_ANCHOR_TEXT_RE.test(anchorText)) return;

      seen.add(href);
      out.push({ url: href, anchorText });
    });

    return out;
  }
}
