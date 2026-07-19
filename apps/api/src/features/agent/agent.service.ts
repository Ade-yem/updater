import { Injectable, Logger } from '@nestjs/common';
import { openai } from '../../common/openai-client';
import { ENV } from '../../config/env';
import { ExtractedEmail } from '../google/gmail.service';
import { LinkSummary, LinkSummarySchema } from '@repo/shared';
import { withRetry } from '../../common/utils/retry';

export interface ScrapedPage {
  url: string;
  title: string;
  text: string;
  truncated: boolean;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  async extractKeyPoints(url: string, page: ScrapedPage): Promise<LinkSummary> {
    return withRetry(async () => {
      const response = await openai.chat.completions.create({
        model: ENV.DEEPSEEK_MODEL,
        messages: [
          {
            role: 'user',
            content: `Extract key points from this webpage content. Return a JSON object with url, title (optional), and keyPoints (array of short strings). URL: ${url}\n\nContent:\n${page.text}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in LLM response');
      }

      const parsed = JSON.parse(content);
      const result = LinkSummarySchema.safeParse({
        url,
        ...parsed,
      });

      if (!result.success) {
        this.logger.warn(
          `Failed to parse link summary for ${url}:`,
          result.error,
        );
        throw new Error(`Invalid link summary format: ${result.error}`);
      }

      return result.data;
    });
  }

  async summarizeEmails(
    emails: ExtractedEmail[],
    linkSummaries: LinkSummary[],
  ): Promise<string> {
    return withRetry(async () => {
      const emailsText = emails
        .map((e) => `From: ${e.from}\nSubject: ${e.subject}\n${e.body}`)
        .join('\n\n---\n\n');

      const linksText =
        linkSummaries.length > 0
          ? `\n\nKey points from links:\n${linkSummaries.map((l) => `- ${l.url}: ${l.keyPoints?.join('; ') || 'No points'}`).join('\n')}`
          : '';

      const response = await openai.chat.completions.create({
        model: ENV.DEEPSEEK_MODEL,
        messages: [
          {
            role: 'user',
            content: `Summarize these emails from today in markdown format. Highlight key decisions, action items, and important information.${linksText}\n\nEmails:\n${emailsText}`,
          },
        ],
        temperature: 0.5,
      });

      const summary = response.choices[0]?.message?.content;
      if (!summary) {
        throw new Error('No summary content from LLM');
      }

      return summary;
    });
  }
}
