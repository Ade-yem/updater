import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { withRetry } from '../../common/utils/retry';
import { mapWithConcurrency } from '../../common/utils/concurrency';

const SCRAPE_TIMEOUT_MS = 10_000;
const SCRAPE_MAX_BYTES = 500_000;
const SCRAPE_CONCURRENCY = 3;

export interface ScrapedPage {
  url: string;
  title: string;
  text: string;
  truncated: boolean;
}

export interface ScrapeResult {
  url: string;
  page: ScrapedPage | null;
  error?: string;
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  async scrapeUrl(url: string): Promise<ScrapedPage> {
    return withRetry(async () => {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(
        () => controller.abort(),
        SCRAPE_TIMEOUT_MS,
      );

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.startsWith('text/html')) {
          throw new Error(`Not HTML: ${contentType}`);
        }

        let text = await response.text();
        let truncated = false;

        if (text.length > SCRAPE_MAX_BYTES) {
          text = text.substring(0, SCRAPE_MAX_BYTES);
          truncated = true;
        }

        const $ = cheerio.load(text);
        $('script, style, noscript').remove();

        const title = $('title').text() || $('h1').first().text() || '';
        const bodyText = $('body').text();
        const cleanText = bodyText
          .split(/\s+/)
          .join(' ')
          .trim()
          .substring(0, 10_000);

        return {
          url,
          title: title.substring(0, 200),
          text: cleanText,
          truncated,
        };
      } finally {
        clearTimeout(timeoutHandle);
      }
    });
  }

  async scrapeBatch(
    urls: string[],
    concurrency = SCRAPE_CONCURRENCY,
  ): Promise<ScrapeResult[]> {
    return mapWithConcurrency(urls, concurrency, async (url) => {
      try {
        const page = await this.scrapeUrl(url);
        return { url, page };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to scrape ${url}: ${errorMsg}`);
        return { url, page: null, error: errorMsg };
      }
    });
  }
}
